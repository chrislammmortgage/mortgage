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

## Core Themeday model — TO BE COMPLETED
> The Spring 2026 Summit Workbook (The CORE Training) defines the specific
> Themeday schedule and call scripts. It could not be read automatically
> (different SharePoint tenant, auth-walled). Fill this in once the workbook
> content is provided. Capture per theme: which day, target audience/segment,
> call objective, script/talk track, email template, SMS template, follow-up task.

| Day | Theme | Who to call (SF segment) | Call objective | Email | SMS | Follow-up task |
|-----|-------|--------------------------|----------------|-------|-----|----------------|
| _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

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
