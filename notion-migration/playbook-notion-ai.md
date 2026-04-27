# Notion AI Playbook — No Code, Inside Notion

This is the recommended path. You stay in Notion, paste prompts into Notion AI / Notion's Agent, and let it build + migrate. Total time: **2–4 hours of active work over 2–3 sessions.**

> Before you start: open Agency OS Chris. Confirm Notion AI is on for your workspace and Zoom + Calendar connectors are live. Do **not** open Team Lamm M1 yet — we'll point Notion AI at it when we're ready.

---

## Session 1 — Build the schema (45 min)

Goal: stand up the five databases in Agency OS Chris.

### Step 1.1 — Create the home page

In Agency OS Chris, create a new page titled **`Mortgage Ops Hub`**. This is your daily driver.

### Step 1.2 — Build databases one by one

For each database, create a new full-page database inside `Mortgage Ops Hub`, then paste this prompt into Notion AI on that page (one at a time):

> **Borrowers prompt:**
> "Set up this database as `Borrowers` with these properties: Name (title), Co-borrower (text), Phone (phone), Email (email), Status (select: Lead, Prospect, Active, Past Client, Inactive), Source (select: Referral Partner, Repeat, Web, Personal, Other), Last Touch (date), Next Action (text), Source System (select: Team Lamm M1, Native), Original Created (date), Notes (text). Add views: Active (filter Status in Lead/Prospect/Active, sort Last Touch ascending), Touch Tracker (sort Last Touch ascending), and By Referral Partner (group by Referral Partner — we'll add the relation in a later step)."

Repeat for **Projects**, **Tasks**, **Meetings**, **Referral Partners** using the property lists in [`schema.md`](./schema.md).

### Step 1.3 — Wire up relations

After all five databases exist, run this single prompt in `Mortgage Ops Hub`:

> "Create these relations between my databases (two-way for each):
> - Borrowers ↔ Tasks
> - Borrowers ↔ Meetings
> - Borrowers ↔ Referral Partners (a borrower's source partner)
> - Projects ↔ Tasks
> - Projects ↔ Meetings
> - Projects ↔ Borrowers
> - Projects ↔ Referral Partners
> - Tasks ↔ Meetings
> - Tasks ↔ Referral Partners
> - Meetings ↔ Referral Partners
> - Referral Partners ↔ Borrowers (rollup of referrals)"

### Step 1.4 — Build the home dashboard

On `Mortgage Ops Hub`, add linked-database views (`/linked view`):

- **My Today** → Tasks, filter Assignee=me + Due ≤ today + Status ≠ Done
- **Active Projects** → Projects, Kanban by Status
- **Touch Tracker** → Borrowers, sort Last Touch ascending
- **Meeting Inbox** → Meetings, filter Action Items Extracted = unchecked
- **Coaching Roster** → Referral Partners, filter Status = Coaching

✅ End of Session 1: empty schema is live. Don't migrate data yet.

---

## Session 2 — Migrate from Team Lamm M1 (60–90 min)

Goal: copy useful content from Team Lamm M1 into the new structure. **Nothing gets deleted from the old workspace.**

### Step 2.1 — Inventory the old workspace

Open Team Lamm M1. In Notion AI, ask:

> "List every database and major page in this workspace. For each, give me: name, type (database or page), approximate item count, last edited date, and a one-line description of what it holds."

This tells you what you actually have. Save the output.

### Step 2.2 — Sort what to migrate

For each item from the inventory, label it as one of:
- **Migrate** — still useful, has a clear home in the new schema
- **Archive** — keep visible in old workspace, no migration
- **Skip** — outdated/irrelevant

You make these calls — don't let AI auto-decide.

### Step 2.3 — Migrate borrowers

Open the old Borrowers/Clients-equivalent database in Team Lamm M1. Paste:

> "For each row in this database, create a corresponding row in the `Borrowers` database in Agency OS Chris (path: Mortgage Ops Hub → Borrowers). Map fields: name → Name, any phone field → Phone, email → Email. Set Status to `Past Client` if no activity in 6+ months, else `Active`. Set Source System = `Team Lamm M1`. Set Original Created = the row's original created date. Copy any notes into the page body. Do NOT modify or delete the original row."

Spot-check 5 rows after it runs. If wrong, undo and refine the prompt.

### Step 2.4 — Migrate the task dumpster

This is the messiest part. Run this prompt against the old tasks database:

> "For each task in this database:
> 1. Read the task and any linked context.
> 2. Decide: is this still relevant (not done, not stale)? If stale, skip.
> 3. Create a corresponding row in the new `Tasks` database (Mortgage Ops Hub → Tasks).
> 4. Try to identify a Project, Borrower, or Referral Partner this task belongs to from the new databases. If found, set the relation. If not, leave relations empty — these will land in the Tasks `Inbox` view for me to triage.
> 5. Set Source = `Migrated`, Source System = `Team Lamm M1`, copy the original due date and assignee.
> 6. Do NOT delete the original task."

Then open the **Inbox** view of Tasks and triage what's left manually. Should be a fraction of the total.

### Step 2.5 — Migrate projects + meetings + partners

Same pattern — one prompt per source database, mapping to the matching target. Reference `schema.md` for property mapping.

### Step 2.6 — Pull in historical Zoom meetings

Once Zoom connector is live in Agency OS Chris, ask Notion AI:

> "Pull my last 60 days of Zoom meetings into the `Meetings` database. For each: set Title, Date, Recording URL. Try to match attendees to existing Borrowers or Referral Partners and set the relation. Default Type to `Client` if borrower matched, `Referral Partner` if partner matched, else `Internal`. Leave Action Items Extracted unchecked — we'll process them in the next step."

✅ End of Session 2: data is in the new structure. Old workspace is intact.

---

## Session 3 — Turn on the agents (30–60 min)

Goal: ongoing automation so this stays clean.

### Agent 1 — Meeting Processor

In Notion, create a new Agent (or saved AI block on the Meetings DB):

> "When a Meeting row has a transcript and Action Items Extracted is unchecked: write a 5-bullet summary into AI Summary, extract action items as new rows in Tasks (set Meeting relation, copy borrower/partner relations from the meeting, infer assignee, set Source=Meeting), then check Action Items Extracted."

### Agent 2 — Daily Brief

> "Every morning at 7am, post to my Slack/email a brief with: today's meetings (with borrower/partner names), my top 5 tasks by priority and due date, any project marked P1 in progress, and the 3 borrowers with the oldest Last Touch."

### Agent 3 — Stalled Project Watcher (optional)

> "Weekly, find Projects with Status = In Progress where the most recent task or meeting is more than 14 days old. Post the list to the Mortgage Ops Hub home page in a callout."

### Recurring tasks

For any task with Recurrence ≠ None, set up Notion's native repeating template (Tasks DB → New ▼ → set repeat schedule). Don't roll your own.

---

## Pilot before full rollout

Don't invite Team M1 yet. Run this for **one week solo**, then add one teammate, then expand. The schema almost certainly needs one or two tweaks once real work hits it.

When you do invite the team, share **`Mortgage Ops Hub`** as the entry point — they get all five DBs by relation. For referral partners, share individual Project pages as guests so they only see what they're invited to.
