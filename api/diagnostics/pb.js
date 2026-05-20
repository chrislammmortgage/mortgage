import { whoami } from "../../automation/phoneburner.js";

export default async function handler(req, res) {
  try {
    const me = await whoami();
    res.status(200).json({ ok: true, member: me });
  } catch (e) {
    const status = e.response?.status;
    const body = e.response?.data;
    res.status(200).json({
      ok: false,
      status,
      body,
      hint: status === 403 && /allowlist/i.test(JSON.stringify(body || ""))
        ? "PhoneBurner is IP-blocking this host. Disable the API IP allowlist in PhoneBurner My Account → Integrations, or add Vercel's egress to it."
        : "Confirm PHONEBURNER_ACCESS_TOKEN is set in Vercel env and the deployment has been redeployed.",
    });
  }
}
