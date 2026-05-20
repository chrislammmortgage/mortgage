#!/usr/bin/env node
/**
 * Schema discovery — run after pasting Salesforce creds in .env.
 *
 *   node automation/scripts/discover-schema.js
 *
 * Prints the real Contact field model and writes automation/.schema.json:
 *   - Every custom field on Contact (API name + label + type)
 *   - Picklist values for Group__c, Stage__c, and any *_Stage__c field
 *   - Available RecordTypes
 *   - Whether each field name in .env.example actually exists in the org
 *
 * Outputs a verdict: which env vars (if any) you need to override.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sfConn } from "../salesforce.js";
import { config, log } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  let conn;
  try { conn = await sfConn(); }
  catch (e) {
    console.error("\n✗ Salesforce connection failed:", e.message);
    console.error("  Confirm SF_CLIENT_ID, SF_CLIENT_SECRET, SF_REFRESH_TOKEN, SF_INSTANCE_URL in .env\n");
    process.exit(1);
  }
  console.log("✓ Connected:", conn.instanceUrl);

  const meta = await conn.sobject("Contact").describe();

  const customFields = meta.fields
    .filter(f => f.custom)
    .map(f => ({ name: f.name, label: f.label, type: f.type,
      referenceTo: f.referenceTo, picklistValues: f.picklistValues?.map(p => p.value) }));

  // Picklist enumeration for the ones we care about
  const interesting = ["Group__c", "Stage__c", "Loan_Stage__c", "Lead_Stage__c", "Type", "RecordTypeId"];
  const picks = {};
  for (const name of interesting) {
    const f = meta.fields.find(x => x.name === name);
    if (f?.picklistValues?.length) picks[name] = f.picklistValues.map(p => p.value);
  }

  // RecordTypes
  const rts = meta.recordTypeInfos.filter(r => r.available)
    .map(r => ({ name: r.name, developerName: r.developerName, id: r.recordTypeId }));

  // Verify each configured field actually exists
  const F = config.sf.fields;
  const verdict = {};
  for (const [key, fieldName] of Object.entries(F)) {
    const exists = meta.fields.some(f => f.name === fieldName);
    verdict[key] = { configured: fieldName, exists };
  }

  const schema = {
    object: "Contact",
    instanceUrl: conn.instanceUrl,
    discoveredAt: new Date().toISOString(),
    customFieldCount: customFields.length,
    customFields,
    picklists: picks,
    recordTypes: rts,
    envVerdict: verdict,
  };

  const outPath = path.join(__dirname, "..", ".schema.json");
  await fs.writeFile(outPath, JSON.stringify(schema, null, 2));

  console.log("\n=== Contact schema ===");
  console.log(`  Custom fields: ${customFields.length}`);
  console.log(`  RecordTypes:   ${rts.map(r => r.name).join(", ") || "—"}`);
  for (const [k, v] of Object.entries(picks)) {
    console.log(`  ${k} values:`, v.slice(0, 10).join(" | ") + (v.length > 10 ? " …" : ""));
  }

  console.log("\n=== .env field-name verdict ===");
  let problems = 0;
  for (const [key, v] of Object.entries(verdict)) {
    const icon = v.exists ? "✓" : "✗";
    console.log(`  ${icon} ${key.padEnd(20)} -> ${v.configured}${v.exists ? "" : "   MISSING — find the real API name and override in .env"}`);
    if (!v.exists) problems++;
  }

  console.log(`\nFull schema written to ${outPath}`);
  if (problems > 0) {
    console.log(`\n⚠  ${problems} configured field(s) don't exist in this org. Open ${outPath},`);
    console.log("   find the right API names under \"customFields\", and override them in .env via");
    console.log("   the SF_FIELD_* vars before running any kickoff.");
    process.exit(2);
  }
  console.log("\n✓ All configured fields exist. You're cleared to run kickoff:preapproval in DRY_RUN.");
  process.exit(0);
})();
