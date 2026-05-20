# Project Memory — MortgageOne / Core Themeday Call Automation

## Business context (verified)
- **Branch:** MortgageOne Inc. — NMLS #898812
- **Operator:** Chris Lamm, Branch Manager — NMLS #209221
- **Coaching system:** The CORE Training (Rick Ruby). The business is run on the
  CORE model: **Prospect → Build a Team → Accumulate Wealth**, executed through
  structured daily prospecting ("Core Themedays") and time-blocked call sets.
- **Loan products handled:** Conventional, FHA, FHA Streamline, VA, VA IRRRL.
- **Fee model (from `App.jsx`):** Branch fee schedule (Processing $1,195,
  Underwriting $1,295, Admin $250, etc.) + First American Title, CA Region 4
  tiered title/escrow. 36-month recoupment rule on streamline/IRRRL refis.
- **Existing asset:** `App.jsx` is a React/Vite "MortgageOne Advisor" client-facing
  calculator (loan comparison, fees, amortization, rent-vs-own, cost-of-waiting).

## CORE Theme Day model — VERIFIED (source: EA Manual + PAS SOP v3.0, Team Lamm Drive)
CORE Theme Day calls: **minimum 1 hr/day, calendar-blocked Green (Revenue)**.
Full playbook with scripts/templates: `docs/themeday-playbook.md`.

| Day | Theme | Who to call (Salesforce segment) | Objective |
|-----|-------|----------------------------------|-----------|
| Mon | **Power Hour** | All Realtors / referral partners | Revenue-generating realtor prospecting |
| Tue | **Update Calls** | Clients + buyers' agents currently in process (SF report: *Tuesday – Pipeline & Update Calls*; + manual HELOC/Reverse) | Status update to all parties on active files |
| Wed | **Pre-Approval Calls** | Pre-approved clients (home shopping) | Keep pre-approved buyers engaged; 7-day check-in SLA |
| Thu | **Past Client Calls** | Past clients. 1st Thu = Annual Reviews (prior-year closings, same month) · Prev-month closings · Top 50 PCs · HomeBot active | Retention / repeat / referral (CCR/PCR) |
| Fri | **Whale / VIP Calls** | Top VIPs, referral partners, whales (source: *Whale Form – Spring 2026.xlsx*) | Deepen highest-value relationships |

Key facts:
- CRM is **Jungo (on Salesforce)** + Encompass + Floify + Mortgage Coach. Calls dialed via **PhoneBurner**.
- Tuesday list is built from Chris's Encompass "Tuesday Pipeline Print" view, cross-checked vs Salesforce report *Tuesday – Pipeline & Update Calls*, then uploaded to PhoneBurner.
- Jungo stages: Lead → Lead Contacted → Nurturing → Pre-Qualified → Pre-Approved → In Contract → Closed.
- Notes must hit Jungo/Salesforce **same business day**; "last touch" note field is the system of record.
- Autonomy decision: **AI drafts; human approves** all emails/SMS/tasks before they fire.

## Integration landscape (verified in this environment)
- **PhoneBurner:** Used in-browser by Chris for dialing. The automation pushes
  pre-built dial sessions via REST API (OAuth2, base
  `https://www.phoneburner.com/rest/1/`) so each Theme Day list shows up ready
  to dial when he logs in. Webhook on call disposition still flows back to our
  service for SF logging.
- **Salesforce:** Production access is via a Connected App (jsforce + OAuth2
  refresh token). **Do not use the Zapier-backed `salesforce_find_record` MCP
  for anything that matters** — it's a different org/sandbox and gives a false
  signal of connectivity.
- **Email:** Microsoft Graph (Outlook) via a registered Entra ID app — direct
  Graph API, not Zapier. Drafts saved to Chris's actual mailbox.
- **Schema discovery:** `automation/scripts/discover-schema.js` introspects the
  org once creds are pasted, surfaces the real Contact custom-field names and
  picklist values (Group__c, Stage__c, Last_Touch__c, etc.) so we don't guess.

## Realtor identification (verified per user)
- Realtors live in Salesforce/Jungo identified by **`Group__c`** (values like
  *Realtor*, *A Realtor*, *Top Realtor*, *Realtor Partner*) — NOT RecordType.
- Realtor adapter in `automation/salesforce.js` tries Contact+Group →
  Account+Type → Jungo `Realtor__c` in that order.

## Public-records realtor intel sources (per user direction)
Try in order, merge best result: Realtor.com, ListReports, Homes.com, Zillow,
HomeBot, RETR. Implemented via Firecrawl scrape+extract; swap to Trestle/MLSGrid
API later when budget allows.

## PhoneBurner capabilities (updated)
- PhoneBurner now has **native recording + transcription** — we do NOT need
  Whisper/Deepgram bolted on. Webhook payload includes `transcript`.

## Working agreement
- Active dev branch: `claude/phone-call-automation-j4iVv`.
- Do not fabricate CORE Training proprietary content; mark unknowns as TBD.
- AI **drafts** all outbound emails/SMS/tasks; human approves before they fire.
- Pre-Approval kickoff runs Wednesdays (this week: tomorrow).
