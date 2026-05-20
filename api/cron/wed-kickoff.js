import { runWednesdayPreApprovalKickoff } from "../../automation/themedays/wednesday-preapprovals.js";

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false });
  }
  try {
    const r = await runWednesdayPreApprovalKickoff();
    res.status(200).json({ ok: true, chrisCount: r.chrisCount, assignees: r.assigneeResults.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
