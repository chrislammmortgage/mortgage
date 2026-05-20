import { config, log } from "../config.js";
import * as sf from "../salesforce.js";
import * as enr from "../enrichment.js";
import * as pb from "../phoneburner.js";

/**
 * Thursday Past-Client kickoff.
 *  - 1st Thursday of month → Annual Reviews (prior-year closings, same month).
 *  - Other Thursdays      → Previous-month closings.
 *  - Optional move-detection (address + phone verification) before dialing.
 */
export async function runThursdayPastClientKickoff(deps = {}) {
  const {
    findPastClientsForThursday = sf.findPastClientsForThursday,
    verifyPhone = enr.verifyPhone,
    verifyAddress = enr.verifyAddress,
    createDialSession = pb.createDialSession,
  } = deps;

  log.info("Thursday Past-Client — kickoff");
  const { segment, records } = await findPastClientsForThursday({ limit: 20 });
  log.info({ segment, count: records.length }, "past clients pulled");

  const enriched = [];
  for (const c of records) {
    const phone = c.MobilePhone || c.Phone;
    const [pv, av] = await Promise.all([
      verifyPhone(phone),
      verifyAddress({
        street: c.MailingStreet, city: c.MailingCity,
        state: c.MailingState, zip: c.MailingPostalCode,
      }).catch(() => ({ valid: false })),
    ]);
    enriched.push({
      sfId: c.Id, firstName: c.FirstName, lastName: c.LastName, name: c.Name,
      phone: pv.e164 || phone, phoneValid: pv.valid, phoneType: pv.type,
      email: c.Email, addressValid: av.valid,
      addressVacant: av.vacant === true,
      lastTouch: c[config.sf.fields.lastTouch],
      closingDate: c.Closing_Date__c,
    });
  }

  // Skip vacant / invalid-phone records — flag for review instead of dialing
  const dialable = enriched.filter(e => e.phoneValid && !e.addressVacant);
  const flagged = enriched.filter(e => !e.phoneValid || e.addressVacant);

  const contacts = dialable.map(e => ({
    firstName: e.firstName, lastName: e.lastName, phone: e.phone, email: e.email,
    custom: {
      sf_id: e.sfId, theme: "THU_PAST_CLIENT", segment,
      closing_date: e.closingDate, last_touch: e.lastTouch,
    },
  }));

  const session = await createDialSession({
    name: `THU Past Client (${segment}) ${new Date().toISOString().slice(0, 10)} (${contacts.length})`,
    contacts,
    folderId: config.pb.folders.thu,
  });

  return { segment, dialable: dialable.length, flagged, session };
}
