# ANTI-PATTERNS.md — approaches that cost time here, and must not be repeated

**Self-evolving.** The agent appends to this file: whenever an approach turned out to be a dead end,
the entry is written the moment it is understood, not at the end of the session — an unwritten lesson
dies with the context.

**The value is in the second half of every entry.** Not *what* failed, but *why*, in enough detail
that a similar idea can be recognised BEFORE it is built again. An entry that only says "do not do X"
gets rediscovered as "but my case is different".

Format: a heading, one line of context, the mechanism of the failure, and what to do instead.

---

# Premature Reset

> Anti-pattern · stable

Resetting or redeploying the server before the source deploy (git push -> auto build) has finished delivers a stale bootstrap, which is a guaranteed bug. Confirm the new commit is actually live before touching the server.

## Source code example

```
git log -1 --oneline origin/main   # confirm the new commit is live before redeploying
```

## Steps
_No tasks._

<!-- fractera:pattern
{"kind":"anti","category":"","number":2,"name":"Premature Reset","status":"stable","description":"Resetting or redeploying the server before the source deploy (git push -> auto build) has finished delivers a stale bootstrap, which is a guaranteed bug. Confirm the new commit is actually live before touching the server.","code":"git log -1 --oneline origin/main   # confirm the new commit is live before redeploying","tasks":[]}
-->

---

# No middleware.ts

> Anti-pattern · stable

This project runs Next.js 16 (Turbopack) and uses **`proxy.ts`** for middleware — never
`middleware.ts`. Creating a `middleware.ts` file is wrong: keep the `proxy()` function plus
`export const config` convention inside `proxy.ts`. This is a deliberate project convention, not a
mistake to "fix". An empty `middleware-manifest.json` is **not** a sign that `proxy.ts` is broken, so
do not add `middleware.ts` in response to it.

## Source code example

```ts
// proxy.ts — correct. Do NOT create middleware.ts.
export function proxy(request: Request) {
  // ...request gate / rewrite logic...
}
export const config = { matcher: [/* ... */] }
```

## Steps
_No tasks._

<!-- fractera:pattern
{"kind":"anti","category":"","number":3,"name":"No middleware.ts","status":"stable","description":"This project runs Next.js 16 (Turbopack) and uses proxy.ts for middleware, never middleware.ts. Creating a middleware.ts file is wrong: keep the proxy() function plus export const config convention inside proxy.ts. It is a deliberate project convention. An empty middleware-manifest.json is not a sign proxy.ts is broken — do not add middleware.ts in response to it.","code":"// proxy.ts — correct. Do NOT create middleware.ts.\nexport function proxy(request: Request) { /* request gate / rewrite */ }\nexport const config = { matcher: [/* ... */] }","tasks":[]}
-->
