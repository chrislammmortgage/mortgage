export default function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html><html><head><meta charset="utf-8"><title>Theme Day Call Automation</title>
<style>body{font-family:system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 20px;color:#222;line-height:1.5}
h1{color:#02b2da;margin-bottom:0}h2{margin-top:32px}
.card{border:1px solid #ddd;border-radius:8px;padding:16px 20px;margin:14px 0}
.card h3{margin:0 0 8px 0;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:.06em}
.card a{color:#02b2da;text-decoration:none;font-weight:600}
.card a:hover{text-decoration:underline}
code{background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:13px}
.status{display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;text-transform:uppercase}
.live{background:#e8f5e9;color:#2D7D46}.pending{background:#fff3e0;color:#e65100}</style></head>
<body>
<h1>Theme Day Call Automation</h1>
<p style="color:#888;margin-top:4px">MortgageOne / Team Lamm · v0.5 (route to owner only)</p>

<h2>Preview the emails</h2>
<div class="card"><h3>Wednesday 8 AM checklist (Zak)</h3>
  <p>What Zak/Jennifer/Toni each get on Wednesday morning — currently routed to Chris in v0.5.</p>
  <a href="/api/preview/checklist?for=zak@chrislamm.com">Open preview →</a></div>
<div class="card"><h3>Pre-approval check-in (to client)</h3>
  <p>Drafted automatically after a VM/no-answer disposition during a PA dial set.</p>
  <a href="/api/preview/preapproval">Open preview →</a></div>
<div class="card"><h3>Realtor VM follow-up (Monday Power Hour)</h3>
  <p>Value-based follow-up with your active business + market snapshot for the realtor.</p>
  <a href="/api/preview/realtor-vm">Open preview →</a></div>

<h2>Wire up the connections</h2>
<div class="card"><h3>1. Salesforce <span class="status pending">action needed</span></h3>
  <p>Create a Connected App in SF Setup (callback URL: <code>https://&lt;this-host&gt;/api/oauth/salesforce/callback</code>),
  scopes <code>api</code> + <code>refresh_token offline_access</code>. Set <code>SF_CLIENT_ID</code>/<code>SF_CLIENT_SECRET</code> in
  Vercel env, redeploy, then click:</p>
  <a href="/api/oauth/salesforce/start">Authorize Salesforce →</a></div>
<div class="card"><h3>2. PhoneBurner <span class="status pending">action needed</span></h3>
  <p>In PhoneBurner → Settings → Integrations → <strong>Personal Access Tokens</strong> →
  click "Generate new token". Copy the token and paste it into the Vercel env var
  <code>PHONEBURNER_ACCESS_TOKEN</code>, then redeploy.</p>
  <p>Then in Settings → Integrations → <strong>Webhooks</strong>, point a webhook at
  <code>https://&lt;this-host&gt;/api/webhooks/phoneburner</code> for the "Call Completed"
  event so dispositions flow back to Salesforce.</p></div>

<h2>Diagnostics</h2>
<div class="card"><h3>System status</h3>
  <p><a href="/api/health">/api/health</a> — which env vars are present, dry-run state</p>
  <p><a href="/api/diagnostics/sf">/api/diagnostics/sf</a> — live Salesforce identity + sample query</p></div>

<p style="color:#888;font-size:12px;margin-top:32px">
Built for: MortgageOne Inc · NMLS #898812 · Chris Lamm, Branch Manager · NMLS #209221
</p></body></html>`);
}
