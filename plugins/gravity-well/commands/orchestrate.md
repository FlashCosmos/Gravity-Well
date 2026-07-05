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

1. Check whether `~/.claude/workflows/gravity-well.js` exists.
2. If it exists, invoke the Workflow tool with `{ name: "gravity-well", args: { task: "<the task above>", scout: <true only if pre-flight step 3 said so> } }` and, when it completes, report the plan, what was implemented, whether it escalated to Opus, and the review verdict with any findings.
3. If it does not exist, copy `${CLAUDE_PLUGIN_ROOT}/templates/gravity-well.workflow.js` to `~/.claude/workflows/gravity-well.js` (creating the directory if needed), tell the user this one-time setup happened, then invoke the Workflow as in step 2.

## Fallback: chain the agents directly

If the Workflow tool is unavailable in this environment, run the same pipeline manually with the Agent tool:

1. If pre-flight said to scout, run the built-in `Explore` agent first to map the relevant territory, and include its map in every prompt below.
2. `gravity-well:strategist` — produce the plan, acceptance criteria, and recommended tier for the task.
3. `gravity-well:implementer` (or `gravity-well:heavy-implementer` if the plan recommended it) — pass the plan and acceptance criteria verbatim; subagents share none of your context. If the implementer's reply starts with `ESCALATE:`, re-dispatch to `gravity-well:heavy-implementer` with the plan plus the implementer's notes.
4. `gravity-well:strategist` — audit the result against the plan. If the verdict is `fix needed`, send the findings back to the implementing tier for one fix round, then surface anything still open to the user rather than looping.

Either way, finish by giving the user a plain summary: what was planned, what changed, how it was verified, and any findings that remain open.
