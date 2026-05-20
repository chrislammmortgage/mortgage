import jsforce from "jsforce";
import { config, log } from "./config.js";

let _conn = null;

export async function sfConn() {
  if (_conn) return _conn;
  if (!config.sf.clientId || !config.sf.refreshToken) {
    throw new Error("Salesforce creds missing — set SF_CLIENT_ID/SF_REFRESH_TOKEN");
  }
  const conn = new jsforce.Connection({
    oauth2: {
      loginUrl: config.sf.loginUrl,
      clientId: config.sf.clientId,
      clientSecret: config.sf.clientSecret,
    },
    instanceUrl: config.sf.instanceUrl,
    refreshToken: config.sf.refreshToken,
  });
  conn.on("refresh", (accessToken) => {
    log.debug("Salesforce access token refreshed");
  });
  await conn.identity(); // forces token refresh
  _conn = conn;
  return conn;
}

export async function soql(query) {
  const conn = await sfConn();
  log.debug({ query }, "soql");
  const r = await conn.query(query);
  let records = r.records;
  let nextUrl = r.nextRecordsUrl;
  while (nextUrl) {
    const more = await conn.queryMore(nextUrl);
    records = records.concat(more.records);
    nextUrl = more.nextRecordsUrl;
  }
  return records;
}

// Realtor model adapter — Realtors are identified by Group__c in this org.
// Falls through Contact → Account → Jungo Realtor__c.
export async function findRealtorsWithReferralsLast12Mo() {
  const conn = await sfConn();
  const F = config.sf.fields;

  const tries = [
    {
      label: "Contact+Group=Realtor",
      query: `SELECT Id, Name, FirstName, LastName, Email, MobilePhone, Phone,
        MailingState, MailingCity, AccountId, Group__c,
        ${F.realtorVolume12mo}, ${F.captureRate}, ${F.rotationPool}
        FROM Contact
        WHERE Group__c IN ('Realtor','A Realtor','Top Realtor','Realtor Partner')
        AND Id IN (
          SELECT ${F.activeRealtor} FROM Opportunity WHERE CreatedDate = LAST_N_DAYS:365
        )
        LIMIT 500`,
    },
    {
      label: "Account+Type=Realtor",
      query: `SELECT Id, Name, Phone, BillingState, ${F.realtorVolume12mo},
        ${F.captureRate}, ${F.rotationPool}
        FROM Account
        WHERE Type IN ('Realtor','Realtor Partner')
        AND Id IN (SELECT AccountId FROM Opportunity WHERE CreatedDate = LAST_N_DAYS:365)
        LIMIT 500`,
    },
    {
      label: "Jungo Realtor__c",
      query: `SELECT Id, Name, Email__c, Phone__c, ${F.realtorVolume12mo},
        ${F.captureRate}, ${F.rotationPool}
        FROM Realtor__c
        WHERE Id IN (SELECT Realtor__c FROM Loan__c WHERE CreatedDate = LAST_N_DAYS:365)
        LIMIT 500`,
    },
  ];

  for (const t of tries) {
    try {
      const r = await conn.query(t.query);
      if (r.totalSize > 0) {
        log.info({ strategy: t.label, count: r.totalSize }, "realtor query matched");
        return { strategy: t.label, records: r.records };
      }
    } catch (e) {
      log.debug({ strategy: t.label, err: e.errorCode || e.message }, "realtor strategy miss");
    }
  }
  throw new Error("No realtor query strategy matched — confirm SF data model");
}

// Count active business with a given realtor: leads/PAs/deals where they're the Active_Realtor
export async function activeBusinessWithRealtor(realtorContactId) {
  const F = config.sf.fields;
  const q = `SELECT Stage__c, COUNT(Id) cnt FROM Contact
    WHERE ${F.activeRealtor} = '${realtorContactId}'
    AND Stage__c IN ('Lead','Lead Contacted','Pre-Qualified','Pre-Approved','In Contract')
    AND CreatedDate = LAST_N_DAYS:120
    GROUP BY Stage__c`;
  const rows = await soql(q);
  const counts = { leads: 0, preapprovals: 0, deals: 0 };
  for (const r of rows) {
    if (r.Stage__c === "Lead" || r.Stage__c === "Lead Contacted") counts.leads += r.cnt;
    else if (r.Stage__c === "Pre-Qualified" || r.Stage__c === "Pre-Approved") counts.preapprovals += r.cnt;
    else if (r.Stage__c === "In Contract") counts.deals += r.cnt;
  }
  return counts;
}

export async function findRecentPreApprovals({ limit = 10, assignedTo = null } = {}) {
  const F = config.sf.fields;
  const where = [
    `(Stage__c = 'Pre-Approved' OR Stage__c = 'Pre-Qualified')`,
    assignedTo ? `${F.loAssigned}__r.Email = '${assignedTo.replace(/'/g, "\\'")}'` : null,
  ].filter(Boolean).join(" AND ");
  const q = `SELECT Id, Name, Phone, Email, MobilePhone,
    ${F.activeRealtor}__r.Name, ${F.activeRealtor}__r.Phone,
    ${F.loAssigned}__r.Email, ${F.lastTouch}
    FROM Contact
    WHERE ${where}
    ORDER BY ${F.lastTouch} ASC NULLS FIRST
    LIMIT ${limit}`;
  return soql(q);
}

export async function findClients({ limit = 1000 } = {}) {
  return soql(`SELECT Id, Name, FirstName, LastName, MailingStreet, MailingCity,
    MailingState, MailingPostalCode, Email, MobilePhone, Phone, npe01__HomeEmail__c,
    Closing_Date__c
    FROM Contact WHERE Group__c = 'Client' LIMIT ${limit}`);
}

// Thursday — Past clients to call this week.
// Segments per PAS SOP §EA Manual §3:
//   1st Thursday of month → Annual Reviews (closings prev year, same month).
//   Other Thursdays → previous-month closings, then Top 50 PCs.
export async function findPastClientsForThursday({ limit = 20 } = {}) {
  const today = new Date();
  const firstThu = isFirstThursdayOfMonth(today);
  const month = today.getMonth() + 1;
  const lastYear = today.getFullYear() - 1;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevMonthYear = month === 1 ? lastYear : today.getFullYear();
  const F = config.sf.fields;
  const base = `SELECT Id, Name, FirstName, LastName, Email, MobilePhone, Phone,
    MailingStreet, MailingCity, MailingState, MailingPostalCode, Closing_Date__c,
    ${F.lastTouch}`;
  if (firstThu) {
    const q = `${base} FROM Contact
      WHERE Group__c = 'Client' AND CALENDAR_YEAR(Closing_Date__c) = ${lastYear}
      AND CALENDAR_MONTH(Closing_Date__c) = ${month}
      ORDER BY ${F.lastTouch} ASC NULLS FIRST LIMIT ${limit}`;
    return { segment: "annual_review", records: await soql(q) };
  }
  const q = `${base} FROM Contact
    WHERE Group__c = 'Client' AND CALENDAR_YEAR(Closing_Date__c) = ${prevMonthYear}
    AND CALENDAR_MONTH(Closing_Date__c) = ${prevMonth}
    ORDER BY ${F.lastTouch} ASC NULLS FIRST LIMIT ${limit}`;
  return { segment: "prev_month_closings", records: await soql(q) };
}

function isFirstThursdayOfMonth(d) {
  return d.getDay() === 4 && d.getDate() <= 7;
}

export async function updateLastTouch(contactId, note) {
  if (config.dryRun) {
    log.info({ contactId, note }, "[DRY_RUN] updateLastTouch");
    return { id: contactId, dryRun: true };
  }
  const conn = await sfConn();
  const F = config.sf.fields;
  const today = new Date().toISOString();
  return conn.sobject("Contact").update({
    Id: contactId,
    [F.lastTouch]: `${today.slice(0, 10)} — ${note}`,
    [F.themeDayTouch]: today,
  });
}

export async function createTask({ whoId, subject, description, dueDate, ownerEmail }) {
  if (config.dryRun) {
    log.info({ whoId, subject, ownerEmail }, "[DRY_RUN] createTask");
    return { dryRun: true };
  }
  const conn = await sfConn();
  let ownerId = null;
  if (ownerEmail) {
    const u = await conn.query(
      `SELECT Id FROM User WHERE Email = '${ownerEmail.replace(/'/g, "\\'")}' LIMIT 1`
    );
    ownerId = u.records[0]?.Id;
  }
  return conn.sobject("Task").create({
    WhoId: whoId,
    Subject: subject,
    Description: description,
    ActivityDate: dueDate,
    Status: "Not Started",
    Priority: "Normal",
    OwnerId: ownerId || undefined,
  });
}

export async function createNote(parentId, title, body) {
  if (config.dryRun) {
    log.info({ parentId, title }, "[DRY_RUN] createNote");
    return { dryRun: true };
  }
  const conn = await sfConn();
  return conn.sobject("ContentNote").create({ Title: title, Content: Buffer.from(body).toString("base64") })
    .then(n => conn.sobject("ContentDocumentLink").create({
      ContentDocumentId: n.id, LinkedEntityId: parentId, ShareType: "V",
    }));
}

export async function writeRealtorScoring(contactId, { volume12mo, captureRate, pool }) {
  if (config.dryRun) {
    log.info({ contactId, volume12mo, captureRate, pool }, "[DRY_RUN] writeRealtorScoring");
    return { dryRun: true };
  }
  const conn = await sfConn();
  const F = config.sf.fields;
  return conn.sobject("Contact").update({
    Id: contactId,
    [F.realtorVolume12mo]: volume12mo,
    [F.captureRate]: captureRate,
    [F.rotationPool]: pool,
  });
}

export async function checkLastTouchedToday(contactId) {
  const F = config.sf.fields;
  const r = await soql(`SELECT Id, ${F.themeDayTouch} FROM Contact WHERE Id = '${contactId}' LIMIT 1`);
  const ts = r[0]?.[F.themeDayTouch];
  if (!ts) return false;
  return new Date(ts).toDateString() === new Date().toDateString();
}
