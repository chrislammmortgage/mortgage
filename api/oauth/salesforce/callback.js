import axios from "axios";

export default async function handler(req, res) {
  const { code, error } = req.query;
  if (error) return res.status(400).send(`<pre>OAuth error: ${error}</pre>`);
  if (!code) return res.status(400).send("Missing ?code");
  const redirect = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/oauth/salesforce/callback`;
  try {
    const r = await axios.post(
      `${process.env.SF_LOGIN_URL || "https://login.salesforce.com"}/services/oauth2/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.SF_CLIENT_ID,
        client_secret: process.env.SF_CLIENT_SECRET,
        redirect_uri: redirect,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const tokens = r.data;
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`<!doctype html><meta charset="utf-8"><title>Salesforce OAuth — captured</title>
<style>body{font-family:system-ui;max-width:720px;margin:40px auto;padding:0 16px;color:#222}
code{background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:13px;word-break:break-all}
.box{background:#e8f5e9;border:1px solid #2D7D46;border-radius:6px;padding:14px 18px;margin:18px 0}</style>
<h2>✓ Salesforce connected</h2>
<div class="box">
  <p><strong>Instance:</strong> <code>${tokens.instance_url}</code></p>
  <p><strong>User Id:</strong> <code>${tokens.id}</code></p>
  <p><strong>Refresh token (paste into <code>SF_REFRESH_TOKEN</code> Vercel env, then redeploy):</strong></p>
  <p><code>${tokens.refresh_token}</code></p>
  <p><strong>Instance URL → <code>SF_INSTANCE_URL</code>:</strong></p>
  <p><code>${tokens.instance_url}</code></p>
</div>
<p>Set these as Production environment variables on Vercel for the project,
then click "Redeploy" on the latest deployment. After that, hit
<code>/api/diagnostics/sf</code> to verify a live query.</p>`);
  } catch (e) {
    res.status(500).send(`<pre>Token exchange failed:\n${JSON.stringify(e.response?.data || e.message, null, 2)}</pre>`);
  }
}
