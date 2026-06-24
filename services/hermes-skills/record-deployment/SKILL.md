---
name: record-deployment
description: >
  Log each development deployment into the Product Loop "Deployments" table the owner
  sees in admin — which agent did the work, which model, token cost, commit, and the
  page URL to review. Use once per deployment, right after a delegated change goes live
  and before you hand the owner the URL. Calls owner_product_loop_record_deployment.
version: 1.0.0
metadata:
  hermes:
    tags: [product-loop, deployment, record, tracking, tokens, deployments-table]
    related_skills: [delegate-task]
---

# record-deployment

Skill for logging each development deployment into the Product Loop table — the
"Deployments" table the user sees in the admin UI. This is what makes Fractera
more than Vercel: the log tracks not just the deploy, but which agent did the
work, which model, how many tokens it cost, and the user's quality rating.

## The product loop

1. You take a technical decision and delegate the work to one or more coding
   agents (`owner_delegate_task_to_platform` / `owner_delegate_task_to_best_platform`).
2. When they finish, you deploy.
3. If the deploy has no errors, you **record it** and hand the user the page URL.
4. The user opens the URL, reviews, and rates the result 1-3 stars in the admin
   table (default 3). They can change the rating anytime later.

## When to call

Call `owner_product_loop_record_deployment` **once per deployment**, right after the change is live
and before you tell the user where to look. One delegated+deployed change = one
row.

## How to call

```
owner_product_loop_record_deployment(
  platform="claude-code",        # the agent that did the work (required)
  page_url="http://<ip>:3000/...",  # where the user reviews it (required)
  model="gpt-5-mini",            # model used
  tokens=12345,                  # the `tokens` value owner_delegate_task_to_platform returned
  commit_message="Add pricing card",
  commit_hash="abc1234",         # if you committed
  branch="main",
  step="23",                     # the step number this commit belongs to
  status="ready",                # ready | building | error
  duration_ms=84000,             # how long the work/build took
)
```

`result` defaults to 3 stars — leave it unless you have a reason to pre-rate.
`project` defaults to "default". `step` is the step number the commit implements
(e.g. "23"); set it when you know which step you are working on — it ties the
deployment row to the task in the journal. You can also set/correct it later with
`owner_product_loop_update_deployment(id=..., step="23")`.

## After recording

1. Give the user the `page_url` and ask them to review.
2. Wait for their feedback. They rate by clicking the stars in the table; you do
   not need to update the rating yourself.
3. Use `owner_product_loop_list_deployments` if you need to recall recent work.

## Why tokens matter

The `tokens` figure comes straight from the agent's run (returned by
`owner_delegate_task_to_platform`). Recording it gives the user real visibility into the
cost of each change — pass it through honestly; do not estimate or invent it. If
you genuinely don't have a number, omit it (it defaults to 0).
