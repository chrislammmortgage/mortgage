import { handleDisposition } from "../../../automation/webhooks/disposition.js";

// Fired by PhoneBurner when a call within a dial session is dispositioned.
// This is the workhorse — transcript + recording_url + disposition all land here.
//
// We log the FULL raw payload on every call (visible in Vercel runtime logs)
// so the first real call's exact field shape is captured. Lets us tune
// automation/phoneburner.js#parseWebhook to reality without guessing.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  // Full payload capture — searchable in Vercel logs as "PB_CALL_END_RAW".
  console.log("PB_CALL_END_RAW", JSON.stringify({
    headers: pick(req.headers, ["user-agent", "content-type", "x-phoneburner-signature", "x-pb-event"]),
    body: req.body,
  }));
  try {
    const payload = { ...req.body, event: req.body.event || "call.completed" };
    const result = await handleDisposition(payload, {});
    res.status(200).json(result);
  } catch (e) {
    console.error("PB_CALL_END_ERR", e.message, e.stack);
    res.status(500).json({ ok: false, error: e.message });
  }
}

function pick(obj, keys) {
  const o = {}; for (const k of keys) if (obj[k] !== undefined) o[k] = obj[k]; return o;
}

