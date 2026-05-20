// Morning briefing — mobile-friendly status page. Pings every diagnostic
// in parallel and renders today's theme day + system readiness.
import axios from "axios";

const THEMES = {
  0: { day: "Sun", theme: "Rest", emoji: "🌅" },
  1: { day: "Mon", theme: "Power Hour — Realtors", emoji: "📞", endpoint: "/api/cron/monday-realtors" },
  2: { day: "Tue", theme: "Update Calls — Active files", emoji: "🔄" },
  3: { day: "Wed", theme: "Pre-Approval Calls", emoji: "✅", endpoint: "/api/cron/wed-kickoff" },
  4: { day: "Thu", theme: "Past Client Calls", emoji: "💚" },
  5: { day: "Fri", theme: "Whale / VIP Calls", emoji: "🐋" },
  6: { day: "Sat", theme: "Rest", emoji: "🌅" },
};

export default async function handler(req, res) {
  const today = new Date();
  const theme = THEMES[today.getDay()];

  // Self-check all integrations
  const host = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
  const checks = await Promise.all([
    fetchJson(`${host}/api/health`),
    fetchJson(`${host}/api/selftest`),
  ]);
  const [health, selftest] = checks;

  const env = health.body?.env || {};
  const ok = selftest.ok && selftest.body?.ok;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Morning briefing — ${theme.day} ${today.toISOString().slice(0,10)}</title>
<style>
  body{font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:16px;background:#fafafa;color:#222}
  h1{font-size:22px;margin:8px 0 4px}
  .day{color:#02b2da;font-weight:700;letter-spacing:.04em;text-transform:uppercase;font-size:13px}
  .theme{font-size:24px;margin:12px 0;color:#404040;font-weight:700}
  .pill{display:inline-block;padding:4px 10px;border-radius:14px;font-size:12px;font-weight:700;margin-right:6px}
  .green{background:#e8f5e9;color:#2D7D46}.red{background:#ffebee;color:#c62828}.amber{background:#fff3e0;color:#e65100}
  .card{background:#fff;border:1px solid #ddd;border-radius:10px;padding:14px 18px;margin:10px 0}
  .card h3{margin:0 0 8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.06em}
  table{width:100%;border-collapse:collapse;font-size:14px}
  td{padding:6px 0;border-bottom:1px solid #f0f0f0}
  td:last-child{text-align:right}
  a{color:#02b2da;text-decoration:none;font-weight:600}
  .footer{color:#888;font-size:11px;margin-top:24px;text-align:center}
</style></head><body>
<div class="day">${today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
<h1>${theme.emoji} ${theme.theme}</h1>

<div class="card">
  <h3>System status</h3>
  <table>
    <tr><td>Smoke test</td><td>${ok ? '<span class="pill green">5/5 green</span>' : '<span class="pill red">failing</span>'}</td></tr>
    <tr><td>Salesforce</td><td>${env.hasSalesforce ? '<span class="pill green">wired</span>' : '<span class="pill amber">needs creds</span>'}</td></tr>
    <tr><td>PhoneBurner</td><td>${env.hasPhoneBurner ? '<span class="pill green">wired</span>' : '<span class="pill amber">needs creds</span>'}</td></tr>
    <tr><td>MS Graph (email)</td><td>${env.hasMsGraph ? '<span class="pill green">wired</span>' : '<span class="pill amber">needs creds</span>'}</td></tr>
    <tr><td>Firecrawl (enrichment)</td><td>${env.hasFirecrawl ? '<span class="pill green">wired</span>' : '<span class="pill amber">needs creds</span>'}</td></tr>
    <tr><td>Route to owner only</td><td><span class="pill ${env.routeToOwnerOnly?'green':'amber'}">v0.5 ${env.routeToOwnerOnly?'on':'off'}</span></td></tr>
    <tr><td>Dry run</td><td><span class="pill ${env.dryRun?'amber':'green'}">${env.dryRun?'safe (no writes)':'live writes'}</span></td></tr>
  </table>
</div>

<div class="card">
  <h3>Today's plan</h3>
  ${theme.endpoint
    ? `<p style="margin:0 0 8px">Cron triggers <code>${theme.endpoint}</code> automatically.
       Tap to run it manually (requires CRON_SECRET).</p>`
    : `<p style="margin:0">Quiet day. Nothing scheduled.</p>`}
  <p style="margin:8px 0 0"><a href="/setup.html">Open setup dashboard →</a></p>
  <p style="margin:6px 0 0"><a href="/api/selftest">Run self-test →</a></p>
</div>

<div class="card">
  <h3>Preview the emails</h3>
  <p style="margin:0"><a href="/api/preview/checklist">Wed 8 AM checklist</a> · <a href="/api/preview/preapproval">PA check-in</a> · <a href="/api/preview/realtor-vm">Realtor VM</a></p>
</div>

<p class="footer">Theme Day Call Automation v0.5 · last self-test ${new Date().toISOString()}</p>
</body></html>`);
}

async function fetchJson(url) {
  try { const r = await axios.get(url, { timeout: 8000 }); return { ok: true, body: r.data }; }
  catch (e) { return { ok: false, error: e.message }; }
}
