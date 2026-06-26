# Aspect: i18n (Slot B) — ready, always-on for content

i18n is the canonical uniform aspect. It is carried structurally by the `[lang]` route segment plus the tab's
localized UI chrome (`_data/{en,<lang>,index}.ts` with per-key EN fallback). It is applied identically at every
level of the structure, independent of depth and data source (Two-Slot Law). There is no separate injectable
fragment — enabling i18n means the `[lang]` segment is present and the chrome is generated per language, which
the reference primitive already does. Authority: `frozen-template-constructor.md` §5; recipe: `multilingual-content.md`.
