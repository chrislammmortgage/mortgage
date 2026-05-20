import { runFridayWhaleKickoff } from "../../automation/themedays/friday-whales.js";

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false });
  }
  try {
    const r = await runFridayWhaleKickoff();
    res.status(200).json({ ok: true, count: r.count, session: r.session?.dialsession_id });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
}
