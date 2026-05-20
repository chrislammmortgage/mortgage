import axios from "axios";
import { config, log } from "./config.js";

let _msToken = null, _msExp = 0;

async function msToken() {
  if (_msToken && Date.now() < _msExp - 60000) return _msToken;
  const res = await axios.post(
    `https://login.microsoftonline.com/${config.ms.tenantId}/oauth2/v2.0/token`,
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.ms.clientId,
      client_secret: config.ms.clientSecret,
      scope: "https://graph.microsoft.com/.default",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  _msToken = res.data.access_token;
  _msExp = Date.now() + res.data.expires_in * 1000;
  return _msToken;
}

/**
 * Send via Microsoft Graph (Outlook). For "draft, I approve" mode we save a
 * draft instead of sending and return its web link.
 */
export async function sendOrDraft({ to, subject, html, draft = true, from }) {
  if (config.dryRun) {
    log.info({ to, subject, draft }, "[DRY_RUN] sendOrDraft");
    return { dryRun: true, draft };
  }
  if (!config.ms.tenantId) {
    log.warn("MS Graph not configured — logging email and skipping send");
    log.info({ to, subject, body: html.slice(0, 200) }, "email (mocked)");
    return { mocked: true };
  }
  const fromAddr = from || config.ms.fromAddress;
  const t = await msToken();
  const message = {
    subject,
    body: { contentType: "HTML", content: html },
    toRecipients: (Array.isArray(to) ? to : [to]).map(addr => ({ emailAddress: { address: addr } })),
  };
  if (draft) {
    const r = await axios.post(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromAddr)}/messages`,
      message,
      { headers: { Authorization: `Bearer ${t}` } }
    );
    return { draftId: r.data.id, webLink: r.data.webLink };
  } else {
    await axios.post(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromAddr)}/sendMail`,
      { message, saveToSentItems: true },
      { headers: { Authorization: `Bearer ${t}` } }
    );
    return { sent: true };
  }
}
