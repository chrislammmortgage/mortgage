import pLimit from "p-limit";
import { config, log } from "../config.js";
import {
  findRealtorsWithReferralsLast12Mo,
  activeBusinessWithRealtor,
  writeRealtorScoring,
} from "../salesforce.js";
import { enrichRealtorPublicProduction, verifyPhone, verifyEmail } from "../enrichment.js";
import { createDialSession } from "../phoneburner.js";

const TOP_N = 10;
const POOL_N = 30;

/**
 * Build Monday's Power Hour list:
 *  1. Pull realtors who referred in the last 12 months.
 *  2. Enrich each with public production data + phone/email verification.
 *  3. Roll up active business with us (leads, PAs, deals).
 *  4. Score: Top 10 = anyone with active live files this week.
 *           Pool 20 = rotation; we touch ~20 of 30 every 2-4 weeks.
 *  5. Build a PhoneBurner dial session of 30 (top 10 + a 20-rotation slice).
 *  6. Write scoring back to Salesforce.
 */
export async function buildMondayRealtorList({ rotationWeek = weekOfYear() } = {}) {
  log.info("Monday Power Hour — building realtor list");

  const { strategy, records } = await findRealtorsWithReferralsLast12Mo();
  log.info({ strategy, raw: records.length }, "realtors pulled from SF");

  const limit = pLimit(4);
  const scored = await Promise.all(records.map(r => limit(async () => {
    const [biz, prod, phoneOk, emailOk] = await Promise.all([
      activeBusinessWithRealtor(r.Id).catch(() => ({ leads: 0, preapprovals: 0, deals: 0 })),
      enrichRealtorPublicProduction({
        name: r.Name,
        city: r.MailingCity,
        state: r.MailingState,
      }),
      verifyPhone(r.MobilePhone || r.Phone),
      verifyEmail(r.Email),
    ]);

    const live = (biz.leads || 0) + (biz.preapprovals || 0) + (biz.deals || 0);
    const captureRate = prod.deals_12mo
      ? +(((biz.deals || 0) + (biz.preapprovals || 0)) / prod.deals_12mo).toFixed(2)
      : null;
    const pool = live > 0 ? "TOP10" : "POOL20";

    return {
      sfId: r.Id,
      name: r.Name,
      firstName: r.FirstName,
      lastName: r.LastName,
      phone: phoneOk.e164 || r.MobilePhone || r.Phone,
      phoneValid: phoneOk.valid,
      phoneType: phoneOk.type,
      email: emailOk.valid ? r.Email : null,
      emailValid: emailOk.valid,
      stats: biz,
      production: prod,
      captureRate,
      pool,
      score: liveScore(live, prod, captureRate),
    };
  })));

  // Top 10 = anyone with live business, sorted by score desc.
  const top10 = scored.filter(s => s.pool === "TOP10")
    .sort((a, b) => b.score - a.score).slice(0, TOP_N);

  // Pool 20 = rotation. We cycle so any given realtor hits every 2 weeks.
  const poolOnly = scored.filter(s => s.pool === "POOL20")
    .sort((a, b) => b.score - a.score);
  const offset = (rotationWeek % 2) * (POOL_N - TOP_N);
  const rotation = poolOnly.slice(offset, offset + (POOL_N - TOP_N));

  const finalList = [...top10, ...rotation].filter(r => r.phoneValid);
  log.info({ top10: top10.length, rotation: rotation.length, final: finalList.length }, "list assembled");

  // Write scoring back
  await Promise.all(finalList.map(r =>
    writeRealtorScoring(r.sfId, {
      volume12mo: r.production.volume_12mo,
      captureRate: r.captureRate,
      pool: r.pool,
    })
  ));

  // Build PhoneBurner dial session
  const contacts = finalList.map(r => ({
    firstName: r.firstName || r.name?.split(" ")[0],
    lastName: r.lastName || r.name?.split(" ").slice(1).join(" "),
    phone: r.phone,
    email: r.email,
    custom: {
      sf_id: r.sfId,
      theme: "MON_REALTOR",
      live_leads: r.stats.leads,
      live_preapprovals: r.stats.preapprovals,
      live_deals: r.stats.deals,
      capture_rate: r.captureRate,
      their_volume_12mo: r.production.volume_12mo,
      pool: r.pool,
    },
  }));

  const session = await createDialSession({
    name: `MON Power Hour ${new Date().toISOString().slice(0, 10)} (${contacts.length})`,
    contacts,
    folderId: config.pb.folders.mon,
  });

  return { strategy, finalList, session };
}

function liveScore(live, prod, capture) {
  const liveWeight = live * 50;
  const volumeWeight = (prod.deals_12mo || 0) * 1;
  const captureBoost = capture ? (1 - capture) * 30 : 0; // grow capture where it's low
  return liveWeight + volumeWeight + captureBoost;
}

function weekOfYear(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d - start) / (7 * 86400e3));
}
