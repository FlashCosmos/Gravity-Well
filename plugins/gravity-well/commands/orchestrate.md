---
description: Run a task through the full Gravity Well pipeline — Fable plans, Sonnet/Opus implements, Fable reviews
argument-hint: <task description>
---

Run this task through the Gravity Well cost-tiered pipeline:

**Task:** $ARGUMENTS

If no task was given above, ask the user what they want built before doing anything else.

**Ideal input:** for a non-trivial feature, the strongest task is a pointer to a finished design doc — e.g. "Implement the design in docs/design/<feature>.md; it's already decided, so verify it against the code and formalize a plan rather than re-litigating it." See `${CLAUDE_PLUGIN_ROOT}/templates/design-doc-template.md` for the shape such a doc should take. A one-line task string works fine for small changes; a design doc is what gets the best results on anything with real ambiguity.

## Pre-flight (do this before dispatching anything)

The pipeline edits real files, so:

1. **Confirm the project is a git repository.** If it isn't, warn the user and recommend `git init` + an initial commit first — proceed without one only if they explicitly say so.
2. **Check for uncommitted changes** (`git status`). If the tree is dirty, tell the user and recommend committing or stashing first so the pipeline's diff is cleanly reviewable and reversible — proceed on a dirty tree only with their explicit OK.
3. **Decide whether to scout.** Default is NO scout — the strategist exploring first-hand is the most accurate path. Enable scouting only when the territory is genuinely large or unfamiliar (rough guide: several hundred+ tracked files, or a codebase neither you nor the user knows). A quick `git ls-files | wc -l` settles it.

## Preferred path: the Workflow script

1. Sync the template — **always normalizing line endings**: a Windows checkout of the plugin can leave the template with CRLF, and the Workflow tool rejects CR bytes ("script contains control characters"). Copy with CRs stripped and compare against the stripped form, e.g.:
   ```
   mkdir -p ~/.claude/workflows && tr -d '\r' < "${CLAUDE_PLUGIN_ROOT}/templates/gravity-well.workflow.js" > /tmp/gw-template.js
   cmp -s /tmp/gw-template.js ~/.claude/workflows/gravity-well.js || cp /tmp/gw-template.js ~/.claude/workflows/gravity-well.js
   ```
   Tell the user if it was installed/refreshed. Exception: if the user has told you they deliberately customized their copy, ask before overwriting.
2. Invoke the Workflow tool **by `scriptPath`, not by `name`**, with the absolute path to the synced copy:
   `{ scriptPath: "<absolute path to ~/.claude/workflows/gravity-well.js>", args: { task: "<the task above>", scout: <true only if pre-flight step 3 said so> } }`
   By-name invocation has twice been observed failing with "script contains control characters" even when the file on disk is clean — the permission layer replays a stale copy captured at first resolution; `scriptPath` bypasses that path and works. **`args` must be a real JSON object in the tool call — never a JSON-encoded string.** (A stringified blob reaches the script as one opaque string: the task becomes JSON garbage and the scout flag is ignored.) When it completes, report the plan, what was implemented, whether it escalated to Opus, and the review verdict with any findings.
3. If even the `scriptPath` call is rejected with "script contains control characters", the synced file itself still has CR/tab bytes — verify with a byte count (e.g. `tr -dc '\r' < file | wc -c`), re-run the step 1 sync, and don't loop on identical retries.

## Fallback: chain the agents directly

If the Workflow tool is unavailable in this environment, run the same pipeline manually with the Agent tool:

1. If pre-flight said to scout, run the built-in `Explore` agent first to map the relevant territory, and include its map in every prompt below.
2. `gravity-well:strategist` — produce the plan, acceptance criteria, and recommended tier for the task.
3. `gravity-well:implementer` (or `gravity-well:heavy-implementer` if the plan recommended it) — pass the plan and acceptance criteria verbatim; subagents share none of your context. If the implementer's reply starts with `ESCALATE:`, re-dispatch to `gravity-well:heavy-implementer` with the plan plus the implementer's notes.
4. `gravity-well:strategist` — audit the result against the plan. If the verdict is `fix needed`, send the findings back to the implementing tier for one fix round, then surface anything still open to the user rather than looping.

Either way, finish by giving the user a plain summary: what was planned, what changed, how it was verified, and any findings that remain open.
