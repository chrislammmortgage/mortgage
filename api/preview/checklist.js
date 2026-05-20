import { assigneeChecklistEmail } from "../../automation/templates/preapproval.js";

export default function handler(req, res) {
  const msg = assigneeChecklistEmail({
    assignee: req.query.for || "zak@chrislamm.example",
    rows: [
      { contactName: "Maria Gutierrez (SAMPLE)", phone: "+1 (530) 555-1001", email: "maria@example.com",
        agentName: "Jane Smith", agentPhone: "+1 (530) 555-2002", lastTouch: "2026-05-05 — VM left" },
      { contactName: "John Doe (SAMPLE)", phone: "+1 (530) 555-1003", email: "john@example.com",
        agentName: "Bob Jones", agentPhone: "+1 (530) 555-2003", lastTouch: "2026-04-28 — Connected, scenario sent" },
      { contactName: "Linda Park (SAMPLE)", phone: "+1 (530) 555-1004", email: "linda@example.com",
        agentName: "Susan Lee", agentPhone: "+1 (530) 555-2004", lastTouch: "2026-04-15 — needs scenario refresh" },
    ],
  });
  const v05 = `<div style="background:#fffde7;padding:10px 14px;border-left:4px solid #f9a825;font-family:system-ui;margin-bottom:14px;border-radius:6px">
    <strong>v0.5 routing — preview only.</strong> Once ROUTE_TO_OWNER_ONLY is flipped to false,
    this exact email goes to <strong>${req.query.for || "zak@chrislamm.example"}</strong>
    every Wednesday at 8 AM with the 10 most recent pre-approvals assigned to them.
  </div>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(wrap(msg.subject, v05 + msg.html));
}

function wrap(subject, html) {
  return `<!doctype html><meta charset="utf-8"><title>${subject}</title>
<style>body{font-family:system-ui,sans-serif;max-width:740px;margin:24px auto;padding:0 16px;color:#222}
.subj{background:#404040;color:#fff;padding:14px 18px;border-radius:6px 6px 0 0;font-weight:700;font-size:14px}
.body{border:1px solid #ddd;border-top:none;padding:18px;border-radius:0 0 6px 6px;background:#fff}</style>
<div class="subj">Subject: ${subject}</div><div class="body">${html}</div>`;
}
