import { runEodEnforcement } from "../../automation/themedays/wednesday-preapprovals.js";

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false });
  }
  try {
    // For Vercel, last kickoff's rows must come from durable storage (Supabase/KV).
    // Stub for now — returns 0 missed if no state.
    res.status(200).json({ ok: true, note: "EOD enforcement needs durable kickoff state (Supabase/KV) on Vercel" });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
}
