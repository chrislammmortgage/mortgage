# Claude Code + Notion MCP Playbook — Faster, Bulkier Migration

Use this path if you (or someone on the team) is comfortable running Claude Code locally and the **Notion AI playbook** is too slow for the volume of legacy tasks. This path is best for the bulk task-classification step; the schema build can be done either way.

---

## Setup (one-time, ~15 min)

1. **Install Claude Code** — `claude.ai/code` → desktop app or CLI.
2. **Get a Notion internal integration token:**
   - Notion → Settings → Connections → Develop or manage integrations → New integration.
   - Workspace: pick the one containing Agency OS Chris.
   - Capabilities: Read content, Update content, Insert content.
   - Copy the secret token.
3. **Share databases with the integration:**
   - In Agency OS Chris → top-right ••• → Connections → Add the integration.
   - Repeat in Team Lamm M1 (read access only — we won't write there).
4. **Add the Notion MCP server to Claude Code:**
   - In your Claude Code settings (or `~/.claude/settings.json`), add the official Notion MCP server with your token.
   - Restart Claude Code, confirm `notion__*` tools appear.

---

## Phase 1 — Build the schema (script-driven)

Open Claude Code in a new session, point it at this `notion-migration/` folder, and prompt:

> "Read `schema.md` in this folder. Using the Notion MCP server, create the five databases (Borrowers, Projects, Tasks, Meetings, Referral Partners) inside the Agency OS Chris workspace as children of a new page called `Mortgage Ops Hub`. Match property names, types, and select options exactly. Wire up all the cross-database relations as two-way. Then create the linked-database views on the home page per the schema. Print a summary of what you created with Notion URLs."

Claude Code will create everything in one pass. Spot-check the result in Notion. If anything's off, tell it what to fix — it's idempotent if you ask it to update by name.

---

## Phase 2 — Bulk migrate (the real win)

This is where Claude Code beats Notion AI. The task dumpster is probably hundreds of items. Claude Code can read all of them, classify each one against your new Projects/Borrowers/Partners, and write the new rows in minutes.

### 2.1 — Inventory

> "Use Notion MCP to list all databases and major pages in the Team Lamm M1 workspace. Print a table: name, item count, last edited, suggested target in the new schema."

Review the output. Tell it which sources to migrate.

### 2.2 — Migrate borrowers

> "Read every row from the [old Clients/Borrowers DB URL]. For each, create a row in the new Borrowers DB with field mapping per `schema.md`. Set Source System = `Team Lamm M1`. Preserve Original Created. Don't modify the source. Print any rows where mapping was ambiguous so I can review."

### 2.3 — Migrate tasks (with AI classification)

> "Read every task from [old Tasks DB URL]. For each:
> - Skip if status = Done and last edited > 90 days ago.
> - Try to classify into a Project (by keyword match to Projects DB names) and a Borrower (by name match). Use fuzzy matching but only set the relation if confidence is high; otherwise leave empty.
> - Create the new Task row, copy due date, assignee, original notes. Source = Migrated.
> - Don't delete the source.
> Print three lists at the end: (1) confidently classified, (2) needs review (low confidence), (3) skipped as stale."

Review list (2) by hand — should be small.

### 2.4 — Same pattern for Projects, Meetings, Referral Partners

Reference `schema.md` field maps. Claude Code handles each in one prompt.

### 2.5 — Historical Zoom meetings

If Zoom data lives outside Notion (e.g., in your Zoom account), use the Zoom Notion connector to pull recent meetings — easier than scripting it. Then run an AI pass to back-fill borrower/partner relations:

> "For every Meeting row in the new DB where Borrower and Referral Partner are both empty: read the attendees and meeting title, find a matching Borrower or Referral Partner, set the relation if confident."

---

## Phase 3 — Hand off to Notion Agents

Once data is in, switch to the **Notion AI playbook → Session 3** for ongoing automation. Claude Code is overkill for daily ops.

---

## When this path is worth it

- ✅ You have **>200 legacy tasks** to classify
- ✅ You want a one-time, scripted migration with a written log
- ✅ Someone on the team is comfortable in a terminal
- ❌ Skip if you have <100 items — the Notion AI playbook is faster end-to-end
