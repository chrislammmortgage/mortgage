import { log, config } from "../config.js";
import { parseWebhook } from "../phoneburner.js";
import { updateLastTouch, createTask, createNote } from "../salesforce.js";
import { sendOrDraft } from "../email.js";
import { realtorVmSms, realtorVmEmail } from "../templates/realtor-vm.js";
import { preApprovalSms, preApprovalEmail } from "../templates/preapproval.js";

/**
 * PhoneBurner posts here on call completion. Routing:
 *  - Connected → write transcript-derived note to last-touch.
 *  - VM / No Answer → stage value-based SMS + email drafts.
 *  - Bad Number → flag SF and skip future dials.
 *  - Easy-button events (sms.send / email.send) → fire the pre-staged content.
 */
export async function handleDisposition(payload) {
  const ev = parseWebhook(payload);
  log.info({ event: ev.event, dispo: ev.disposition, sfId: ev.sfId }, "disposition received");

  if (!ev.sfId) {
    log.warn({ ev }, "no sf_id in custom_data — cannot route");
    return { ok: false, reason: "no_sf_id" };
  }

  const summary = ev.transcript ? summarizeFromTranscript(ev.transcript) : null;

  switch (normalize(ev.disposition)) {
    case "connected":
    case "talked":
      await updateLastTouch(ev.sfId,
        `Connected (${ev.theme || "call"}) — ${summary?.snippet || "talked"}`);
      if (summary?.followups?.length) {
        for (const f of summary.followups) {
          await createTask({
            whoId: ev.sfId,
            subject: f.subject,
            description: f.description,
            dueDate: f.dueDate || dayPlus(2),
            ownerEmail: config.owner.email,
          });
        }
      }
      await createNote(ev.sfId, `Call — ${new Date().toISOString().slice(0, 10)}`,
        ev.transcript || "No transcript available.");
      return { ok: true, action: "connected_logged" };

    case "vm":
    case "voicemail":
    case "no_answer":
    case "left_message": {
      const tmpl = templateFor(ev.theme);
      const sms = tmpl.sms({ contact: ev.contact, realtor: ev.contact, stats: ev.contact?.custom_data || {} });
      const email = tmpl.email({ contact: ev.contact, realtor: ev.contact, stats: ev.contact?.custom_data || {} });
      // Stage as drafts the operator can approve from the dashboard.
      const draft = await sendOrDraft({
        to: ev.contact.email_address || ev.contact.email,
        subject: email.subject,
        html: email.html,
        draft: true,
      });
      await updateLastTouch(ev.sfId, `VM left (${ev.theme || "call"})`);
      return { ok: true, action: "vm_drafted", smsDraft: sms, emailDraft: draft };
    }

    case "bad_number":
    case "wrong_number":
      await updateLastTouch(ev.sfId, "Bad number — flagged");
      await createTask({
        whoId: ev.sfId,
        subject: "Bad number — needs research",
        description: "Phone returned bad-number. Skip-trace or pull from co-borrower record.",
        dueDate: dayPlus(1),
        ownerEmail: config.owner.email,
      });
      return { ok: true, action: "bad_number_flagged" };

    case "not_interested":
    case "do_not_call":
      await updateLastTouch(ev.sfId, "Not interested / DNC");
      return { ok: true, action: "dnc_logged" };

    default:
      log.warn({ dispo: ev.disposition }, "unhandled disposition — logging only");
      await updateLastTouch(ev.sfId, `Call ended: ${ev.disposition || "unknown"}`);
      return { ok: true, action: "logged" };
  }
}

function templateFor(theme) {
  if (theme === "WED_PREAPPROVAL") {
    return { sms: preApprovalSms, email: preApprovalEmail };
  }
  // default: realtor templates
  return { sms: realtorVmSms, email: realtorVmEmail };
}

function normalize(s) { return (s || "").toLowerCase().replace(/[^a-z]+/g, "_"); }

function dayPlus(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Lightweight rule-based summarizer for v1; swap for Claude API once API key
// is configured. Pulls obvious action items from a transcript.
function summarizeFromTranscript(t) {
  const snippet = t.split(/[.?!]/).slice(0, 2).join(". ").slice(0, 240);
  const followups = [];
  const lower = t.toLowerCase();
  if (/send (the )?(rate|scenario|pre-?approval|letter)/.test(lower)) {
    followups.push({ subject: "Send requested scenario/letter", description: snippet });
  }
  if (/(send|introduce).*agent/.test(lower)) {
    followups.push({ subject: "Agent introduction", description: snippet });
  }
  if (/look(ing)? at|going to see|tour/.test(lower)) {
    followups.push({ subject: "Follow up on property tour", description: snippet });
  }
  if (/refi|refinance|annual review/.test(lower)) {
    followups.push({ subject: "Refi / annual review consult", description: snippet });
  }
  return { snippet, followups };
}
