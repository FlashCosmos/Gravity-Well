export const meta = {
  name: 'gravity-well',
  description: 'Route a task through Fable (plan/review) and Sonnet/Opus (implementation) to cut token spend',
  phases: [
    { title: 'Plan', detail: 'Fable produces a concrete implementation plan' },
    { title: 'Implement', detail: 'Sonnet executes; escalates to Opus if it reports being stuck' },
    { title: 'Review', detail: 'Fable audits the result against the plan' },
  ],
}

const task = args

phase('Plan')
const plan = await agent(
  `Produce a concrete, stepwise implementation plan for this task. Name exact files/functions to touch and call out risks. Do not write code yourself.\n\nTask: ${task}`,
  { model: 'fable', label: 'strategist:plan' }
)

phase('Implement')
let result = await agent(
  `Implement this plan exactly. If you determine the task is far more complex or risky than the plan assumed, say so explicitly instead of pushing through.\n\nPlan:\n${plan}`,
  { model: 'sonnet', label: 'implementer' }
)

if (/too complex|escalat|stuck|risk(y|ier) than expected/i.test(result)) {
  log('Implementer flagged the task as harder than expected — escalating to Opus')
  result = await agent(
    `The standard implementer reported this task is more complex than expected and stopped. Take over and finish it.\n\nPlan:\n${plan}\n\nPrior attempt/notes:\n${result}`,
    { model: 'opus', label: 'heavy-implementer' }
  )
}

phase('Review')
const review = await agent(
  `Audit this implementation against the original plan. Be skeptical: look for correctness bugs, security issues, and scope creep. State findings plainly.\n\nPlan:\n${plan}\n\nResult:\n${result}`,
  { model: 'fable', label: 'strategist:review' }
)

return { plan, result, review }
