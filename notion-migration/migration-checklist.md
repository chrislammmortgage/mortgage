# Migration Verification Checklist

Run through this before declaring the migration done. Don't skip — these are the gotchas that cause re-work.

## Schema integrity

- [ ] All 5 databases exist under `Mortgage Ops Hub` in Agency OS Chris
- [ ] Every property in `schema.md` is present with the correct type
- [ ] All select/status options match the spec (case-sensitive)
- [ ] All relations are **two-way** (changing one side updates the other)
- [ ] Linked-DB views on the home page render and filter correctly

## Data integrity

- [ ] Spot-check 10 random Borrower rows: name, phone, email, status look right
- [ ] Spot-check 10 random Tasks: project/borrower relation correct, due date preserved
- [ ] Confirm `Source System = Team Lamm M1` is set on all migrated rows
- [ ] Confirm `Original Created` dates are preserved (not just today's date)
- [ ] Tasks `Inbox` view (no relations) has a manageable count — triage it

## Old workspace untouched

- [ ] Open Team Lamm M1 → spot-check a few of the rows you migrated → original still there, unchanged
- [ ] No items in Team Lamm M1 have been deleted
- [ ] Add a banner/callout at the top of Team Lamm M1 home: "Archived as of [date]. Active workspace: Agency OS Chris."

## Existing Agency OS Chris content preserved

- [ ] Lucas's social/AI projects still exist as project rows under the new Projects DB
- [ ] Each one has `Category = AI & Social` (or appropriate value)
- [ ] No AI/social work was overwritten or duplicated

## Connectors + agents

- [ ] Zoom connector pushes new meetings into Meetings DB
- [ ] Recent (last 60 days) Zoom meetings are populated
- [ ] Calendar connector is wired (if used)
- [ ] Meeting Processor agent runs on a new test meeting → AI Summary populated, Action Items appear in Tasks
- [ ] Daily Brief delivers tomorrow morning

## Pilot

- [ ] Used solo for 1 week — schema feels right, no blockers
- [ ] One teammate added — they can find what they need in <30 seconds
- [ ] Then: full Team M1 rollout

## Stop signs (do NOT proceed if any of these)

- ❌ Two-way relations don't update both sides → fix relation config before migrating data
- ❌ Migrated rows show today's date as Original Created → migration script is wrong, fix and re-run
- ❌ Anything in Team Lamm M1 is missing or modified → halt, restore from Notion's page history
