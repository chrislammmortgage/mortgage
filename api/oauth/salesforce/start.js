export default function handler(req, res) {
  const clientId = process.env.SF_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: "SF_CLIENT_ID not set" });
  const redirect = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/oauth/salesforce/callback`;
  const url = `${process.env.SF_LOGIN_URL || "https://login.salesforce.com"}/services/oauth2/authorize?`
    + new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirect,
        response_type: "code",
        scope: "api refresh_token offline_access",
        prompt: "consent",
      }).toString();
  res.writeHead(302, { Location: url });
  res.end();
}
