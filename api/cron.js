import { runWednesdayPreApprovalKickoff, runEodEnforcement }
  from "../automation/themedays/wednesday-preapprovals.js";
import { buildMondayRealtorList } from "../automation/themedays/monday-realtors.js";
import { runThursdayPastClientKickoff } from "../automation/themedays/thursday-clients.js";
import { runFridayWhaleKickoff } from "../automation/themedays/friday-whales.js";

const JOBS = {
  "monday-realtors":  () => buildMondayRealtorList(),
  "wed-kickoff":      () => runWednesdayPreApprovalKickoff(),
  "wed-eod":          () => Promise.resolve({ note: "EOD enforcement needs durable kickoff state (Supabase/KV) on Vercel — v1." }),
  "thu-kickoff":      () => runThursdayPastClientKickoff(),
  "fri-kickoff":      () => runFridayWhaleKickoff(),
};

export default async function handler(req, res) {
  // Vercel Cron sends Bearer CRON_SECRET in Authorization header.
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  const job = req.query.job;
  const fn = JOBS[job];
  if (!fn) return res.status(400).json({ ok: false, error: "unknown job", valid: Object.keys(JOBS) });
  try {
    const out = await fn();
    res.status(200).json({ ok: true, job, result: summary(out) });
  } catch (e) {
    res.status(500).json({ ok: false, job, error: e.message });
  }
}

function summary(o) {
  if (!o) return null;
  return {
    strategy: o.strategy,
    finalCount: o.finalList?.length,
    chrisCount: o.chrisCount,
    assignees: o.assigneeResults?.length,
    session: o.session?.dialsession_id,
    segment: o.segment,
    dialable: o.dialable,
    flagged: o.flagged?.length,
    count: o.count,
    note: o.note,
  };
}
