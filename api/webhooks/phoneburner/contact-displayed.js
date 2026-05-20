// Fired by PhoneBurner when a dial session loads & displays a contact.
// Will use this in v1 to refresh the contact's live Salesforce data in the
// dialer view (latest scenario, last touch, agent name) just-in-time.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  try {
    const p = req.body || {};
    console.log("contact-displayed", {
      callId: p.call_id, sfId: p.contact?.custom_data?.sf_id,
      theme: p.contact?.custom_data?.theme,
    });
    res.status(200).json({ ok: true, logged: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
