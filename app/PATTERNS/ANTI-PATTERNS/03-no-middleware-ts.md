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
