# Core Theme Day Call Playbook — Team Lamm / MortgageOne Redding

Source of truth: CORE Theme Day model (EA Calendar SOP) + PAS SOP v3.0 scripts &
templates. This playbook turns each Theme Day into a repeatable, automatable
call set: **who to call → dial set → talk track → email → SMS → follow-up task →
Salesforce log**. All AI-generated email/SMS/tasks are **drafted for human
approval** before sending (per current autonomy decision).

Operating rules (apply every day):
- Theme call block is **Green / Revenue, minimum 1 hour**, calendar-protected.
- Every contact gets a **same-day note in the Jungo/Salesforce "last touch" field**.
- Disposition every call; set the next follow-up task before moving on.
- Never free-type referral source — use LT acronym codes.

---

## Monday — Power Hour (All Realtors)

**Objective:** Revenue-generating prospecting to realtors / referral partners.

**Who to call (Salesforce segment):** Active + target realtor partners. Pull
from Salesforce/Jungo contacts where type = Realtor/Referral Partner, sorted by
partner tier (A-tier first) and last-contact date (stalest first).

**Dial set build:** Salesforce query → contact list → PhoneBurner dial session
"MON – Power Hour <date>".

**Talk track (draft):**
> "Hey [AGENT], [YOUR NAME] with Chris Lamm's team at MortgageOne. Wanted to
> connect for a minute — what's in your world right now, anything you're working
> on we can help move? [LISTEN] We've got [rate/program hook]. Who do you have
> that we should be taking great care of this week?"

**Email draft (no answer / follow-up):** Subject: `Checking in — [AGENT FIRST]`
> "[AGENT] — missed you today. Chris wanted me to reach out and see what you've
> got coming up. We'd love to help your next buyer. Quick call this week?"

**SMS draft:** "Hi [AGENT], [YOUR NAME] w/ Chris Lamm's team — tried you re:
your upcoming buyers. Got 5 min this week? "

**Follow-up task logic:** Answered + opportunity → task "Send pre-qual / co-marketing,
[date+2]". No answer → retry next Power Hour; after 3 misses, flag for Chris.

---

## Tuesday — Update Calls

**Objective:** Proactive status update to every client and buyers' agent on an
active/in-process file.

**Who to call (verified process):**
1. Open Chris's Encompass → "Tuesday Pipeline Print" view → export.
2. Cross-check vs Salesforce report **Tuesday – Pipeline & Update Calls**.
3. Add HELOC / Reverse manually (don't appear on the report — pull from SF
   contact → Loans).
4. Verify with Pre-Approval/Loan Coordinators for accuracy before the morning meeting.

**Dial set build:** Validated list (clients + buyers' agents + sellers' agents)
→ PhoneBurner dial session "TUE – Update Calls <date>". Upload/refresh list in
PhoneBurner each Tuesday.

**Talk track (draft, client):**
> "Hi [FIRST], [YOUR NAME] from Chris Lamm's team with your weekly update.
> You're currently at [MILESTONE] — here's what's next: [NEXT STEP]. Anything
> you need from us? We'll talk again next week unless something changes sooner."

**Talk track (draft, agent):**
> "Hey [AGENT], weekly update on [BORROWER] — [STATUS]. Est. close still
> [DATE]. Anything you need from us?"

**Email draft:** Subject: `[CLIENT] — Weekly Update` — milestone, next step, ETA,
"reply with questions anytime."

**SMS draft:** "Hi [FIRST], weekly update from Team Lamm: you're at [MILESTONE],
next is [STEP]. Text back any questions!"

**Follow-up task logic:** Always set next Tuesday update task. If milestone
stalled >7 days → task to LO/processor. Doc outstanding → escalate per SLA.

---

## Wednesday — Pre-Approval Calls

**Objective:** Keep pre-approved, home-shopping buyers engaged (7-day check-in SLA).

**Who to call (Salesforce segment):** Jungo stage = **Pre-Approved**, not yet In
Contract. Sort by days since last touch (>7 days = priority).

**Dial set build:** SF query → PhoneBurner "WED – Pre-Approval <date>".

**Talk track (draft):**
> "Hi [FIRST], [YOUR NAME] from Chris Lamm's team. Checking in on the home
> search — see anything you like? [LISTEN] Reminder you're approved up to
> [AMOUNT] at roughly [PAYMENT]/mo. Want us to refresh numbers on anything?"

**Email draft:** Subject: `Still here for you, [FIRST]` — reaffirm approval
amount/payment, offer to re-run scenarios, agent intro if no agent.

**SMS draft:** "Hi [FIRST], [YOUR NAME] w/ Team Lamm — any homes catching your
eye? Happy to run payment #s anytime. "

**Follow-up task logic:** Found a home → task "Update pre-approval / notify agent".
No agent → task "Agent introduction". Cold 30 days → move to Nurturing + drip.

---

## Thursday — Past Client Calls

**Objective:** Retention, repeat business, referrals (CCR/PCR ask).

**Who to call (Salesforce segments, in priority order):**
- **1st Thursday of month:** Annual Reviews — prior-year closings that closed in
  the *same month* (e.g., May → call last May's closings).
- Previous month's closing list.
- Top 50 Past Clients.
- HomeBot active users (open HomeBot → call engaged contacts).

**Dial set build:** SF query per segment → PhoneBurner "THU – Past Client <date>".

**Talk track (draft, annual review):**
> "Hi [FIRST], [YOUR NAME] from Chris Lamm's team — it's been about a year since
> we closed your loan, time for your annual review. Rates/equity have moved —
> want Chris to run a quick no-pressure look? And who do you know we could help
> like we helped you?" (CCR/PCR ask — always)

**Email draft:** Subject: `Your annual mortgage review, [FIRST]` — equity/rate
update offer, referral ask, HomeBot link.

**SMS draft:** "Hi [FIRST], [YOUR NAME] w/ Team Lamm — time for your yearly
mortgage review. Want Chris to take a quick look? "

**Follow-up task logic:** Refi/equity interest → task to Chris/Zak per routing.
Referral given → create new lead + thank-you task. Always log CCR/PCR ask.

---

## Friday — Whale / VIP Calls

**Objective:** Deepen highest-value relationships (top VIPs, referral partners, whales).

**Who to call (source):** *Whale Form – Spring 2026.xlsx* + top referral partners.

**Dial set build:** Whale list → PhoneBurner "FRI – Whale/VIP <date>". Small,
high-touch list — quality over volume.

**Talk track (draft):**
> "Hey [NAME], [YOUR NAME] with Chris Lamm's team — no agenda, just wanted to
> check in on you. How's everything? [LISTEN/RELATIONSHIP] Anything on your
> radar where Chris can be helpful?"

**Email draft:** Personal, short, relationship-first. No template feel —
reference the specific relationship/last conversation.

**SMS draft:** "Hi [NAME], [YOUR NAME] here — thinking of you, hope all's well.
Around for a quick catch-up this week?"

**Follow-up task logic:** Always set a personal next-touch date. Opportunity →
route to Chris directly. Log relationship notes to last-touch field.

---

## Automation hooks (how each step maps to the system)

| Playbook step | System | Trigger / mechanism |
|---|---|---|
| Build today's list | Salesforce (Jungo) | Scheduled query per Theme Day segment (see `automation/themedays/*.js`) |
| Create dial set | PhoneBurner API | `POST dialsession` with contact array + custom_data carrying sf_id + theme |
| Stage email/SMS | Draft queue | Template rendered with live record → MS Graph draft → **human approves** → send |
| Run calls | PhoneBurner | Manual (browser dialer — SF record pops live) |
| Capture outcome | PhoneBurner webhook | 3 events: Call Begin / Call End / Contact Displayed (Call End carries disposition + transcript + recording) |
| Transcribe | PhoneBurner native | Transcripts now arrive in the webhook payload — no Whisper/Deepgram needed |
| Summarize → log | Claude API (Haiku) → Salesforce | `automation/summarizer.js` extracts snippet + follow-up tasks from transcript; falls back to rule scanner without `ANTHROPIC_API_KEY` |
| Set tasks | Salesforce | Follow-up Tasks parsed from call + per-day logic; EOD enforcement creates Tasks for any missed last-touch |

**Approval gate:** every outbound email/SMS and every AI-created task is queued
for one-click human review before it fires. v0.5: all assignee-bound drafts
route to Chris first with a banner showing the intended recipient.

## Where it runs

Deployed to **Vercel** as a Vite SPA + 9 serverless functions:

| Function | Purpose |
|---|---|
| `/api/health` | Env / readiness JSON |
| `/api/selftest` | Runs 7 in-memory smoke checks; returns 7/7 when green |
| `/api/briefing` | Mobile-friendly morning dashboard at `/briefing` |
| `/api/preview` | Renders any template (`?type=checklist\|preapproval\|realtor-vm\|past-client\|whale`) |
| `/api/diagnostics` | Live `?service=sf` or `?service=pb` whoami |
| `/api/cron` | Scheduled jobs by `?job=` — invoked by Vercel Cron (Mon 14:00, Wed 15:30, Wed EOD 01:00 next day, Thu 15:30, Fri 15:30 PT) |
| `/api/webhooks/phoneburner` | 3 PB events by `?event=call-end\|call-begin\|contact-displayed`. Full raw payload logged as `PB_CALL_END_RAW` etc. |
| `/api/oauth/salesforce/start` + `callback` | Captures SF refresh token from Connected App |

Static dashboard at `/setup.html`. PhoneBurner webhooks point at the
nice-URL form (`/api/webhooks/phoneburner/call-end`) which Vercel rewrites
to the query-param handler.
