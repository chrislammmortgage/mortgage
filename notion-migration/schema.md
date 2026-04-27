# Notion Workspace Schema — Team Lamm M1 → Agency OS Chris

Target workspace: **Agency OS Chris** (already duplicated from the marketing Agency OS).
Source workspace: **Team Lamm M1** (read-only — nothing is deleted there).

Loan-level work stays outside Notion. This schema is for **business operations**: marketing, ops, coaching, client processes, meetings, and referral-partner relationships.

---

## Five core databases

1. **Borrowers** — people we serve (past, present, prospect)
2. **Projects** — anything multi-step: marketing, ops, coaching, client processes, AI/social
3. **Tasks** — atomic to-dos; can attach to a project, a borrower, a partner, or recur on a schedule
4. **Meetings** — Zoom-fed: client meetings, coaching calls, internal, partner calls
5. **Referral Partners** — realtors, builders, FAs, CPAs; with shared projects + recorded coaching calls

Existing **Agency OS Chris** databases (social, AI projects, marketing) stay where they are — Projects DB just gains a `Category` value to absorb them.

---

## 1. Borrowers

| Property | Type | Notes |
|---|---|---|
| Name | Title | |
| Co-borrower | Text | |
| Phone | Phone | |
| Email | Email | |
| Status | Select | Lead / Prospect / Active / Past Client / Inactive |
| Source | Select | Referral Partner / Repeat / Web / Personal / Other |
| Referral Partner | Relation → Referral Partners | Who sent them |
| Last Touch | Date | Manually or formula-driven from latest meeting |
| Next Action | Text | One-liner |
| Tasks | Relation → Tasks (rollup count of open) | |
| Meetings | Relation → Meetings | |
| Notes | Text / page body | |
| Source System | Select | Default `Team Lamm M1` for migrated rows |
| Original Created | Date | Preserve old created date on import |

### Borrower views
- **Active** — Status ∈ {Lead, Prospect, Active}, sorted Last Touch ↑
- **Touch Tracker** — sorted Last Touch ↑ (oldest first; who needs a call)
- **By Referral Partner** — grouped by Referral Partner

---

## 2. Projects

The Projects DB **replaces and absorbs** what Lucas set up under Agency OS Chris (social, AI). Existing project pages get a `Category` and stay put.

| Property | Type | Notes |
|---|---|---|
| Name | Title | |
| Category | Select | Marketing / Operations / Coaching / Client Process / AI & Social / Other |
| Status | Status | Idea / Planned / In Progress / On Hold / Done |
| Owner | Person | |
| Team | Multi-person | |
| Borrowers | Relation → Borrowers | If the project is a client process |
| Referral Partners | Relation → Referral Partners | If collaborative — this is how partners get "invited" to project pages |
| Start | Date | |
| Target Done | Date | |
| Priority | Select | P1 / P2 / P3 |
| Tasks | Relation → Tasks | |
| Meetings | Relation → Meetings | |
| Description | Text / page body | |

### Project views
- **Active Board** — Kanban by Status, filter Status ≠ Done
- **By Category** — grouped by Category (your social/AI projects show up here automatically)
- **Coaching Projects** — filter Category = Coaching (referral-partner shared work)
- **My Projects** — filter Owner = me

---

## 3. Tasks

Tasks attach to *something* (project, borrower, partner, meeting) **or** are standalone recurring.

| Property | Type | Notes |
|---|---|---|
| Name | Title | |
| Project | Relation → Projects | Optional |
| Borrower | Relation → Borrowers | Optional |
| Referral Partner | Relation → Referral Partners | Optional |
| Meeting | Relation → Meetings | Set when AI extracts task from meeting |
| Assignee | Person | |
| Due | Date | |
| Status | Status | Not Started / In Progress / Waiting / Done |
| Priority | Select | P1 / P2 / P3 |
| Recurrence | Select | None / Daily / Weekly / Biweekly / Monthly / Quarterly |
| Source | Select | Manual / Meeting / AI / Recurring / Migrated |
| Source System | Select | `Team Lamm M1` for migrated rows |
| Original Created | Date | |

> **Recurring tasks** — Notion doesn't auto-spawn recurring task instances natively. Two clean options:
> 1. Use Notion's **repeating database template** (set on Tasks DB → New → repeat schedule) — best built-in option.
> 2. A Notion Agent that scans `Recurrence ≠ None` weekly and creates the next instance.
>
> Pick option 1 for now; agent can replace later if needed.

### Task views
- **My Today** — Assignee = me, Due ≤ today, Status ≠ Done
- **My Week** — Assignee = me, Due this week
- **By Project** — grouped by Project
- **Inbox** — Project, Borrower, Partner all empty (un-categorized; clean these up)
- **Recurring** — Recurrence ≠ None

---

## 4. Meetings

Zoom connector pushes here. AI processes each meeting → summary + action items.

| Property | Type | Notes |
|---|---|---|
| Title | Title | |
| Date | Date | |
| Type | Select | Discovery / Client / Coaching Call / Internal / Referral Partner / Other |
| Attendees | Multi-person | Internal team |
| Guests | Text | External attendees by name |
| Borrower | Relation → Borrowers | |
| Referral Partner | Relation → Referral Partners | |
| Project | Relation → Projects | |
| Recording URL | URL | Zoom recording link |
| Transcript | Text / page body | |
| AI Summary | Text | Filled by Notion AI |
| Action Items Extracted | Checkbox | Flips true once AI has pulled tasks |
| Tasks | Relation → Tasks | |

### Meeting views
- **Inbox** — Action Items Extracted = unchecked (needs AI processing)
- **By Borrower** — grouped by Borrower
- **Coaching Calls** — Type = Coaching Call (recorded calls with referral partners — the coaching archive)
- **This Week** — Date within next 7 days

---

## 5. Referral Partners

| Property | Type | Notes |
|---|---|---|
| Name | Title | |
| Company | Text | |
| Type | Select | Realtor / Builder / Financial Advisor / CPA / Insurance / Other |
| Phone | Phone | |
| Email | Email | |
| Status | Select | Active / Coaching / Cold / Past |
| Shared Projects | Relation → Projects | Projects we work on together |
| Coaching Calls | Relation → Meetings | Filter view shows recorded coaching calls |
| Borrowers Referred | Relation → Borrowers | Rollup count |
| Last Touch | Date | |
| Notes | Text / page body | |

### Referral Partner views
- **Coaching Roster** — Status = Coaching, with embedded recent meeting
- **Active** — Status = Active
- **By Type** — grouped by Type

---

## Cross-database design choices

- **Single source of truth per relation:** A task has at most one of Project / Borrower / Partner as its primary anchor — pick the most specific. The other relations are "also touches."
- **Borrowers can repeat** — same person can have multiple loans over time, all tracked in the loan system outside Notion. Borrowers DB just keeps relationship state.
- **Referral partner "invites"** = adding them as a person/guest on the Project page, *and* relating them to the Project record. Notion guest access on the page is what gives them visibility.
- **Migration safety properties** — every database has `Source System` and `Original Created`. Old Team Lamm M1 stays untouched; we just *copy* into the new structure with provenance.

---

## Top-level dashboard page

Inside Agency OS Chris, build one home page with these linked-DB views:

1. **My Today** (Tasks)
2. **Active Projects** (Projects, Kanban by Status)
3. **Touch Tracker** (Borrowers, oldest Last Touch first)
4. **Meeting Inbox** (Meetings needing AI processing)
5. **Coaching Roster** (Referral Partners, Status = Coaching)

That's the daily driver — open one page, see everything that matters.
