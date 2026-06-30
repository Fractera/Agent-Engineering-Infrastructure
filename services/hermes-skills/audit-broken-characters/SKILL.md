---
name: audit-broken-characters
description: >
  Scan the whole project for BROKEN / REPLACEMENT characters in localized text — a control byte
  (e.g. 0x13) or U+FFFD or mojibake left where an accented letter belonged, which renders as a box
  (e.g. "Documentación" showing "Documentaci□n"). Use when the owner reports a square / wrong glyph in
  the UI or content, says "broken character", "weird symbol", "mojibake", "validate encoding", or
  after authoring multilingual content and before closing a content step. It SHIPS SILENTLY (the file
  still parses), so run the audit to catch it. Self-sufficient: one project-root script, no Hermes.
version: 1.0.0
metadata:
  hermes:
    tags: [encoding, broken-character, replacement-character, mojibake, control-character, validate, audit, multilingual, integrity, square, box-glyph, utf8]
    related_skills: [expand-site-language, manage-content-collections, compose-frozen-template]
---

# audit-broken-characters

The project's universal **encoding-integrity** check. A lossy step — voice dictation, copy-paste, a bad
transform — can drop an accented letter and leave a **control byte** (0x13…), **U+FFFD** (the replacement
char), or **mojibake** in its place. The file still parses, so it ships **silently**, and the live page
shows a **box instead of the letter** (the real "Documentación" became "Documentaci□n").

Unlike a silently dropped letter, these ARE detectable. This capability is **two-sided**:
- **Prevention (already wired):** the content emitters — `manage-content-collections`, `compose-frozen-template`,
  `expand-site-language`'s fan-out + translate runner — **refuse** a broken char on write, in any language.
- **Detection (this skill):** the project-root scanner sweeps the **whole corpus** (every language, every
  content/UI/data file) and reports what already sits in the tree.

## Where it lives & how to run it

**Script:** `scripts/scan-broken-characters.mjs` (project root). **One command:**

```bash
npm run check:encoding                       # scan the project root (the slot)
node scripts/scan-broken-characters.mjs --root .          # same, explicit
node scripts/scan-broken-characters.mjs --root services/auth   # point it anywhere (e.g. the 82-lang auth dictionary)
node scripts/scan-broken-characters.mjs --json            # single-line JSON (tooling / CI)
```

Every finding reports **file · line · column · codepoint (e.g. `U+0013`) · language · context** (the line
with the bad char shown as a safe `[U+XXXX]` marker, never the raw corruption). Exit code 1 on any finding
— so it works as a pre-commit / CI gate. Read-only: it changes nothing.

**MCP (any agent / Hermes):** `owner_content_scan_broken_characters` (language-expansion bridge) runs the
same scan against the slot and returns the findings.

## How to FIX what it finds (critical)

**Fix each occurrence BY HAND with the correct letter for its word.** Do NOT blind-replace the byte — the
same control byte or U+FFFD may stand for a **different** accented letter in different places (á / é / í /
ó / ñ). Read the word, restore the right character, then **REBUILD** (Deploy) to publish. After a fix, re-run
`npm run check:encoding` to confirm the corpus is clean.

## When to run it

- When the owner reports a square / wrong glyph in the UI or a page.
- After adding or translating multilingual content (alongside the content emitters' write-time refusal).
- Before closing a content step (a cheap, decisive integrity gate).

## Self-sufficient

The scanner is a plain Node-ESM script at the project root — no Hermes, no MCP required to run it (the MCP
tool is just a convenience wrapper). It ships with every slot.
