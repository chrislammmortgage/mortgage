import { config, log } from "../config.js";
import * as sf from "../salesforce.js";
import * as pb from "../phoneburner.js";
import * as mailer from "../email.js";
import { assigneeChecklistEmail } from "../templates/preapproval.js";

/**
 * Wednesday Pre-Approval kickoff.
 *  - Pull 10 most recent PAs for Chris → load into PhoneBurner.
 *  - For each assignee (Zak/Jennifer/Toni), pull their 10 most recent PAs →
 *    email them a checklist at 8 AM.
 *  - In v0.5 (ROUTE_TO_OWNER_ONLY=true) every assignee checklist is delivered
 *    to Chris first with a banner identifying the original assignee.
 *  - Schedule EOD enforcement (run separately at 5 PM).
 *
 * @param {object} deps Optional dep injection for testing.
 */
export async function runWednesdayPreApprovalKickoff(deps = {}) {
  const { findRecentPreApprovals = sf.findRecentPreApprovals,
          createDialSession = pb.createDialSession,
          sendOrDraft = mailer.sendOrDraft } = deps;
  log.info("Wednesday Pre-Approval — kickoff");

  // Chris's dial set
  const chrisPas = await findRecentPreApprovals({ limit: 10, assignedTo: config.owner.email });
  const F = config.sf.fields;
  const chrisContacts = chrisPas.map(c => ({
    firstName: c.FirstName || c.Name?.split(" ")[0],
    lastName: c.LastName || c.Name?.split(" ").slice(1).join(" "),
    phone: c.MobilePhone || c.Phone,
    email: c.Email,
    custom: {
      sf_id: c.Id,
      theme: "WED_PREAPPROVAL",
      active_agent: c[F.activeRealtor]?.Name,
      active_agent_phone: c[F.activeRealtor]?.Phone,
      last_touch: c[F.lastTouch],
    },
  }));

  const session = await createDialSession({
    name: `WED Pre-Approval ${new Date().toISOString().slice(0, 10)} (${chrisContacts.length})`,
    contacts: chrisContacts,
    folderId: config.pb.folders.wed,
  });
  log.info({ session: session.dialsession_id, count: chrisContacts.length }, "Chris dial set built");

  // Assignee checklists
  const assigneeResults = [];
  for (const email of config.assignees) {
    const pas = await findRecentPreApprovals({ limit: 10, assignedTo: email });
    if (pas.length === 0) {
      log.info({ assignee: email }, "no PAs assigned — skipping");
      continue;
    }
    const rows = pas.map(c => ({
      contactName: c.Name,
      phone: c.MobilePhone || c.Phone,
      email: c.Email,
      agentName: c[F.activeRealtor]?.Name,
      agentPhone: c[F.activeRealtor]?.Phone,
      lastTouch: c[F.lastTouch],
      sfId: c.Id,
    }));
    const msg = assigneeChecklistEmail({ assignee: email, rows });
    const to = config.routeToOwnerOnly ? config.owner.email : email;
    const subject = config.routeToOwnerOnly
      ? `[FOR ${email}] ${msg.subject}` : msg.subject;
    const html = config.routeToOwnerOnly
      ? `<div style="background:#fffde7;padding:8px 12px;border-left:4px solid #f9a825;font-family:system-ui">
          <strong>v0.5 routing:</strong> this checklist is for <strong>${email}</strong>.
          Forward when you're ready.
        </div>${msg.html}` : msg.html;
    const result = await sendOrDraft({ to, subject, html, draft: true });
    assigneeResults.push({ assignee: email, routedTo: to, count: rows.length, result, rows });
    log.info({ assignee: email, routedTo: to, count: rows.length }, "assignee checklist drafted");
  }

  return { session, chrisCount: chrisContacts.length, assigneeResults };
}

/**
 * EOD enforcement (runs 5 PM Wednesday).
 *  For every PA in today's run, check if last-touch was updated today.
 *  If not → create a Salesforce Task on the assignee's queue.
 */
export async function runEodEnforcement({ checklistRows }, deps = {}) {
  const { checkLastTouchedToday = sf.checkLastTouchedToday,
          createTask = sf.createTask } = deps;
  log.info({ count: checklistRows.length }, "EOD enforcement — checking last-touch");
  const missed = [];
  for (const row of checklistRows) {
    const touched = await checkLastTouchedToday(row.sfId);
    if (!touched) {
      const owner = config.routeToOwnerOnly ? config.owner.email : row.ownerEmail;
      await createTask({
        whoId: row.sfId,
        subject: `Pre-Approval touch missed: ${row.contactName}`,
        description: `Today's check-in didn't land in Salesforce. Call ${row.phone || "—"} and update last-touch.`,
        dueDate: new Date().toISOString().slice(0, 10),
        ownerEmail: owner,
      });
      missed.push(row);
    }
  }
  log.info({ missed: missed.length }, "EOD enforcement complete");
  return { missed };
}
