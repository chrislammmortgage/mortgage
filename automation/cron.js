import cron from "node-cron";
import { config, log } from "./config.js";
import { buildMondayRealtorList } from "./themedays/monday-realtors.js";
import { runWednesdayPreApprovalKickoff, runEodEnforcement } from "./themedays/wednesday-preapprovals.js";

const TZ = config.tz;
let lastWedRun = null;

// Monday 06:00 — build realtor list
cron.schedule("0 6 * * 1", async () => {
  log.info("CRON: Monday realtor list");
  try { await buildMondayRealtorList(); }
  catch (e) { log.error({ err: e.message }, "Monday job failed"); }
}, { timezone: TZ });

// Wednesday 07:30 — build Chris's dial set + draft assignee checklists
cron.schedule("30 7 * * 3", async () => {
  log.info("CRON: Wednesday pre-approval kickoff");
  try {
    lastWedRun = await runWednesdayPreApprovalKickoff();
  } catch (e) { log.error({ err: e.message }, "Wednesday job failed"); }
}, { timezone: TZ });

// Wednesday 17:00 — EOD enforcement
cron.schedule("0 17 * * 3", async () => {
  log.info("CRON: Wednesday EOD enforcement");
  if (!lastWedRun) return log.warn("no Wed run state — skipping EOD");
  try {
    const allRows = lastWedRun.assigneeResults.flatMap(a => a.rows);
    await runEodEnforcement({ checklistRows: allRows });
  } catch (e) { log.error({ err: e.message }, "EOD enforcement failed"); }
}, { timezone: TZ });

log.info({ tz: TZ }, "cron scheduler started");
