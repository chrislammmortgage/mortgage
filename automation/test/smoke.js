#!/usr/bin/env node
/**
 * Smoke test — runs both kickoffs end-to-end with stubbed external services.
 * Surfaces logic + template + routing bugs without needing real creds.
 *
 *   node automation/test/smoke.js
 */
import assert from "node:assert/strict";

// MUST set env BEFORE any module that reads it (config.js loads at import-time)
process.env.DRY_RUN = "true";
process.env.ROUTE_TO_OWNER_ONLY = "true";
process.env.OWNER_EMAIL = "chris@chrislamm.example";
process.env.ASSIGNEE_EMAILS = "zak@chrislamm.example,jennifer@chrislamm.example,toni@chrislamm.example";
process.env.LOG_LEVEL = "warn";
process.env.NODE_ENV = "test";

const { runWednesdayPreApprovalKickoff, runEodEnforcement } =
  await import("../themedays/wednesday-preapprovals.js");
const { buildMondayRealtorList } = await import("../themedays/monday-realtors.js");
const { handleDisposition } = await import("../webhooks/disposition.js");

// ─────────── Fake Salesforce records ───────────
const fakePreApprovals = (assignedTo) => [
  {
    Id: `003fake${assignedTo}1`, Name: "Maria Gutierrez", FirstName: "Maria", LastName: "Gutierrez",
    Phone: "+15305551001", MobilePhone: "+15305551001", Email: "maria@example.com",
    Last_Touch__c: "2026-05-05 — VM left",
    Active_Realtor__c: { Name: "Jane Smith", Phone: "+15305552002" },
    Loan_Officer__c: { Email: assignedTo },
  },
  {
    Id: `003fake${assignedTo}2`, Name: "John Doe", FirstName: "John", LastName: "Doe",
    Phone: "+15305551003", MobilePhone: "+15305551003", Email: "john@example.com",
    Last_Touch__c: "2026-04-28 — Connected, scenario sent",
    Active_Realtor__c: { Name: "Bob Jones", Phone: "+15305552003" },
    Loan_Officer__c: { Email: assignedTo },
  },
];

const fakeRealtors = [
  { Id: "003rtr1", Name: "Jane Smith", FirstName: "Jane", LastName: "Smith",
    MobilePhone: "5305552002", Email: "jane@example.com",
    MailingCity: "Redding", MailingState: "CA", Group__c: "Top Realtor" },
  { Id: "003rtr2", Name: "Bob Jones", FirstName: "Bob", LastName: "Jones",
    MobilePhone: "5305552003", Email: "bob@example.com",
    MailingCity: "Redding", MailingState: "CA", Group__c: "Realtor" },
  { Id: "003rtr3", Name: "Susan Lee", FirstName: "Susan", LastName: "Lee",
    MobilePhone: "5305552004", Email: "susan@example.com",
    MailingCity: "Anderson", MailingState: "CA", Group__c: "Realtor" },
];

const sfDeps = {
  findRecentPreApprovals: async ({ limit, assignedTo }) =>
    fakePreApprovals(assignedTo || "chris@chrislamm.example").slice(0, limit),
  findRealtorsWithReferralsLast12Mo: async () =>
    ({ strategy: "Contact+Group=Realtor", records: fakeRealtors }),
  activeBusinessWithRealtor: async (id) =>
    id === "003rtr1" ? { leads: 1, preapprovals: 1, deals: 0 } : { leads: 0, preapprovals: 0, deals: 0 },
  writeRealtorScoring: async () => ({ dryRun: true }),
  checkLastTouchedToday: async (id) => id.endsWith("1"),
  createTask: async (t) => ({ id: "00Tfake", input: t }),
  updateLastTouch: async (id, note) => ({ id, note, mocked: true }),
  createNote: async (parentId, title, body) => ({ parentId, title, mocked: true }),
};

const enrDeps = {
  enrichRealtorPublicProduction: async ({ name }) => ({
    source: "https://realtor.com/agent/" + name.toLowerCase().replace(/ /g, "-"),
    deals_12mo: name === "Jane Smith" ? 28 : 12,
    volume_12mo: name === "Jane Smith" ? 18500000 : 6200000,
    listings_active: 4, brokerage: "Coldwell Banker",
  }),
  verifyPhone: async (p) => ({ valid: !!p, type: "mobile", e164: p?.startsWith("+") ? p : `+1${p}` }),
  verifyEmail: async (e) => ({ valid: !!e && e.includes("@"), result: "valid" }),
};

const pbDeps = {
  createDialSession: async ({ name, contacts }) =>
    ({ dialsession_id: `pb-${Date.now()}`, contact_ids: contacts.map((_, i) => `pbc${i}`) }),
};

const capturedEmails = [];
const mailerDeps = {
  sendOrDraft: async ({ to, subject, html, draft }) => {
    capturedEmails.push({ to, subject, htmlLen: html.length, draft });
    return { draftId: `dr-${capturedEmails.length}`, webLink: "https://outlook/mock" };
  },
};

// ─────────── Run tests ───────────
const results = [];
async function report(label, fn) {
  try {
    const out = await fn();
    console.log(`✓ ${label}`);
    results.push({ label, ok: true, out });
    return out;
  } catch (err) {
    console.error(`✗ ${label}: ${err.message}`);
    if (process.env.VERBOSE) console.error(err.stack);
    results.push({ label, ok: false, err });
  }
}

await report("Wed PA kickoff — end to end", async () => {
  capturedEmails.length = 0;
  const r = await runWednesdayPreApprovalKickoff({ ...sfDeps, ...pbDeps, ...mailerDeps });
  assert.equal(r.chrisCount, 2, "expected 2 Chris PAs");
  assert.ok(r.session?.dialsession_id, "no dial session id");
  assert.equal(r.assigneeResults.length, 3, `expected 3 assignees, got ${r.assigneeResults.length}`);
  for (const a of r.assigneeResults) {
    assert.equal(a.routedTo, "chris@chrislamm.example", `wrong routing for ${a.assignee}`);
  }
  assert.equal(capturedEmails.length, 3, `expected 3 drafts, got ${capturedEmails.length}`);
  assert.ok(capturedEmails[0].subject.startsWith("[FOR "), "missing routing banner");
  return { drafts: capturedEmails.length, dial: r.session.dialsession_id };
});

await report("EOD enforcement — missed→Task", async () => {
  const rows = [
    { sfId: "003faketouched1", contactName: "Maria Gutierrez", phone: "+15305551001",
      ownerEmail: "zak@chrislamm.example" },
    { sfId: "003fakemissed2", contactName: "John Doe", phone: "+15305551003",
      ownerEmail: "zak@chrislamm.example" },
  ];
  const r = await runEodEnforcement({ checklistRows: rows }, sfDeps);
  assert.equal(r.missed.length, 1, `expected 1 missed, got ${r.missed.length}`);
  assert.equal(r.missed[0].contactName, "John Doe");
  return { missed: r.missed.length };
});

await report("Monday realtor list — end to end", async () => {
  const r = await buildMondayRealtorList({ rotationWeek: 0 }, { ...sfDeps, ...enrDeps, ...pbDeps });
  assert.equal(r.strategy, "Contact+Group=Realtor");
  assert.ok(r.finalList.length > 0, "no realtors in final list");
  const top10 = r.finalList.filter(x => x.pool === "TOP10");
  const pool20 = r.finalList.filter(x => x.pool === "POOL20");
  assert.equal(top10.length, 1, `expected Jane Smith in TOP10, got ${top10.length}`);
  assert.ok(pool20.length >= 1, "expected pool rotation");
  const jane = top10[0];
  assert.equal(jane.captureRate, +((1) / 28).toFixed(2));
  return { final: r.finalList.length, top10: top10.length, pool20: pool20.length };
});

await report("Webhook disposition — Connected", async () => {
  const result = await handleDisposition({
    event: "call.completed",
    call_id: "c1",
    contact: { id: "p1", first_name: "Maria", phone: "+15305551001",
               custom_data: { sf_id: "003fake1", theme: "WED_PREAPPROVAL" } },
    disposition: "Connected",
    transcript: "Chris said send the rate scenario for the new property. They're going to tour Saturday.",
    recording_url: "https://pb/r/1",
  }, { ...sfDeps, ...mailerDeps });
  assert.equal(result.ok, true);
  assert.equal(result.action, "connected_logged");
  return { action: result.action };
});

await report("Webhook disposition — VM", async () => {
  capturedEmails.length = 0;
  const result = await handleDisposition({
    event: "call.completed",
    call_id: "c2",
    contact: { id: "p2", first_name: "Bob", phone: "+15305552003",
               email_address: "bob@example.com",
               custom_data: { sf_id: "003rtr2", theme: "MON_REALTOR",
                              live_leads: 0, live_preapprovals: 0, live_deals: 0 } },
    disposition: "VM",
    recording_url: "https://pb/r/2",
  }, { ...sfDeps, ...mailerDeps });
  assert.equal(result.ok, true);
  assert.equal(result.action, "vm_drafted");
  assert.equal(capturedEmails.length, 1, "expected 1 VM email drafted");
  return { action: result.action, emailQueued: capturedEmails[0].subject };
});

// ─────────── Summary ───────────
console.log("\n=== SUMMARY ===");
const passed = results.filter(r => r.ok).length;
const failed = results.length - passed;
console.log(`${passed}/${results.length} passed, ${failed} failed`);
if (failed) process.exit(1);
process.exit(0);
