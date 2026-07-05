<!--
================================================================================
GRAVITY WELL — DESIGN DOC TEMPLATE
================================================================================

WHAT THIS IS
  A one-page brief that captures the DECISIONS behind a feature so the Gravity
  Well pipeline can implement it. The strategist (Fable) reads this file, grounds
  it against your actual codebase, and turns it into a concrete plan with
  acceptance criteria — then Sonnet/Opus build it and Fable reviews it.

  It captures WHAT and WHY, not HOW. Do NOT write function signatures, file
  paths, or code here — the strategist maps your decisions to the real code
  itself, and guessing wrong just misleads it. Give it the decisions; let it
  find the code.

HOW TO USE IT (three steps)
  1. DISCUSS. Talk the feature over interactively with Fable (`/model fable`) —
     the tradeoffs, edge cases, and especially anything security- or
     authority-sensitive. This is a real back-and-forth, not a one-shot.
  2. FILL. When you've converged, fill in every section below. The cleanest way:
     ask Fable to do it — "emit our decision as a design doc using this
     template" — so the reasoning that produced the decisions also writes them
     down, with no transcription drift. Save it somewhere in the repo, e.g.
     `docs/design/<feature>.md`. Do NOT overwrite one shared "scratch" doc per
     feature — copy the template fresh each time so stale content can't leak in.
  3. HAND OFF. Point the pipeline at the finished doc:
       /gravity-well:orchestrate Implement the design in docs/design/<feature>.md.
       The design is already decided — verify it against the code and formalize
       a plan; do not re-litigate the decisions.

THE GOLDEN RULE — NO PLACEHOLDERS
  The strategist reads this file LITERALLY. Any leftover template text becomes a
  fake "decision" it plans around or, worse, invents content to fill. So:
    - Replace every `FILL:` marker below with real content.
    - Set Status to "Ready for implementation".
    - Empty the "Open questions" section — anything still there means the design
      isn't settled and isn't ready to hand off.
  READINESS CHECK: the finished doc must contain zero `FILL:` markers and no
  "Draft" status. If you can grep `FILL:` and get a hit, it's not ready.

  Delete this entire comment block when you fill the doc in — the strategist
  doesn't need the instructions, only the decisions.
================================================================================
-->

# Feature: FILL: one-line name of what's being built

**Status:** Draft _(change to "Ready for implementation" only when every section below is real and Open questions is empty)_

## Decision & scope
FILL: One short paragraph — what you're building and why. Then, just as
important, what is explicitly OUT of scope for this change. The out-of-scope list
is what stops the plan from sprawling beyond what you decided.

## Data model & source of truth
FILL: What state this feature introduces or touches, where it lives, and — for
anything multi-user or networked — who is AUTHORITATIVE over it (server? host?
each client?). This section is usually the crux; be explicit. If the feature is
purely local/UI with no shared state, say so in one line.

## Behavior rules
FILL: The logic as enumerated if/then branches, so nothing is left implicit.
Cover the normal path AND the fallbacks. For example:
  - If <condition A> → <result>.
  - If <condition B> → <result>.
  - If <the thing is missing / a player has no X> → <fallback result>.

## Constraints & non-goals
FILL: The rules the implementation must not violate — security ("state is
server-validated; clients cannot self-assign things they don't own"),
performance budgets, backward-compatibility, platform limits. Writing these as
explicit constraints is what lets the reviewer at the end of the pipeline check
the result against them. Also list any tempting-but-unwanted behaviors as
non-goals.

## Acceptance criteria
FILL: The observable checks that define "done" — tests that must pass, behaviors
a human can verify by driving the feature. The strategist will refine these, but
seeding them makes the whole pipeline aim at YOUR definition of done instead of
its guess. For example:
  - <Owner sees their own owned skin when override is on>.
  - <A player who owns nothing falls back to the host's deck>.
  - <A client cannot cause a skin it doesn't own to display>.

## Open questions
FILL: Anything genuinely undecided. THIS SECTION MUST BE EMPTY before handoff —
if something's here, finish deciding it with Fable first. Delete this heading's
body (leave it blank or write "None") when the design is settled.
