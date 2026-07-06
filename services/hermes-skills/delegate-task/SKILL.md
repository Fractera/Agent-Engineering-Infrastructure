---
name: delegate-task
description: >
  Delegate a coding task to one of the 5 AI coding platforms and handle the result.
  Use when a task needs real code written (a single feature or bug), or you want a
  second model's take. Frames the prompt, calls owner_delegate_task_to_platform /
  _best_platform, reviews the output, and records the deployment afterwards.
version: 1.0.0
metadata:
  hermes:
    tags: [orchestration, delegation, coding, platforms, delegate, send-task, project, coder-handoff, step-number]
    related_skills: [choose-agent, record-deployment, orchestrate-project-by-steps, prepare-automation-knowledge]
---

# delegate-task

Orchestration skill for delegating coding tasks to AI platforms.

## When to delegate

Delegate when:
- The task requires actual code writing, not just planning
- The task is well-defined and bounded (single feature, single bug)
- You want a second opinion from a different model

Handle directly when:
- The task is about architecture, planning, or decision-making
- You need information from Company Brain (use prefetch instead)
- The task is conversational or clarificatory
- **The task is already YOUR native tool** — see below.

## First — could YOU do it natively? (SOUL R13, step 192)

Before delegating, check whether the task overlaps your own native arsenal — web search/extract, a browser,
image generation, TTS, memory, scheduling (`cronjob`), sub-agents (`delegate_task`). If a native tool covers
it, **do it yourself; do not delegate a from-scratch build** (a coder would reinvent what you already have —
exactly the failure step 192 prevents).

When you DO delegate a task whose domain touches a native tool of yours, **advertise it in the payload/spec**:
name the relevant native tools and tell the coder — "if this needs web search / a browser / images / TTS,
tell me and I'll do it natively; do NOT build it from scratch." Coders often don't know your native tools;
this closes their visibility gap at handoff. If a coder later files a `native-capability-appeal` step, accept
it per R13: reform the spec to use your native tool or enable it in config, then close the step.

## Platform selection guide

| Platform    | Best for                                      |
|-------------|-----------------------------------------------|
| claude-code | Complex multi-file refactors, nuanced tasks   |
| codex       | OpenAI-ecosystem tasks, GPT-family strengths  |
| gemini-cli  | Google-ecosystem, long-context tasks          |
| qwen-code   | Alibaba-ecosystem, multilingual code          |
| kimi-code   | Moonshot tasks, Chinese-language contexts     |

Default: **claude-code** when no preference is clear.

## Confirm before you dispatch (mandatory)

Delegating starts real work on a real agent — a state change. Obey `confirm-before-mutation`:
FIRST check readiness (`choose-agent`), THEN restate to the owner exactly what you will hand
off (the task, the target agent, the input it receives) and wait for an explicit go. Never
dispatch silently. If no agent is signed into a subscription, do NOT dispatch — give the calm
structured status and the two options (activate & retry / save as a development step); see
`choose-agent` "When nothing can run".

## How to delegate

Only after the owner confirmed (above) and an agent is available:

```
owner_delegate_task_to_platform(platform="claude-code", prompt="<task>")
```

Or auto-select:
```
owner_delegate_task_to_best_platform(prompt="<task>", criteria="prefer free tier")
```

## Delegating a PROJECT node — hand only the step number (do not re-frame)

When the task is a **project (automation) node** produced by `orchestrate-project-by-steps`, the delegation
is already written to disk: that engine materialized a **coder-handoff step** per node, and it is EXHAUSTIVE
(read the project `README.md` → open the spec step → deliverable / tools / env keys / acceptance / finish
protocol). In that case you do **NOT** author a fresh prompt from the four parts below — the handoff step IS
the prompt. Hand the coding agent **ONLY the step number**; it opens the numbered step and finds everything
there (and in the spec step it points to). Reserve the free-form framing below for a **one-off** coding task
that has no materialized step. The confirm/readiness discipline is identical either way: check `choose-agent`,
confirm with the owner, then delegate. If no agent is signed in, the handoff step already sits on disk
(materialize-first) — nothing is lost; give the calm status and the two options, do not alarm the owner.

## Prompt framing (one-off tasks without a materialized step)

Always include in the delegated prompt:
1. **Context**: What the project does (1-2 sentences)
2. **Task**: What specifically to build/fix
3. **Constraints**: File limits, patterns, tech stack
4. **Output**: What you expect back

Example:
```
Context: Fractera admin panel, Next.js + shadcn/ui, 200-line file limit.
Task: Add a "Clear history" button to paste-text-modal.client.tsx that
      clears localStorage key "paste-text-history" and resets the history
      state to [].
Output: Modified file content ready to paste.
```

## After delegation

1. Review the result — do not blindly apply
2. If good: apply via terminal tool or file write
3. If partial: delegate follow-up with corrections
4. Log verdict in `docs/hermes/feedback-history/` (feedback loop)
5. **Deploy, then record it.** Once the change is live, call `owner_product_loop_record_deployment`
   with the `platform`, `model`, the `tokens` value the delegation returned, and
   the `page_url` the user can open to review. Then give the user that URL and
   wait for their feedback. See the **record-deployment** skill.

## Timeout behavior

Tasks timeout after 5 minutes. If timeout:
- Check if the platform PTY session is active
- Re-delegate with a simpler, more focused prompt
- Reduce scope if the original task was too large
