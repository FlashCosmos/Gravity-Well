# Gravity Well

Cost-tiered model routing for Claude Code, built by FlashCosmos.

Gravity Well spreads a task across model tiers instead of running everything through one model: the top-tier strategist spends a few thousand tokens on planning and review — where deep reasoning actually pays off — while the bulk token output of implementation is routed to whichever cheaper tier matches the work's difficulty. The result is meaningfully lower token spend with no drop in output quality — the expensive reasoning goes into the reasoning, not into typing out code.

**New to Claude Code plugins?** See [GETTING_STARTED.md](GETTING_STARTED.md) for a no-experience-required walkthrough.

## How it works

| Stage | Agent | Model | Role |
|---|---|---|---|
| Plan / review / audit | `gravity-well:strategist` | Fable | Produces a stepwise plan (with acceptance criteria and a recommended tier) before work starts, then audits the result afterward. |
| Implement | `gravity-well:implementer` | Sonnet | Default execution tier for standard work. Signals overload by starting its reply with `ESCALATE:`. |
| Escalate | `gravity-well:heavy-implementer` | Opus | Reserved for complex, high-stakes, or stalled implementation work. |

The bundled `model-routing` skill teaches the main session when to route (and, just as important, when a task is too small to be worth the handoff), and the `/gravity-well:orchestrate <task>` command runs the whole pipeline end to end on demand.

If a `deepseek` MCP server is already registered on the machine, the bundled skill will also suggest it for large, mechanical, multi-file edits. That integration is optional — nothing changes if the server isn't present.

## Installation

**Terminal (`claude` CLI):**

```
/plugin marketplace add FlashCosmos/Gravity-Well
/plugin install gravity-well@flashcosmos-plugins
```

**VSCode extension:** `/plugin` opens a *Manage Plugins* panel instead of taking inline arguments — typing the commands above as a single line returns "`/plugin` isn't available in this environment." Instead: type `/plugin` alone, open the **Marketplaces** tab, enter `FlashCosmos/Gravity-Well` and click **Add**, then switch to the **Plugins** tab and install `gravity-well` from there.

Agents and the routing skill are namespaced automatically and are available immediately after install — nothing else to configure.

### Workflow template

Claude Code plugins can't yet bundle a runnable Workflow script directly, so `plugins/gravity-well/templates/gravity-well.workflow.js` needs a one-time copy per machine:

```
cp plugins/gravity-well/templates/gravity-well.workflow.js ~/.claude/workflows/gravity-well.js
```

Run it with a task description as `args` via the Workflow tool, e.g. `{ name: "gravity-well", args: "add pagination to the users list endpoint" }` — or just use `/gravity-well:orchestrate <task>`, which copies the template into place on first use and then invokes it for you.

The pipeline chains Plan (Fable) → Implement → Review (Fable). The strategist classifies each task as `standard` or `heavy` up front: standard work runs on Sonnet, heavy work starts directly on Opus with no wasted first attempt. All stage handoffs use structured output (JSON schemas), so escalation is an explicit `needs_escalation` status from the implementer rather than keyword-matching on prose. The reviewer audits the actual working tree (`git diff`), not the implementer's self-report, and if it rejects the result the findings go back to the implementing tier for one bounded fix round before anything is surfaced to you.

## Customizing

Tailor which model handles which kind of work by editing:

| To change | Edit |
|---|---|
| Which model handles a tier | `model:` in the relevant `plugins/gravity-well/agents/*.md` |
| Routing logic, or how DeepSeek is treated | `plugins/gravity-well/skills/model-routing/SKILL.md` |
| An agent's instructions | The body of `plugins/gravity-well/agents/*.md` |
| Workflow phases, escalation, or fix rounds (`MAX_FIX_ROUNDS`) | `plugins/gravity-well/templates/gravity-well.workflow.js` (re-copy after editing) |
| The `/gravity-well:orchestrate` command | `plugins/gravity-well/commands/orchestrate.md` |
| Metadata or version | `plugins/gravity-well/.claude-plugin/plugin.json` |

Validate changes with `claude plugin validate ./plugins/gravity-well` and bump `version` before publishing. To try changes locally before pushing:

```
/plugin marketplace add /path/to/local/clone
/plugin install gravity-well@flashcosmos-plugins
```

(In the VSCode extension, paste the local path into the **Marketplaces** tab's input field instead.)

## Compatibility

Gravity Well is additive by design: it ships no `settings.json` and never edits a project's `CLAUDE.md`. Where its routing guidance conflicts with a project's own instructions, the project wins.

## Repository layout

```
.claude-plugin/marketplace.json      Marketplace manifest
plugins/gravity-well/
  .claude-plugin/plugin.json         Plugin manifest
  agents/                            strategist, implementer, heavy-implementer
  commands/                          /gravity-well:orchestrate
  skills/model-routing/              Routing guidance
  templates/                         Workflow script template
```

This repo doubles as its own marketplace so it can be installed with a single `/plugin marketplace add`. To add another plugin alongside Gravity Well later, create `plugins/<name>/` and register it in `.claude-plugin/marketplace.json`.
