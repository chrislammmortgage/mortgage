import { config, log } from "../config.js";
import {
  findRecentPreApprovals,
  checkLastTouchedToday,
  createTask,
} from "../salesforce.js";
import { createDialSession } from "../phoneburner.js";
import { sendOrDraft } from "../email.js";
import { assigneeChecklistEmail } from "../templates/preapproval.js";

/**
 * Wednesday Pre-Approval kickoff.
 *  - Pull 10 most recent PAs for Chris → load into PhoneBurner.
 *  - For each assignee (Zak/Jennifer/Toni), pull their 10 most recent PAs →
 *    email them a checklist at 8 AM.
 *  - Schedule EOD enforcement (run separately at 5 PM).
 */
export async function runWednesdayPreApprovalKickoff() {
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
    const result = await sendOrDraft({
      to: email, subject: msg.subject, html: msg.html, draft: true,
    });
    assigneeResults.push({ assignee: email, count: rows.length, result, rows });
    log.info({ assignee: email, count: rows.length }, "assignee checklist drafted");
  }

  return { session, chrisCount: chrisContacts.length, assigneeResults };
}

/**
 * EOD enforcement (runs 5 PM Wednesday).
 *  For every PA in today's run, check if last-touch was updated today.
 *  If not → create a Salesforce Task on the assignee's queue.
 */
export async function runEodEnforcement({ checklistRows }) {
  log.info({ count: checklistRows.length }, "EOD enforcement — checking last-touch");
  const missed = [];
  for (const row of checklistRows) {
    const touched = await checkLastTouchedToday(row.sfId);
    if (!touched) {
      await createTask({
        whoId: row.sfId,
        subject: `Pre-Approval touch missed: ${row.contactName}`,
        description: `Today's check-in didn't land in Salesforce. Call ${row.phone || "—"} and update last-touch.`,
        dueDate: new Date().toISOString().slice(0, 10),
        ownerEmail: row.ownerEmail,
      });
      missed.push(row);
    }
  }
  log.info({ missed: missed.length }, "EOD enforcement complete");
  return { missed };
}
