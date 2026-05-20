#!/usr/bin/env node
import { runWednesdayPreApprovalKickoff } from "../themedays/wednesday-preapprovals.js";
import { log } from "../config.js";

(async () => {
  try {
    const result = await runWednesdayPreApprovalKickoff();
    log.info({
      session: result.session?.dialsession_id,
      chrisCount: result.chrisCount,
      assignees: result.assigneeResults.map(a => ({ assignee: a.assignee, count: a.count })),
    }, "kickoff complete");
    // Persist checklist for the EOD enforcer to read
    const fs = await import("fs/promises");
    await fs.writeFile(
      "/tmp/themeday-wed-checklist.json",
      JSON.stringify(result.assigneeResults.flatMap(a => a.rows.map(r => ({ ...r, ownerEmail: a.assignee }))), null, 2)
    );
    process.exit(0);
  } catch (e) {
    log.error({ err: e.message, stack: e.stack }, "kickoff failed");
    process.exit(1);
  }
})();
