# Theme Day Call Automation — Runbook

Repo-resident automation that turns each CORE Theme Day into an executable
PhoneBurner dial set + Salesforce activity loop, with AI-drafted SMS/email
queued for one-click approval.

## What it does today
- **Monday 06:00 PT** — Build realtor Power Hour list (30 = 10 top + 20 rotation),
  enrich with public production data (Firecrawl → Realtor.com/ListReports/etc.),
  verify phones (Twilio) and emails (NeverBounce), push to PhoneBurner, write
  scoring back to Salesforce.
- **Wednesday 07:30 PT** — Build Chris's 10-PA dial set; **draft** 8 AM checklist
  emails to Zak / Jennifer / Toni with their assigned PAs (name, phone, email,
  active agent + agent phone, last touch). Chris reviews + sends the drafts.
- **Wednesday 17:00 PT** — EOD enforcement. Any PA on a checklist without a
  last-touch update gets an auto-Task on the assignee's queue.
- **Call disposition webhook** — PhoneBurner posts to `/webhooks/phoneburner`:
  - Connected → write transcript-derived note to Salesforce `Last_Touch__c`,
    create follow-up Tasks from rule-based transcript scan.
  - VM / No Answer → stage value-based SMS + email drafts for one-click send.
  - Bad Number → flag + Task to skip-trace.
  - DNC / Not Interested → log + remove from rotation.

## Stack
- **Node 22**, ESM.
- **jsforce** for Salesforce.
- **PhoneBurner REST 1/** with OAuth2 refresh-token flow.
- **Firecrawl** for realtor production enrichment.
- **Twilio Lookup** + **NeverBounce** + **Smarty** for data quality.
- **Microsoft Graph** (Outlook) for email send/draft.
- **node-cron** for the daily schedule.
- **Express** for the webhook server.

## Setup
1. `cp .env.example .env` and fill in the keys you have. Run with `DRY_RUN=true`
   on first pass — it logs every outbound action without actually writing.
2. Install deps: `npm install`.
3. **Salesforce Connected App** — create one in SF setup with `refresh_token`
   and `api` scopes. Capture `SF_CLIENT_ID`, `SF_CLIENT_SECRET`. Generate a
   refresh token via OAuth web flow once and stash it in `SF_REFRESH_TOKEN`.
4. **PhoneBurner OAuth** — sign in to your developer dashboard, create an app,
   capture client id/secret, run the OAuth flow once to get a refresh token.
   Add the webhook URL (`PB_WEBHOOK_URL`) under Account → Integrations.
5. **Microsoft Graph** — register an app in Entra ID, grant `Mail.Send` and
   `Mail.ReadWrite` (application permissions), grant admin consent.
6. **Enrichment** — keys for Firecrawl, Twilio, NeverBounce, Smarty.

## Running locally
```bash
# webhook + easy-button server
npm run automation:server

# scheduled jobs
npm run automation:cron

# manual kickoffs
npm run kickoff:preapproval   # Wed PA dial set + assignee drafts
npm run kickoff:realtors      # Mon Power Hour list
npm run eod:enforce           # 5pm last-touch check
```

## Tomorrow morning's kickoff (first live run)
Tomorrow = Wednesday Pre-Approval Theme Day.

1. Confirm `.env` is populated and `DRY_RUN=false`.
2. ~06:45 PT: `npm run kickoff:preapproval`
3. Chris reviews the queued drafts in Outlook → sends to Zak/Jennifer/Toni.
4. PhoneBurner has the dial set "WED Pre-Approval <date>" ready.
5. 17:00 PT: `npm run eod:enforce` (or let cron do it).

## Salesforce custom fields to add (if not already there)
Field API names are configurable via `.env`. Defaults:
- `Last_Touch__c` (Text/Long) — system of record
- `Last_Theme_Day_Touch__c` (DateTime) — for EOD enforcement
- `Active_Realtor__c` (Lookup → Contact) — buyer's agent
- `Loan_Officer__c` (Lookup → User) — LO assigned (Chris/Zak/Jennifer)
- `PAS_Assigned__c` (Lookup → User) — PAS assigned (Toni etc.)
- `Realtor_Volume_12mo__c` (Currency) — public-records production
- `Capture_Rate__c` (Percent) — our share of their volume
- `Rotation_Pool__c` (Picklist: TOP10, POOL20)

## Webhook URL exposure
The PhoneBurner webhook needs a publicly reachable URL. Options:
- **Local dev:** `ngrok http 3001` or `cloudflared tunnel`.
- **Prod:** deploy `automation/server.js` to Render / Fly.io / Railway / a $5
  VPS. Keep `automation/cron.js` running on the same host.

## What's not built yet (intentionally — ship the high-pressure parts first)
- **Thursday clients with move-detection** — needs USPS NCOA (PAF + license,
  multi-week setup) or skip-trace vendor.
- **Friday Whale calls** — list comes from the `Whale Form` spreadsheet; not
  yet automated.
- **In-app approval dashboard** — drafts land in Outlook today; the React app
  can grow an approval queue UI in a follow-up.
- **Claude API summarization** — current transcript→follow-up logic is rule-
  based. Drop in an Anthropic API call once `ANTHROPIC_API_KEY` is provided.
