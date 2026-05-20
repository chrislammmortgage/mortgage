#!/usr/bin/env node
import fs from "fs/promises";
import { runEodEnforcement } from "../themedays/wednesday-preapprovals.js";
import { log } from "../config.js";

(async () => {
  try {
    const data = await fs.readFile("/tmp/themeday-wed-checklist.json", "utf8");
    const rows = JSON.parse(data);
    const r = await runEodEnforcement({ checklistRows: rows });
    log.info({ missed: r.missed.length }, "EOD enforcement complete");
    process.exit(0);
  } catch (e) {
    log.error({ err: e.message }, "EOD enforcement failed");
    process.exit(1);
  }
})();
