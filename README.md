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

## How to run a feature through Gravity Well

The design-first flow, end to end. Use it for anything with real ambiguity — multi-user authority, security, non-obvious data-model decisions. (For a small, obvious change, skip straight to step 5 with a one-line task string.)

1. **Switch to the strategist tier.** Run `/model fable` so the planning conversation happens on the top reasoning tier.
2. **Talk the feature over.** Discuss it interactively with Fable — the tradeoffs, edge cases, and especially any authority/security surface. This is a real back-and-forth; land the decisions before writing anything down.
3. **Have Fable emit the design doc.** When you've converged, ask: *"emit our decision as a design doc using the template in `plugins/gravity-well/templates/design-doc-template.md`."* Fable writes the filled doc — so the reasoning that made the decisions also records them, with no transcription drift. Save it somewhere in your repo, e.g. `docs/design/<feature>.md`.
4. **Confirm it's ready.** The doc must have zero `FILL:` markers left, Status set to "Ready for implementation", and an empty "Open questions" section. (`grep FILL: docs/design/<feature>.md` returning nothing is the quick check.)
5. **Hand it to the pipeline.** Run:

   ```
   /gravity-well:orchestrate Implement the design in docs/design/<feature>.md; it's already decided — verify it against the code and formalize a plan, don't re-litigate the decisions.
   ```

   The pipeline plans (Fable) → implements (Sonnet, or Opus if warranted) → reviews (Fable), then hands you back the plan, what changed, whether it escalated, and the review verdict.

## Installation

**Terminal (`claude` CLI):**

```
/plugin marketplace add FlashCosmos/Gravity-Well
/plugin install gravity-well@flashcosmos-plugins
```

**VSCode extension:** `/plugin` opens a *Manage Plugins* panel instead of taking inline arguments — typing the commands above as a single line returns "`/plugin` isn't available in this environment." Instead: type `/plugin` alone, open the **Marketplaces** tab, enter `FlashCosmos/Gravity-Well` and click **Add**, then switch to the **Plugins** tab and install `gravity-well` from there.

Agents and the routing skill are namespaced automatically and are available immediately after install — nothing else to configure.

### Updating

Auto-update is **off by default** for git-backed marketplaces like this one, so already-installed users pull new releases manually:

- **Terminal:** `/plugin marketplace update flashcosmos-plugins`, then restart Claude Code to activate the new version.
- **VSCode extension:** `/plugin` → **Marketplaces** tab → click the **refresh icon** (circular arrows, next to the trash icon) on the `flashcosmos-plugins` row, then reload the window.
- In the terminal client, per-marketplace auto-update can also be flipped on from the `/plugin` panel to make future releases arrive at startup.

**If the version doesn't seem to change after that (VSCode):** the refresh icon updates the marketplace's cached source, but doesn't reliably force the *installed* plugin to resync from it — reloading the window alone isn't enough either. The fix: go to the **Plugins** tab and toggle `gravity-well` **off, then back on**. That forces a fresh resync and is the step that actually picks up the new version. (Note: `/reload-plugins` is not a real command in the VSCode extension — don't rely on it.)

The copied workflow file in `~/.claude/workflows/` doesn't update through the plugin system, but `/gravity-well:orchestrate` re-syncs it automatically whenever it differs from the plugin's template — you only need to re-copy manually if you invoke the Workflow tool directly without the command.

**Maintainers:** bump `version` in `plugin.json` on **every** release. Clients pin to the version string — new commits without a bump are silently ignored.

### Workflow template

Claude Code plugins can't yet bundle a runnable Workflow script directly, so `plugins/gravity-well/templates/gravity-well.workflow.js` needs a one-time copy per machine:

```
cp plugins/gravity-well/templates/gravity-well.workflow.js ~/.claude/workflows/gravity-well.js
```

Run it with a task description as `args` via the Workflow tool, e.g. `{ name: "gravity-well", args: "add pagination to the users list endpoint" }` — or just use `/gravity-well:orchestrate <task>`, which copies the template into place on first use and then invokes it for you.

The pipeline chains Plan (Fable) → Implement → Review (Fable). The strategist classifies each task as `standard` or `heavy` up front: standard work runs on Sonnet, heavy work starts directly on Opus with no wasted first attempt. All stage handoffs use structured output (JSON schemas), so escalation is an explicit `needs_escalation` status from the implementer rather than keyword-matching on prose. The reviewer audits the actual working tree (`git diff`) and runs the acceptance checks where runnable — it does not trust the implementer's self-report — and if it rejects the result the findings go back to the implementing tier for one bounded fix round before anything is surfaced to you.

**Optional Scout phase (off by default):** pass `args: { task: "...", scout: true }` to have Haiku map the relevant territory first; the strategist, implementer, and reviewer all reuse that map instead of re-discovering the same files. Scouting is deliberately not the default — the strategist exploring first-hand is the most accurate path, and the scout exists only for codebases large enough that raw exploration would drown the planner's context. `/gravity-well:orchestrate` makes this call for you during pre-flight (it also checks you're on a clean git tree before any files get touched).

### Design docs (best results on ambiguous features)

For a feature with real ambiguity — multi-user authority, security, non-obvious data-model decisions — settle the design *before* dispatching. Talk it over interactively with Fable (`/model fable`), then capture the decisions in a doc following [`plugins/gravity-well/templates/design-doc-template.md`](plugins/gravity-well/templates/design-doc-template.md) and hand the pipeline the doc's path instead of a one-line task. The template ships with full authoring instructions and a "no placeholders" readiness gate. Fable can emit the filled doc as the last step of the discussion, so the reasoning that made the decisions also writes them down. Small changes don't need this — a one-line task string is fine.

## Customizing

Tailor which model handles which kind of work by editing:

| To change | Edit |
|---|---|
| Which model handles a tier | `model:` in the relevant `plugins/gravity-well/agents/*.md` |
| Routing logic, or how DeepSeek is treated | `plugins/gravity-well/skills/model-routing/SKILL.md` |
| An agent's instructions | The body of `plugins/gravity-well/agents/*.md` |
| Workflow phases, escalation, or fix rounds (`MAX_FIX_ROUNDS`) | `plugins/gravity-well/templates/gravity-well.workflow.js` (re-copy after editing) |
| The design-doc template sections or instructions | `plugins/gravity-well/templates/design-doc-template.md` |
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
  templates/                         Workflow script + design-doc template
```

This repo doubles as its own marketplace so it can be installed with a single `/plugin marketplace add`. To add another plugin alongside Gravity Well later, create `plugins/<name>/` and register it in `.claude-plugin/marketplace.json`.
