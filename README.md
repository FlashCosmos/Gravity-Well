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

The bundled `model-routing` skill teaches the main session when to route (and, just as important, when a task is too small to be worth the handoff).

If a `deepseek` MCP server is already registered on the machine, the bundled skill will also suggest it for large, mechanical, multi-file edits. That integration is optional — nothing changes if the server isn't present.

## Commands

There are really only **two things**: a design-first conversation (`brainstorm` → `design-doc`) that produces a spec, and **the pipeline** (`orchestrate`) that plans → implements → reviews. `implement` is not a third thing — it's shorthand that hands a finished design doc to `orchestrate` with the right framing already attached.

| Command | What it does | Writes files? |
|---|---|---|
| `/gravity-well:brainstorm` | Talks a feature over with you interactively. No coding, nothing written yet — just converges on the decisions. | No |
| `/gravity-well:design-doc` | Lists every decision reached in the conversation, confirms with you which doc(s) each belongs in, then writes the design doc(s) from the template. | Yes — `docs/design/<feature>.md` |
| `/gravity-well:implement <feature>` | Shorthand for `orchestrate`, pre-pointed at `docs/design/<feature>.md` with "this is already decided, verify against the code, don't re-litigate it." | Whatever the pipeline changes |
| `/gravity-well:orchestrate <task>` | The pipeline itself: plan (Fable) → implement (Sonnet/Opus) → review (Fable). Takes any task string — a design-doc pointer or a one-line ask. | Whatever the pipeline changes |

**When to use which:** a small, obvious change can skip straight to `/gravity-well:orchestrate <one-line task>`. Anything with real ambiguity — multi-user authority, security, non-obvious data-model decisions — should go through the full flow below instead, so the decisions get made deliberately before code gets written.

## The full flow

```
/gravity-well:brainstorm             talk it through — no code yet
        │
        ▼
/gravity-well:design-doc             confirm the decision list → write docs/design/<feature>.md
        │
        ▼
/gravity-well:implement <feature>    = /gravity-well:orchestrate "Implement docs/design/<feature>.md ..."
        │
        ▼
  plan → implement → review          Fable → Sonnet/Opus → Fable
```

1. **Switch to the strategist tier.** Run `/model fable` so the planning conversation happens on the top reasoning tier.
2. **Brainstorm.** Run `/gravity-well:brainstorm` and talk the feature over interactively with Fable — the tradeoffs, edge cases, and especially any authority/security surface. This is a real back-and-forth; land the decisions before writing anything down.
3. **Emit the design doc.** When you've converged, run `/gravity-well:design-doc`. Fable first lists every decision reached in the conversation and confirms with you which doc(s) they land in — so a multi-feature conversation can't get silently narrowed to its most recent thread — then writes the filled doc(s) using the plugin's template. Save it as `docs/design/<feature>.md` (or one file per feature if the decisions span more than one).
4. **Confirm it's ready.** Each doc must have zero `FILL:` markers left, Status set to "Ready for implementation", and an empty "Open questions" section. (`grep FILL: docs/design/<feature>.md` returning nothing is the quick check.)
5. **Hand it to the pipeline.** Run:

   ```
   /gravity-well:implement <feature>
   ```

   using just the filename stem — no `docs/design/` prefix, no `.md` — and it expands to a full `/gravity-well:orchestrate` call pointed at that doc.

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

Auto-update is **off by default** for git-backed marketplaces like this one, so already-installed users pull new releases manually.

**Terminal (`claude` CLI):** `/plugin marketplace update flashcosmos-plugins`, then restart Claude Code to activate the new version. Per-marketplace auto-update can also be flipped on from the `/plugin` panel to make future releases arrive at startup.

**VSCode extension:** the only method confirmed to actually update the installed version is a full uninstall and reinstall:

1. `/plugin` → **Plugins** tab → click the **trash icon** on `gravity-well@flashcosmos-plugins` to uninstall it.
2. Reinstall it the same way as [Installation](#installation) above.
3. Confirm it took: ask a fresh Claude Code session what version of Gravity Well is installed.

Version resolution here has three separate layers on disk — the marketplace's git clone, a versioned plugin cache, and `installed_plugins.json` (the actual pointer every session reads) — and a full reinstall is what reliably rewrites all three. **The Marketplaces tab's refresh icon, reloading the window, and toggling the plugin off/on were all tested and do not reliably update the installed version** — don't spend time on them. (`/reload-plugins` also does not exist as a command in the VSCode extension.)

The copied workflow file in `~/.claude/workflows/` doesn't update through the plugin system, but `/gravity-well:orchestrate` re-syncs it automatically whenever it differs from the plugin's template — you only need to re-copy manually if you invoke the Workflow tool directly without the command.

**Maintainers:** bump `version` in `plugin.json` on **every** release. Clients pin to the version string — new commits without a bump are silently ignored.

### Workflow template

Claude Code plugins can't yet bundle a runnable Workflow script directly, so `plugins/gravity-well/templates/gravity-well.workflow.js` needs a one-time copy per machine:

```
tr -d '\r' < plugins/gravity-well/templates/gravity-well.workflow.js > ~/.claude/workflows/gravity-well.js
```

(`tr -d '\r'` rather than plain `cp`: on Windows, git may check the template out with CRLF line endings, and the Workflow tool rejects scripts containing CR bytes — "script contains control characters". The repo's `.gitattributes` forces LF on fresh clones, but existing clones may still carry CRLF.)

Run it via the Workflow tool **by `scriptPath`** with `args` as a real object, e.g. `{ scriptPath: "~/.claude/workflows/gravity-well.js" (absolute path), args: { task: "add pagination to the users list endpoint" } }` — or just use `/gravity-well:orchestrate <task>`, which syncs the template into place and invokes it for you. (Invoking by `name` has been observed tripping a permission-layer bug that replays a stale copy of the script; `scriptPath` avoids it.)

The pipeline chains Plan (Fable) → Implement → Review (Fable). The strategist classifies each task as `standard` or `heavy` up front: standard work runs on Sonnet, heavy work starts directly on Opus with no wasted first attempt. All stage handoffs use structured output (JSON schemas), so escalation is an explicit `needs_escalation` status from the implementer rather than keyword-matching on prose. The reviewer audits the actual working tree (`git diff`) and runs the acceptance checks where runnable — it does not trust the implementer's self-report — and if it rejects the result the findings go back to the implementing tier for one bounded fix round before anything is surfaced to you.

**Optional Scout phase (off by default):** pass `args: { task: "...", scout: true }` to have Haiku map the relevant territory first; the strategist, implementer, and reviewer all reuse that map instead of re-discovering the same files. Scouting is deliberately not the default — the strategist exploring first-hand is the most accurate path, and the scout exists only for codebases large enough that raw exploration would drown the planner's context. `/gravity-well:orchestrate` makes this call for you during pre-flight (it also checks you're on a clean git tree before any files get touched).

### Design docs (best results on ambiguous features)

For a feature with real ambiguity — multi-user authority, security, non-obvious data-model decisions — settle the design *before* dispatching, using `/gravity-well:brainstorm` → `/gravity-well:design-doc` → `/gravity-well:implement <feature>` as walked through above. The template these commands write to — [`plugins/gravity-well/templates/design-doc-template.md`](plugins/gravity-well/templates/design-doc-template.md) — ships with full authoring instructions and a "no placeholders" readiness gate. Small changes don't need any of this — a one-line task string via `/gravity-well:orchestrate` is fine.

## Customizing

Tailor which model handles which kind of work by editing:

| To change | Edit |
|---|---|
| Which model handles a tier | `model:` in the relevant `plugins/gravity-well/agents/*.md` |
| Routing logic, or how DeepSeek is treated | `plugins/gravity-well/skills/model-routing/SKILL.md` |
| An agent's instructions | The body of `plugins/gravity-well/agents/*.md` |
| Workflow phases, escalation, or fix rounds (`MAX_FIX_ROUNDS`) | `plugins/gravity-well/templates/gravity-well.workflow.js` (re-copy after editing) |
| The design-doc template sections or instructions | `plugins/gravity-well/templates/design-doc-template.md` |
| The slash commands (`brainstorm`, `design-doc`, `implement`, `orchestrate`) | `plugins/gravity-well/commands/*.md` |
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
  commands/                          brainstorm, design-doc, implement, orchestrate
  skills/model-routing/              Routing guidance
  templates/                         Workflow script + design-doc template
```

This repo doubles as its own marketplace so it can be installed with a single `/plugin marketplace add`. To add another plugin alongside Gravity Well later, create `plugins/<name>/` and register it in `.claude-plugin/marketplace.json`.
