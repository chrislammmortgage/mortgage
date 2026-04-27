# Notion Migration — Team Lamm M1 → Agency OS Chris

A focused, mortgage-business-flavored Notion setup for **operations, marketing, coaching, and client relationships**. Loan-level work stays outside Notion.

## What's here

| File | What it is |
|---|---|
| [`schema.md`](./schema.md) | The 5-database spec: Borrowers, Projects, Tasks, Meetings, Referral Partners |
| [`playbook-notion-ai.md`](./playbook-notion-ai.md) | No-code path — paste prompts into Notion AI |
| [`playbook-claude-code.md`](./playbook-claude-code.md) | Code path — Claude Code + Notion MCP, faster on bulk |
| [`migration-checklist.md`](./migration-checklist.md) | Verification steps before you call it done |

## Pick a path

- **<100 legacy tasks, 1–2 hours each session** → [Notion AI playbook](./playbook-notion-ai.md)
- **Hundreds of legacy items, want it scripted** → [Claude Code playbook](./playbook-claude-code.md)
- **Hybrid (recommended for speed):** Build the schema with Claude Code (15 min), let Notion AI handle ongoing automation (Session 3 of the Notion AI playbook).

## Non-negotiables

1. **Don't delete anything from Team Lamm M1.** The old workspace becomes a read-only archive.
2. **Don't disturb existing Agency OS Chris content** (social, AI projects). The new Projects DB absorbs them via the `Category` property.
3. **Pilot before rolling out** to Team M1 — one week solo, then add one teammate.

## What "done" looks like

- 5 databases live in Agency OS Chris under a `Mortgage Ops Hub` page
- Active borrowers, current projects, and unfinished tasks have been copied over with `Source System = Team Lamm M1` provenance
- Last 60 days of Zoom meetings are in the Meetings DB
- The Meeting Processor agent is running
- Daily Brief is hitting your inbox/Slack each morning
- You can open `Mortgage Ops Hub` and see today's work in one screen
