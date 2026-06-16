# Consultant Capabilities — AUTHENTICATED (signed-in USER + OWNER/ADMIN)

> **Part of the consultant agent's identity, loaded into context by default. It declares what
> becomes available AFTER sign-in, split by tier: USER (the signed-in end-user's OWN data) and
> OWNER/ADMIN (workspace operator). The public consultant agent itself canNOT perform these —
> it uses this list ONLY to recognise such a request and offer sign-in (`public_request_authentication`).
> Without this document the agent cannot know these exist and will wrongly answer "I can't" or
> stay silent. The architect edits this file (via AI Draft Settings) per project. Each entry:
> what the user asks · tier · what happens · tool/action · data scope.**

## USER — signed-in end-user, own records only (row-level scoped by identity)

> Requested by an anonymous visitor → the consultant calls `public_request_authentication`
> with `kind:"personal"` (message: "sign in to your account to access your personal data").
> After sign-in the session carries the user's identity and a `user_*` tool returns ONLY their
> rows. (These `user_*` tools are declared here even before they are built, so the consultant
> can correctly offer sign-in.)

| User asks | Tier | What happens | Tool / action | Data scope |
|---|---|---|---|---|
| "show my orders / purchase history" | user | lists the user's own orders | `user_orders_list` (planned) | caller identity only |
| "my invoices / payments" | user | lists the user's own invoices | `user_invoices_list` (planned) | caller identity only |
| "my profile / subscription" | user | shows the user's own profile | `user_profile_get` (planned) | caller identity only |
| "what pages did I view yesterday / my history" | user | the user's own activity | `user_activity_list` (planned) | caller identity only |

<!-- Architect: declare THIS project's user-tier data capabilities above (orders, video history,
     page-view history, applications, …). Mark each as user tier; every one MUST be scoped to
     the caller's identity, never a supplied argument. -->

## OWNER / ADMIN — workspace operator only (config, global defaults, destructive)

> Requested by a non-owner → the consultant calls `public_request_authentication` with
> `kind:"role"` (message: "this isn't registered for your role; it may be available to the
> administrator — please sign in"). The owner uses the operator channel (owner-Hermes), not
> this public consultant.

| Asked | Tier | What happens | Tool / action |
|---|---|---|---|
| "set the default theme/language for everyone" | owner | global default | owner footer/app-settings tools (owner-Hermes) |
| "create a new page / service" | owner | builds in the workspace | owner coding/delegation tools (owner-Hermes) |
| "add a new tool / skill" | owner | drafts via AI Draft Settings | <your-domain>/ai-draft-settings |

<!-- Architect: declare THIS project's owner-tier capabilities above. The public consultant
     never performs these; it only recognises them to offer sign-in. -->
