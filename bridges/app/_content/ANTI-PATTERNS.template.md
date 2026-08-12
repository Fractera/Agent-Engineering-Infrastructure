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

---

# Styling disappears when .git does

> Anti-pattern · draft

**Tailwind 4 finds classes on its own, but it uses the GIT REPOSITORY ROOT as the boundary of that
search.** Remove the `.git` folder — most easily by rebuilding the project into a sibling directory and
dropping the repository on the way — and there is nowhere left to scan.

**The mechanism, and why nothing catches it.** The build does not fail. It succeeds, and it emits a
stylesheet: a valid one, simply empty of utilities — roughly 9 KB where a working build produces about
120 KB. The site turns into a white page with unstyled black text, and every guard stays green at the
same time: types pass, dictionaries are full, the encoding scan is clean, the build exit code is `0`.
No step in the pipeline treats a valid-but-empty stylesheet as a failure, so the first thing that
notices is a human looking at the page.

**Recognise it by the size, not by the error** — there is no error. A main CSS chunk in the single-digit
kilobytes means the source scan found nothing, whatever the build said.

**What to do instead.** Name the source directories explicitly with `@source` in `styles/globals.css`, so
styling never depends on the presence of git at all. And if the slot itself lost its `.git`, restore it:
it is the user's project repository, and the panel's Pull and Push buttons are bound to it — losing it
breaks more than the stylesheet.

## Source code example

```css
/* styles/globals.css — do not rely on automatic detection */
@import "tailwindcss";

@source "../app";
@source "../components";
@source "../lib";
@source "../config";
```

## Steps
_No tasks._

<!-- fractera:pattern
{"kind":"anti","category":"","number":4,"name":"Styling disappears when .git does","status":"draft","description":"Tailwind 4 finds classes on its own, but it uses the GIT REPOSITORY ROOT as the boundary of that search. Remove the .git folder — most easily by rebuilding the project into a sibling directory and dropping the repository on the way — and there is nowhere left to scan. The build does not fail: it succeeds and emits a valid stylesheet that is simply empty of utilities, roughly 9 KB where a working build produces about 120 KB. The site turns into a white page with unstyled black text while every guard stays green: types pass, dictionaries are full, the encoding scan is clean, the build exit code is 0. No step treats a valid-but-empty stylesheet as a failure, so the first thing that notices is a human looking at the page. Recognise it by size, not by an error — there is none: a main CSS chunk in the single-digit kilobytes means the source scan found nothing. Fix it by naming the source directories explicitly with @source in styles/globals.css, so styling never depends on git. If the slot lost its .git, restore it too: it is the user's project repository and the panel's Pull and Push buttons are bound to it.","code":"/* styles/globals.css — do not rely on automatic detection */\n@import \"tailwindcss\";\n\n@source \"../app\";\n@source \"../components\";\n@source \"../lib\";\n@source \"../config\";","tasks":[]}
-->
