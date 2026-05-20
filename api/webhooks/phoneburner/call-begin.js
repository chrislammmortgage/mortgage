// Fired by PhoneBurner when a dial session initiates a call. Useful for
// marking "call attempted" in Salesforce before disposition lands.
// Full payload captured to Vercel runtime logs as PB_CALL_BEGIN_RAW.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  console.log("PB_CALL_BEGIN_RAW", JSON.stringify({ body: req.body }));
  res.status(200).json({ ok: true, logged: true });
}
