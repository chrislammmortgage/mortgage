import { handleDisposition } from "../../automation/webhooks/disposition.js";

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  try {
    const result = await handleDisposition(req.body, {});
    res.status(200).json(result);
  } catch (e) {
    console.error("webhook error", e);
    res.status(500).json({ ok: false, error: e.message });
  }
}
