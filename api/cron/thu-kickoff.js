import { runThursdayPastClientKickoff } from "../../automation/themedays/thursday-clients.js";

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false });
  }
  try {
    const r = await runThursdayPastClientKickoff();
    res.status(200).json({ ok: true, segment: r.segment, dialable: r.dialable, flagged: r.flagged.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
}
