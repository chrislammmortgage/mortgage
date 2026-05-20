#!/usr/bin/env node
/**
 * Render every template to /tmp/*.html so Chris can preview exactly what
 * tomorrow's drafts will look like before any real send happens.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { assigneeChecklistEmail, preApprovalEmail } from "../templates/preapproval.js";
import { realtorVmEmail } from "../templates/realtor-vm.js";

const OUT = "/tmp/themeday-previews";
await fs.mkdir(OUT, { recursive: true });

// 1. The 8 AM checklist Chris will see (v0.5 banner + Zak's table)
const zakChecklist = assigneeChecklistEmail({
  assignee: "zak@chrislamm.example",
  rows: [
    { contactName: "Maria Gutierrez", phone: "+1 (530) 555-1001", email: "maria@example.com",
      agentName: "Jane Smith", agentPhone: "+1 (530) 555-2002", lastTouch: "2026-05-05 — VM left", sfId: "003a" },
    { contactName: "John Doe", phone: "+1 (530) 555-1003", email: "john@example.com",
      agentName: "Bob Jones", agentPhone: "+1 (530) 555-2003", lastTouch: "2026-04-28 — Connected, scenario sent", sfId: "003b" },
    { contactName: "Linda Park", phone: "+1 (530) 555-1004", email: "linda@example.com",
      agentName: "Susan Lee", agentPhone: "+1 (530) 555-2004", lastTouch: "2026-04-15 — needs scenario refresh", sfId: "003c" },
  ],
});
const v05Banner = `<div style="background:#fffde7;padding:8px 12px;border-left:4px solid #f9a825;font-family:system-ui">
  <strong>v0.5 routing:</strong> this checklist is for <strong>zak@chrislamm.example</strong>.
  Forward when you're ready.
</div>`;
await fs.writeFile(path.join(OUT, "1-zak-checklist.html"),
  wrap(`[FOR zak@chrislamm.example] ${zakChecklist.subject}`, v05Banner + zakChecklist.html));

// 2. The PA check-in (sent to a client after a connected call → VM)
const paEmail = preApprovalEmail({
  contact: { FirstName: "Maria", Name: "Maria Gutierrez" },
  scenario: { maxPrice: 525000, estPayment: 3120 },
});
await fs.writeFile(path.join(OUT, "2-preapproval-checkin.html"),
  wrap(paEmail.subject, paEmail.html));

// 3. The realtor VM follow-up (with capture-rate stats embedded)
const realtorEmail = realtorVmEmail({
  realtor: { FirstName: "Jane", Name: "Jane Smith" },
  stats: { leads: 1, preapprovals: 1, deals: 0 },
  market: { summary: "Redding median up 1.8% MoM; 7 of your active listings within our pre-approval band." },
});
await fs.writeFile(path.join(OUT, "3-realtor-vm-followup.html"),
  wrap(realtorEmail.subject, realtorEmail.html));

console.log("Previews written to:");
for (const f of await fs.readdir(OUT)) console.log("  " + path.join(OUT, f));

function wrap(subject, html) {
  return `<!doctype html><meta charset="utf-8"><title>${subject}</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#222}
.subj{background:#404040;color:#fff;padding:12px 16px;border-radius:6px 6px 0 0;font-weight:700}
.body{border:1px solid #ddd;border-top:none;padding:16px;border-radius:0 0 6px 6px}</style>
<div class="subj">Subject: ${subject}</div><div class="body">${html}</div>`;
}
