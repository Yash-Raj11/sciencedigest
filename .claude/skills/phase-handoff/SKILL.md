---
name: phase-handoff
description: Load when the owner types /phase-handoff, at the end of each phase of docs/MASTER-PROMPT.md, or when the context is getting long and the work must continue in a fresh session. Updates the progress, handoff, evidence and build-log files, then prints a ready-to-paste Resume prompt.
---

# Phase handoff

The next session starts with no chat history. Everything it needs must be in the repository
when this skill finishes.

## Steps

1. **`docs/PROGRESS.md`**: tick what is done and proven. Leave unticked anything whose evidence
   has not been shown, and anything waiting on the owner at a ⏸ stop. Add a line under an item
   if it was left half-way, saying exactly where.
2. **`docs/HANDOFF.md`, "Where it stands"** (section 2): update the table, the totals line
   (unit, HTTP and browser tests; database assertions; mutations) and the deployment state.
   Do not rewrite the other sections unless a decision changed them.
3. **`docs/evidence/`**: save the latest raw output of every check that ran this phase
   (`unit-tests.txt`, `database-tests.txt`, `mutation-tests.txt`, and the phase's own files and
   screenshots). Raw output, not a summary.
4. **`docs/BUILD-LOG.md`**: one dated entry per decision made this phase, each with its reason.
   Note anything the owner still has to decide.
5. Run `npm run lint && npm run typecheck && npm test && npm run build`. Commit
   ("Phase N handoff: ..."), push, and confirm `git status` is clean and level with `origin/main`.
6. **Print the Resume prompt**, in a code block the owner can paste as is. Fill in the next
   unchecked item from `docs/PROGRESS.md`, word for word:

```text
Resume Science Digest. Read CLAUDE.md, docs/HANDOFF.md, docs/MASTER-PROMPT.md (including
its Amendments), docs/PROGRESS.md and the latest BUILD-LOG entries. Run git status and
git log --oneline -5. If the tree is not clean, tell me what is uncommitted before doing
anything. Then continue the master prompt from the first unchecked item in
docs/PROGRESS.md, with the same working rules and the same ⏸ stops.

Next unchecked item: <copy the item here>
Waiting on the owner: <what the last ⏸ stop asked for, or "nothing">
```

7. Tell the owner, in two or three plain lines: what was finished, what is next, and anything
   they must do before the next session (a hosted push to approve, concepts to review).
