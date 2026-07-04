---
name: model-routing
description: Guidance for delegating work across model tiers (Fable strategist, Sonnet/Opus implementers, optional DeepSeek bridge) to minimize token spend. Use when starting a non-trivial task, when deciding whether to plan before implementing, or when the user asks about model/cost strategy.
---

# Model routing

This is a cost-tiered delegation pattern for spreading work across model tiers instead of doing everything in the main session model:

1. **Plan/review/audit -> `gravity-well:strategist` (Fable).** Before starting non-trivial work, and again after it's done, hand off to the strategist subagent for planning and review.
2. **Default implementation -> `gravity-well:implementer` (Sonnet).** Once a plan exists (or the task is simple), hand off execution here.
3. **Escalate -> `gravity-well:heavy-implementer` (Opus).** Only when the default implementer stalls, or the task is clearly high-complexity/high-stakes up front.
4. **Bulk mechanical file work -> DeepSeek, if available.** If this machine has a `deepseek` MCP server registered (check for `run_deepseek_task`/`ask_deepseek` tools), prefer it for large mechanical multi-file edits, boilerplate generation, or summarizing large files, per any project-level DeepSeek delegation policy already in place. If no such tools are available, fall back to the implementer tier — do not treat this as an error.

This is additive guidance, not a replacement for existing project instructions (e.g. an existing CLAUDE.md's own delegation policy). If this guidance conflicts with project-specific instructions, the project's own CLAUDE.md wins — flag the conflict to the user rather than silently picking one.
