// Gravity Well pipeline: Plan (Fable) -> Implement (Sonnet, or Opus when warranted) -> Review (Fable).
// Copy to ~/.claude/workflows/gravity-well.js and invoke via the Workflow tool:
//   { name: 'gravity-well', args: 'add pagination to the users list endpoint' }

export const meta = {
  name: 'gravity-well',
  description: 'Route a task through Fable (plan/review) and Sonnet/Opus (implementation) to cut token spend',
  phases: [
    { title: 'Plan', detail: 'Fable produces a plan, acceptance criteria, and a difficulty call', model: 'fable' },
    { title: 'Implement', detail: 'Sonnet executes (Opus directly for heavy tasks), with structured escalation', model: 'sonnet' },
    { title: 'Review', detail: 'Fable audits the working tree against the plan; up to one fix round', model: 'fable' },
  ],
}

const task = typeof args === 'string' ? args.trim()
  : (args && typeof args.task === 'string') ? args.task.trim() : ''
if (!task) {
  throw new Error('gravity-well needs a task description, e.g. { name: "gravity-well", args: "add pagination to the users list endpoint" }')
}

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    plan: { type: 'string', description: 'Concrete stepwise implementation plan naming exact files and functions to touch, plus risks' },
    acceptance_criteria: { type: 'string', description: 'Observable checks that define done: tests that must pass, behavior to verify' },
    difficulty: { type: 'string', enum: ['standard', 'heavy'], description: 'heavy only if architecturally invasive, concurrency/security-sensitive, or high-stakes' },
  },
  required: ['plan', 'acceptance_criteria', 'difficulty'],
}

const IMPL_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['completed', 'needs_escalation'], description: 'needs_escalation only if the task proved far more complex or risky than the plan assumed and you stopped' },
    summary: { type: 'string', description: 'What was changed and how it was verified against the acceptance criteria' },
    files_changed: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string', description: 'If escalating: what you found, what you already changed, and why a stronger model should take over' },
  },
  required: ['status', 'summary'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['approve', 'fix_needed'] },
    summary: { type: 'string', description: 'One-paragraph audit conclusion' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['blocker', 'minor'] },
          file: { type: 'string' },
          issue: { type: 'string' },
        },
        required: ['severity', 'issue'],
      },
    },
  },
  required: ['verdict', 'summary', 'findings'],
}

phase('Plan')
const planned = await agent(
  `You are the strategist in a cost-tiered pipeline. Explore the codebase first (Read/Grep/Glob), then produce a concrete, stepwise implementation plan for the task below: name the exact files and functions to touch and call out risks. Do not write the implementation yourself. Also state acceptance criteria (the checks that define done) and classify difficulty: "standard" for ordinary work, "heavy" only if it is architecturally invasive, concurrency/security-sensitive, or high-stakes.\n\nTask: ${task}`,
  { model: 'fable', label: 'strategist:plan', schema: PLAN_SCHEMA }
)
if (!planned) throw new Error('Planning agent returned no result — cannot proceed without a plan')

phase('Implement')
let tier = planned.difficulty === 'heavy' ? 'opus' : 'sonnet'
if (tier === 'opus') log('Strategist classified the task as heavy — starting directly on Opus')

const implPrompt =
  `Implement this plan exactly, then verify your work against the acceptance criteria before reporting. ` +
  `If you determine the task is far more complex or risky than the plan assumed, stop and report status "needs_escalation" with notes on what you found and already changed — do not push through.\n\n` +
  `Task: ${task}\n\nPlan:\n${planned.plan}\n\nAcceptance criteria:\n${planned.acceptance_criteria}`

let impl = await agent(implPrompt, {
  model: tier,
  label: tier === 'opus' ? 'heavy-implementer' : 'implementer',
  schema: IMPL_SCHEMA,
})

let escalated = false
if (tier === 'sonnet' && (!impl || impl.status === 'needs_escalation')) {
  escalated = true
  tier = 'opus'
  log(impl
    ? `Implementer escalated: ${impl.notes || impl.summary}`
    : 'Implementer returned no result — escalating to Opus')
  impl = await agent(
    `The standard implementer could not finish this task. Take over and finish it. Inspect the working tree first (git diff, read the touched files) — the prior attempt may have left partial changes to build on or revert. Verify against the acceptance criteria before reporting.\n\n` +
    `Task: ${task}\n\nPlan:\n${planned.plan}\n\nAcceptance criteria:\n${planned.acceptance_criteria}\n\n` +
    `Prior attempt notes:\n${impl ? `${impl.summary}\n${impl.notes || ''}` : '(none — the prior agent did not return a result)'}`,
    { model: 'opus', label: 'heavy-implementer', schema: IMPL_SCHEMA }
  )
}
if (!impl) throw new Error('Implementation failed on both tiers — no result returned')

phase('Review')
const MAX_FIX_ROUNDS = 1
let review = null
for (let round = 0; ; round++) {
  review = await agent(
    `Audit this implementation against the original plan. Inspect the actual working tree — run git diff and read the changed files; do not trust the implementer's summary. Be skeptical: look for correctness bugs, security issues, unmet acceptance criteria, and scope creep. Mark each finding "blocker" or "minor".\n\n` +
    `Task: ${task}\n\nPlan:\n${planned.plan}\n\nAcceptance criteria:\n${planned.acceptance_criteria}\n\nImplementer's report:\n${impl.summary}`,
    { model: 'fable', label: 'strategist:review', phase: 'Review', schema: REVIEW_SCHEMA }
  )
  if (!review || review.verdict === 'approve' || round >= MAX_FIX_ROUNDS) break

  log(`Review found ${review.findings.length} issue(s) — sending back for a fix round`)
  const fixed = await agent(
    `A reviewer audited your team's implementation and found issues. Fix them, then verify against the acceptance criteria and report what you changed.\n\n` +
    `Task: ${task}\n\nPlan:\n${planned.plan}\n\nAcceptance criteria:\n${planned.acceptance_criteria}\n\n` +
    `Findings to fix:\n${review.findings.map(f => `- [${f.severity}] ${f.file ? f.file + ': ' : ''}${f.issue}`).join('\n')}`,
    { model: tier, label: 'implementer:fix', phase: 'Review', schema: IMPL_SCHEMA }
  )
  if (!fixed) break
  impl = fixed
}

return {
  task,
  difficulty: planned.difficulty,
  escalated,
  plan: planned.plan,
  acceptance_criteria: planned.acceptance_criteria,
  implementation: impl,
  review,
}
