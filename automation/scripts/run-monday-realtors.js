#!/usr/bin/env node
import { buildMondayRealtorList } from "../themedays/monday-realtors.js";
import { log } from "../config.js";

(async () => {
  try {
    const r = await buildMondayRealtorList();
    log.info({
      strategy: r.strategy,
      finalCount: r.finalList.length,
      top10: r.finalList.filter(x => x.pool === "TOP10").length,
      rotation: r.finalList.filter(x => x.pool === "POOL20").length,
      session: r.session?.dialsession_id,
    }, "Monday realtor list ready");
    process.exit(0);
  } catch (e) {
    log.error({ err: e.message, stack: e.stack }, "Monday job failed");
    process.exit(1);
  }
})();
