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
    tags: [orchestration, delegation, coding, platforms, delegate, send-task]
    related_skills: [choose-agent, record-deployment]
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

## Platform selection guide

| Platform    | Best for                                      |
|-------------|-----------------------------------------------|
| claude-code | Complex multi-file refactors, nuanced tasks   |
| codex       | OpenAI-ecosystem tasks, GPT-family strengths  |
| gemini-cli  | Google-ecosystem, long-context tasks          |
| qwen-code   | Alibaba-ecosystem, multilingual code          |
| kimi-code   | Moonshot tasks, Chinese-language contexts     |

Default: **claude-code** when no preference is clear.

## How to delegate

```
owner_delegate_task_to_platform(platform="claude-code", prompt="<task>")
```

Or auto-select:
```
owner_delegate_task_to_best_platform(prompt="<task>", criteria="prefer free tier")
```

## Prompt framing

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
