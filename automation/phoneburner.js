import axios from "axios";
import { config, log } from "./config.js";

// PhoneBurner auth — supports two modes:
//   1. Personal Access Token (recommended for this build) — set
//      PHONEBURNER_ACCESS_TOKEN to the token from
//      Settings → Integrations → Personal Access Tokens.
//   2. OAuth2 refresh-token flow — fallback when a multi-user OAuth app is
//      required (Custom Applications). Set PHONEBURNER_CLIENT_ID/SECRET/
//      REFRESH_TOKEN.

let _token = null;
let _tokenExp = 0;

async function token() {
  // PAT mode (simple, preferred)
  if (config.pb.accessToken) return config.pb.accessToken;

  // OAuth refresh mode
  if (_token && Date.now() < _tokenExp - 60000) return _token;
  if (!config.pb.clientId || !config.pb.refreshToken) {
    throw new Error(
      "PhoneBurner auth missing — set PHONEBURNER_ACCESS_TOKEN (preferred), "
      + "or PHONEBURNER_CLIENT_ID + PHONEBURNER_REFRESH_TOKEN for full OAuth."
    );
  }
  const res = await axios.post(
    `${config.pb.baseUrl}oauth2/token`,
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: config.pb.clientId,
      client_secret: config.pb.clientSecret,
      refresh_token: config.pb.refreshToken,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  _token = res.data.access_token;
  _tokenExp = Date.now() + (res.data.expires_in ?? 3600) * 1000;
  return _token;
}

async function pb(path, opts = {}) {
  const t = await token();
  const url = `${config.pb.baseUrl}${path.replace(/^\//, "")}`;
  try {
    const res = await axios({
      url,
      method: opts.method || "GET",
      headers: { Authorization: `Bearer ${t}`, ...opts.headers },
      data: opts.body,
      params: opts.query,
    });
    return res.data;
  } catch (e) {
    log.error({ path, status: e.response?.status, data: e.response?.data }, "PhoneBurner error");
    throw e;
  }
}

export async function whoami() { return pb("members/me"); }

/**
 * Build a dial session in PhoneBurner from a list of contacts.
 * contacts: [{ firstName, lastName, phone, email, custom: {...} }]
 */
export async function createDialSession({ name, contacts, folderId }) {
  if (config.dryRun) {
    log.info({ name, count: contacts.length }, "[DRY_RUN] createDialSession");
    return { dialsession_id: "dryrun-" + Date.now(), contact_ids: contacts.map((_, i) => `dry-${i}`) };
  }
  // 1. Bulk-create contacts. PhoneBurner accepts arrays per the API.
  const created = await pb("contacts", {
    method: "POST",
    body: contacts.map(c => ({
      first_name: c.firstName,
      last_name: c.lastName,
      phone_number: c.phone,
      email_address: c.email,
      folder_id: folderId,
      custom_data: c.custom || {},
    })),
  });
  const contact_ids = (created.contacts || created).map(x => x.id);

  // 2. Build the dial session.
  const session = await pb("dialsession", {
    method: "POST",
    body: { name, contact_ids },
  });
  return { dialsession_id: session.id || session.dialsession_id, contact_ids };
}

export async function getCallResult(callId) { return pb(`calls/${callId}`); }

/**
 * PhoneBurner webhook payload — configured under Settings → Integrations →
 * Webhooks. Set the URL to https://<vercel-host>/api/webhooks/phoneburner.
 * Payload (representative):
 *   { event, call_id, contact: { id, first_name, last_name, phone,
 *       custom_data: { sf_id, theme } },
 *     disposition, recording_url, transcript, duration_seconds,
 *     member_id, dialsession_id, completed_at }
 */
export function parseWebhook(payload) {
  return {
    event: payload.event,
    callId: payload.call_id,
    contact: payload.contact,
    sfId: payload.contact?.custom_data?.sf_id,
    theme: payload.contact?.custom_data?.theme,
    disposition: payload.disposition,
    recordingUrl: payload.recording_url,
    transcript: payload.transcript,
    duration: payload.duration_seconds,
    when: payload.completed_at || new Date().toISOString(),
  };
}
