---
name: model-routing
description: Guidance for delegating work across model tiers (Fable strategist, Sonnet/Opus implementers, optional DeepSeek bridge) to minimize token spend. Use when starting a non-trivial task, when deciding whether to plan before implementing, or when the user asks about model/cost strategy.
---

# Model routing

This is a cost-tiered delegation pattern for spreading work across model tiers instead of doing everything in the main session model:

1. **Plan/review/audit -> `gravity-well:strategist` (Fable).** Before starting non-trivial work, and again after it's done, hand off to the strategist subagent for planning and review. Its plans end with a `Recommended tier:` line — use it to pick the implementation agent.
2. **Default implementation -> `gravity-well:implementer` (Sonnet).** Once a plan exists (or the task is simple), hand off execution here.
3. **Escalate -> `gravity-well:heavy-implementer` (Opus).** When the strategist recommended it up front, when the implementer's reply starts with `ESCALATE:`, or after one failed implementer attempt. Don't retry the standard implementer twice on the same failure — escalate instead.
4. **Bulk mechanical file work -> DeepSeek, if available.** If this machine has a `deepseek` MCP server registered (check for `run_deepseek_task`/`ask_deepseek` tools), prefer it for large mechanical multi-file edits, boilerplate generation, or summarizing large files, per any project-level DeepSeek delegation policy already in place. If no such tools are available, fall back to the implementer tier — do not treat this as an error.

## When NOT to route

Routing has overhead — each subagent starts cold and re-reads whatever it needs. Skip the pattern and just do the work in the main session when:

- The task is a small, single-file edit or a quick fix you can see the whole shape of.
- The user is asking a question or thinking out loud — answering is the deliverable, there's nothing to dispatch.
- The task is mostly conversation with small bursts of code — the handoff costs more than it saves.

## Handoff rules

- **Subagents share none of your context.** Include everything they need in the prompt: full file paths, constraints, the complete plan, and acceptance criteria. A vague handoff wastes the cheaper tier's tokens on rediscovery.
- **Pass the strategist's plan to the implementer verbatim**, not a summary of it.
- **Watch for the escalation sentinel.** The implementer signals overload by starting its reply with `ESCALATE:` — when you see that prefix, re-dispatch to `gravity-well:heavy-implementer`, including the plan plus the implementer's notes about what it already changed.
- **Close the loop.** After implementation, send the result back to the strategist for audit; if it ends with `Verdict: fix needed`, route the findings back to the tier that implemented (one fix round, then surface remaining issues to the user rather than looping).

This is additive guidance, not a replacement for existing project instructions (e.g. an existing CLAUDE.md's own delegation policy). If this guidance conflicts with project-specific instructions, the project's own CLAUDE.md wins — flag the conflict to the user rather than silently picking one.
