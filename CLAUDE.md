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
- **PhoneBurner:** REST API, OAuth2, base `https://www.phoneburner.com/rest/1/`.
  User has API access. Relevant endpoints: contacts, members, folders, content,
  `dialsession` (build a session from a contact array), call results, and
  webhook/callback on call disposition.
- **Salesforce:** Reachable here ONLY via MCP with two operations exposed —
  `salesforce_find_record` and `salesforce_create_note`. No native call-log /
  task / custom-field write is exposed through that MCP. The Salesforce CLI
  (`sf`) referenced by the user is on the user's own machine, not this container.
- **Email/Calendar:** Microsoft Outlook + Google Calendar MCP tools available
  (draft/send email, create events). Salesforce note creation available.
- **Network:** This hosted environment has a restrictive outbound policy
  (generic web fetches 403). A live automation that calls PhoneBurner/Salesforce
  needs to run where it has network + credentials (user machine or a server).

## Working agreement
- Active dev branch: `claude/phone-call-automation-j4iVv`.
- Do not fabricate CORE Training proprietary content; mark unknowns as TBD.
