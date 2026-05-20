// Runs the in-memory smoke suite via HTTP. Same harness as automation/test/smoke.js
// but inline — no test runner needed. Returns JSON so it's mobile-checkable.
import { runWednesdayPreApprovalKickoff, runEodEnforcement }
  from "../automation/themedays/wednesday-preapprovals.js";
import { buildMondayRealtorList } from "../automation/themedays/monday-realtors.js";
import { handleDisposition } from "../automation/webhooks/disposition.js";

export default async function handler(req, res) {
  const results = [];

  // Stubs
  const fakePA = (assignedTo) => [{
    Id: `003fake${assignedTo}1`, Name: "Maria Gutierrez", FirstName: "Maria", LastName: "Gutierrez",
    Phone: "+15305551001", MobilePhone: "+15305551001", Email: "maria@example.com",
    Last_Touch__c: "2026-05-05 — VM left",
    Active_Realtor__c: { Name: "Jane Smith", Phone: "+15305552002" },
    Loan_Officer__c: { Email: assignedTo },
  }];
  const fakeRealtors = [
    { Id: "003r1", Name: "Jane Smith", FirstName: "Jane", LastName: "Smith",
      MobilePhone: "5305552002", Email: "jane@example.com",
      MailingCity: "Redding", MailingState: "CA", Group__c: "Top Realtor" },
  ];
  const sfDeps = {
    findRecentPreApprovals: async ({ assignedTo }) => fakePA(assignedTo || "chris@x.test"),
    findRealtorsWithReferralsLast12Mo: async () => ({ strategy: "Contact+Group=Realtor", records: fakeRealtors }),
    activeBusinessWithRealtor: async () => ({ leads: 1, preapprovals: 0, deals: 0 }),
    writeRealtorScoring: async () => ({ dryRun: true }),
    checkLastTouchedToday: async () => false,
    createTask: async () => ({ dryRun: true }),
    updateLastTouch: async () => ({ dryRun: true }),
    createNote: async () => ({ dryRun: true }),
  };
  const enrDeps = {
    enrichRealtorPublicProduction: async () => ({ source: "mock", deals_12mo: 24, volume_12mo: 12e6 }),
    verifyPhone: async (p) => ({ valid: !!p, type: "mobile", e164: p }),
    verifyEmail: async (e) => ({ valid: !!e, result: "valid" }),
  };
  const pbDeps = { createDialSession: async ({ contacts }) =>
    ({ dialsession_id: `t-${Date.now()}`, contact_ids: contacts.map((_,i) => `c${i}`) }) };
  const emails = [];
  const mailerDeps = { sendOrDraft: async ({ to, subject }) => {
    emails.push({ to, subject }); return { draftId: `d-${emails.length}` };
  } };

  async function check(label, fn) {
    try { const v = await fn(); results.push({ label, ok: true, info: v }); }
    catch (e) { results.push({ label, ok: false, error: e.message }); }
  }

  await check("Wed PA kickoff", async () => {
    emails.length = 0;
    const r = await runWednesdayPreApprovalKickoff({ ...sfDeps, ...pbDeps, ...mailerDeps });
    return { drafts: emails.length, dialsession: r.session?.dialsession_id };
  });
  await check("EOD enforcement", async () => {
    const r = await runEodEnforcement(
      { checklistRows: [{ sfId: "x", contactName: "Test", phone: "+1555", ownerEmail: "a@b" }] },
      sfDeps
    );
    return { missed: r.missed.length };
  });
  await check("Monday realtor list", async () => {
    const r = await buildMondayRealtorList({ rotationWeek: 0 }, { ...sfDeps, ...enrDeps, ...pbDeps });
    return { final: r.finalList.length };
  });
  await check("Disposition: Connected", async () => {
    const r = await handleDisposition({
      event: "call.completed", contact: { custom_data: { sf_id: "x", theme: "WED_PREAPPROVAL" } },
      disposition: "Connected", transcript: "Send the scenario.",
    }, { ...sfDeps, ...mailerDeps });
    return { action: r.action };
  });
  await check("Disposition: VM", async () => {
    const r = await handleDisposition({
      event: "call.completed",
      contact: { email_address: "x@y.test", custom_data: { sf_id: "x", theme: "MON_REALTOR" } },
      disposition: "VM",
    }, { ...sfDeps, ...mailerDeps });
    return { action: r.action };
  });

  const passed = results.filter(r => r.ok).length;
  res.status(passed === results.length ? 200 : 500).json({
    ok: passed === results.length,
    summary: `${passed}/${results.length} passed`,
    results,
  });
}
