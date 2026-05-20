// Fired by PhoneBurner when a dial session loads & displays a contact.
// Will use this in v1 to refresh the contact's live Salesforce data in the
// dialer view (latest scenario, last touch, agent name) just-in-time.
// Full payload captured to Vercel runtime logs as PB_CONTACT_DISPLAYED_RAW.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  console.log("PB_CONTACT_DISPLAYED_RAW", JSON.stringify({ body: req.body }));
  res.status(200).json({ ok: true, logged: true });
}
