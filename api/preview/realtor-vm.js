import { realtorVmEmail } from "../../automation/templates/realtor-vm.js";

export default function handler(req, res) {
  const msg = realtorVmEmail({
    realtor: { FirstName: "Jane", Name: "Jane Smith" },
    stats: { leads: 1, preapprovals: 1, deals: 0 },
    market: { summary: "Redding median up 1.8% MoM; 7 of your active listings within our pre-approval band." },
  });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(wrap(msg.subject, msg.html));
}

function wrap(s, h) {
  return `<!doctype html><meta charset="utf-8"><title>${s}</title>
<style>body{font-family:system-ui,sans-serif;max-width:740px;margin:24px auto;padding:0 16px;color:#222}
.subj{background:#404040;color:#fff;padding:14px 18px;border-radius:6px 6px 0 0;font-weight:700;font-size:14px}
.body{border:1px solid #ddd;border-top:none;padding:18px;border-radius:0 0 6px 6px;background:#fff}</style>
<div class="subj">Subject: ${s}</div><div class="body">${h}</div>`;
}
