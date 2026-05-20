import { assigneeChecklistEmail, preApprovalEmail } from "../automation/templates/preapproval.js";
import { realtorVmEmail } from "../automation/templates/realtor-vm.js";
import { pastClientEmail } from "../automation/templates/past-client.js";
import { whaleEmail } from "../automation/templates/whale.js";

export default function handler(req, res) {
  const type = (req.query.type || "checklist").toLowerCase();
  let subject, html;
  if (type === "checklist") {
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
    const banner = `<div style="background:#fffde7;padding:10px 14px;border-left:4px solid #f9a825;font-family:system-ui;margin-bottom:14px;border-radius:6px">
      <strong>v0.5 routing — preview only.</strong> Once <code>ROUTE_TO_OWNER_ONLY=false</code>,
      this exact email fires to <strong>${req.query.for || "zak@chrislamm.example"}</strong> every Wednesday at 8 AM.
    </div>`;
    subject = msg.subject; html = banner + msg.html;
  } else if (type === "preapproval") {
    const m = preApprovalEmail({ contact: { FirstName: "Maria", Name: "Maria Gutierrez" },
      scenario: { maxPrice: 525000, estPayment: 3120 } });
    subject = m.subject; html = m.html;
  } else if (type === "realtor-vm" || type === "realtor") {
    const m = realtorVmEmail({
      realtor: { FirstName: "Jane", Name: "Jane Smith" },
      stats: { leads: 1, preapprovals: 1, deals: 0 },
      market: { summary: "Redding median up 1.8% MoM; 7 of your active listings within our pre-approval band." },
    });
    subject = m.subject; html = m.html;
  } else if (type === "past-client") {
    const m = pastClientEmail({ contact: { FirstName: "Alice" }, segment: "annual_review",
      equity: { estimate: 575000, balance: 312000 } });
    subject = m.subject; html = m.html;
  } else if (type === "whale") {
    const m = whaleEmail({ contact: { FirstName: "Sam" } });
    subject = m.subject; html = m.html;
  } else {
    res.status(400).json({ error: `unknown preview type: ${type}`,
      valid: ["checklist", "preapproval", "realtor-vm", "past-client", "whale"] });
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html><meta charset="utf-8"><title>${subject}</title>
<style>body{font-family:system-ui,sans-serif;max-width:740px;margin:24px auto;padding:0 16px;color:#222}
.subj{background:#404040;color:#fff;padding:14px 18px;border-radius:6px 6px 0 0;font-weight:700;font-size:14px}
.body{border:1px solid #ddd;border-top:none;padding:18px;border-radius:0 0 6px 6px;background:#fff}</style>
<div class="subj">Subject: ${subject}</div><div class="body">${html}</div>`);
}
