import { buildMondayRealtorList } from "../../automation/themedays/monday-realtors.js";

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false });
  }
  try {
    const r = await buildMondayRealtorList();
    res.status(200).json({
      ok: true, strategy: r.strategy,
      finalCount: r.finalList.length,
      session: r.session?.dialsession_id,
    });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
}
