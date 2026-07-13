// THE TEN ADMIN-LAYER LANGUAGES (CLAUDE.md rule 4г) — the canonical list, importable from both client and
// server code (no `fs`, unlike lib/quiz.ts). The static i18n dictionaries (create-automation-i18n.ts,
// quiz-i18n.ts, projects-index-i18n.ts) hardcode these ten keys literally and don't need this array; it
// exists for code that must ITERATE the set — building the category-translation prompt (lib/quiz.ts
// translateCategoryCopy) and validating its JSON response carries all ten.
export const UI_LANGS = ["en", "es", "fr", "it", "ru", "de", "pt", "pl", "tr", "nl"] as const;

export type UiLang = (typeof UI_LANGS)[number];
