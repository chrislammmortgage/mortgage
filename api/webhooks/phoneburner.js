import { handleDisposition } from "../../automation/webhooks/disposition.js";

// Single PhoneBurner webhook endpoint. Differentiates events by either:
//   /api/webhooks/phoneburner?event=call-end     (call-end is the workhorse)
//   /api/webhooks/phoneburner?event=call-begin
//   /api/webhooks/phoneburner?event=contact-displayed
//
// vercel.json rewrites also provide clean paths:
//   /api/webhooks/phoneburner/call-end → ?event=call-end
//   /api/webhooks/phoneburner/call-begin → ?event=call-begin
//   /api/webhooks/phoneburner/contact-displayed → ?event=contact-displayed
//
// On every request we log the FULL raw payload to Vercel runtime logs as
// PB_CALL_END_RAW etc. so we can lock parseWebhook to reality on first
// real call without having to re-deploy logging.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  const event = (req.query.event || "call-end").toLowerCase();
  const tag = `PB_${event.toUpperCase().replace(/-/g, "_")}_RAW`;
  console.log(tag, JSON.stringify({
    headers: pick(req.headers, ["user-agent", "content-type", "x-phoneburner-signature", "x-pb-event"]),
    body: req.body,
  }));

  // Begin + Contact-Displayed are log-only for v0.5.
  if (event === "call-begin" || event === "contact-displayed") {
    return res.status(200).json({ ok: true, event, logged: true });
  }
  // Call-End → disposition pipeline.
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
