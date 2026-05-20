// Fired by PhoneBurner when a dial session initiates a call. Useful for
// marking "call attempted" in Salesforce before disposition lands.
// We log only for now — full attempt-tracking arrives in v1.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  try {
    const p = req.body || {};
    console.log("call-begin", {
      callId: p.call_id, theme: p.contact?.custom_data?.theme,
      sfId: p.contact?.custom_data?.sf_id, when: p.started_at,
    });
    res.status(200).json({ ok: true, logged: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
