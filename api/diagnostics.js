import { whoami } from "../automation/phoneburner.js";
import { sfConn, soql } from "../automation/salesforce.js";

export default async function handler(req, res) {
  const service = (req.query.service || "").toLowerCase();
  if (service === "pb" || service === "phoneburner") return await pb(res);
  if (service === "sf" || service === "salesforce") return await sf(res);
  res.status(400).json({ error: "specify ?service=sf or ?service=pb" });
}

async function pb(res) {
  try {
    const me = await whoami();
    res.status(200).json({ ok: true, service: "phoneburner", member: me });
  } catch (e) {
    const status = e.response?.status;
    const body = e.response?.data;
    res.status(200).json({
      ok: false, service: "phoneburner", status, body,
      hint: status === 403 && /allowlist/i.test(JSON.stringify(body || ""))
        ? "PhoneBurner is IP-blocking this host. In PhoneBurner My Account → Integrations, disable the API IP allowlist (or add Vercel's egress to it)."
        : "Confirm PHONEBURNER_ACCESS_TOKEN is set in Vercel env and the deployment has been redeployed.",
    });
  }
}

async function sf(res) {
  try {
    const conn = await sfConn();
    const me = await conn.identity();
    const sample = await soql("SELECT Id, Name FROM Contact LIMIT 3");
    res.status(200).json({
      ok: true, service: "salesforce",
      instance: conn.instanceUrl,
      user: { name: me.display_name, email: me.email, organization_id: me.organization_id },
      sample_contacts: sample.length,
    });
  } catch (e) {
    res.status(200).json({ ok: false, service: "salesforce", error: e.message,
      hint: "Run /api/oauth/salesforce/start once your Connected App is configured." });
  }
}
