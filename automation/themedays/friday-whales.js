import { config, log } from "../config.js";
import * as sf from "../salesforce.js";
import * as pb from "../phoneburner.js";

/**
 * Friday Whale / VIP kickoff.
 *  - List comes from a Whale__c (or equivalent) tag, or a static SF report.
 *  - Small high-touch list — quality over quantity.
 */
export async function runFridayWhaleKickoff({ source = "salesforce" } = {}, deps = {}) {
  const {
    soql = sf.soql,
    createDialSession = pb.createDialSession,
  } = deps;

  log.info("Friday Whale — kickoff");

  const F = config.sf.fields;
  // Try the most likely shape first: a Contact-level Whale__c flag, or a
  // Group__c value of "Whale" / "VIP". Adapter pattern keeps it future-proof.
  let records = [];
  const tries = [
    `SELECT Id, Name, FirstName, LastName, Email, MobilePhone, Phone, ${F.lastTouch}
      FROM Contact WHERE Whale__c = true ORDER BY ${F.lastTouch} ASC NULLS FIRST LIMIT 25`,
    `SELECT Id, Name, FirstName, LastName, Email, MobilePhone, Phone, ${F.lastTouch}
      FROM Contact WHERE Group__c IN ('Whale','VIP','Top VIP')
      ORDER BY ${F.lastTouch} ASC NULLS FIRST LIMIT 25`,
  ];
  for (const q of tries) {
    try { records = await soql(q); if (records.length) break; }
    catch (e) { log.debug({ q, err: e.message }, "whale strategy miss"); }
  }
  if (!records.length) {
    log.warn("No Whale records found — falling back to Top Realtors by capture rate");
    records = await soql(`SELECT Id, Name, FirstName, LastName, Email, MobilePhone, Phone, ${F.lastTouch}
      FROM Contact WHERE ${F.rotationPool} = 'TOP10'
      ORDER BY ${F.captureRate} DESC NULLS LAST LIMIT 15`).catch(() => []);
  }

  const contacts = records.map(c => ({
    firstName: c.FirstName, lastName: c.LastName,
    phone: c.MobilePhone || c.Phone, email: c.Email,
    custom: { sf_id: c.Id, theme: "FRI_WHALE", last_touch: c[F.lastTouch] },
  }));

  const session = await createDialSession({
    name: `FRI Whale ${new Date().toISOString().slice(0, 10)} (${contacts.length})`,
    contacts, folderId: config.pb.folders.fri,
  });

  return { count: contacts.length, session };
}
