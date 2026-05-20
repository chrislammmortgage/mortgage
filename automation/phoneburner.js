import axios from "axios";
import { config, log } from "./config.js";

let _token = null;
let _tokenExp = 0;

async function token() {
  if (_token && Date.now() < _tokenExp - 60000) return _token;
  if (!config.pb.clientId || !config.pb.refreshToken) {
    throw new Error("PhoneBurner creds missing");
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

export async function whoami() {
  return pb("members/me");
}

/**
 * Build a dial session in PhoneBurner from a list of contacts.
 * contacts: [{ first_name, last_name, phone, email, custom: { ... } }]
 * Returns: { dialsession_id, contact_ids }
 */
export async function createDialSession({ name, contacts, folderId }) {
  if (config.dryRun) {
    log.info({ name, count: contacts.length }, "[DRY_RUN] createDialSession");
    return { dialsession_id: "dryrun-" + Date.now(), contact_ids: contacts.map((_, i) => `dry-${i}`) };
  }
  // 1. Upload contacts (PhoneBurner accepts arrays)
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

  // 2. Build dial session
  const session = await pb("dialsession", {
    method: "POST",
    body: { name, contact_ids },
  });
  return { dialsession_id: session.id || session.dialsession_id, contact_ids };
}

export async function getCallResult(callId) {
  return pb(`calls/${callId}`);
}

/**
 * PhoneBurner webhook payload shape (representative):
 * {
 *   event: "call.completed",
 *   call_id, contact: { id, first_name, last_name, phone, custom_data: { sf_id } },
 *   disposition: "VM" | "Connected" | "Bad Number" | ...,
 *   recording_url, transcript, duration_seconds, member_id, dialsession_id
 * }
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
