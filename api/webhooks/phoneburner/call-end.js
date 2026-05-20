import { handleDisposition } from "../../../automation/webhooks/disposition.js";

// Fired by PhoneBurner when a call within a dial session is dispositioned.
// This is the workhorse — transcript + recording_url + disposition all land here.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  try {
    const payload = { ...req.body, event: req.body.event || "call.completed" };
    const result = await handleDisposition(payload, {});
    res.status(200).json(result);
  } catch (e) {
    console.error("call-end webhook error", e);
    res.status(500).json({ ok: false, error: e.message });
  }
}
