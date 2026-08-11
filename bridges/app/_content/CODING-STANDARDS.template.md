# CODING-STANDARDS.md — limits the code must respect

Not style advice. These are limits: when one is reached, you stop and restructure instead of continuing.

---

## 1. 250 lines, then decompose

**No component and no function may exceed 250 lines.** Data does not count — a translation table, a
catalogue of countries or a list of fields is data, and splitting it helps nobody.

On reaching the limit, **decomposition is mandatory, not optional**. Not "later", not "after this feature":
the file that crossed the line is split before the work continues.

**Why the limit is a hard one.** A component past that size stops fitting in one head and in one review.
Its state, its rendering and its side effects blur together, so every later change touches things it did
not mean to. Splitting after the fact costs several times what splitting at the line would have cost.

---

## 2. The public layer is static

**Pages a visitor sees are generated ahead of time** — static or server-rendered at build. Not dynamic
because dynamic was easier.

The app must work with JavaScript switched off. Next renders on the server, so a static page returns
complete HTML with no JS at all. Tools may degrade without JS — that is fine; everything that *can* work
without it must keep working.

**What actually breaks this:** a client component that owns the route, or a `dynamic = "force-dynamic"` on
a root layout — it makes the entire subtree dynamic. For content that changes, use revalidation
(`export const revalidate = N`), not full dynamics.

**The exception** is a page only the owner sees. Service and cockpit pages may be dynamic; the public
surface may not.

---

## 3. Text a user sees goes through translations

No user-visible string is written inline in a component, and no `lang === "ru" ? … : …` ternaries. A new
string is a new key; a new language is a new file.

**Why.** A hardcoded string cannot be translated without finding it first, and it will be found by the
person who least expects to. The exception is machine strings — identifiers, slugs, enum values, codes:
translating those breaks lookups.

---

## 4. Settings are read, never hardcoded

The app's name, description, branding, SEO and analytics live in the panel (`npm run read:app-config`).
Writing any of them into the code is wrong twice: the app does not read your version, and the file that it
does read will overwrite it.

---

*This list grows. When a limit is agreed with the owner, it belongs here — one section, with the reason,
so a later session can judge whether it still holds.*
