// WORD-COUNT VALIDATION (step 234.1) — the category description is capped at 200 WORDS, not characters
// ("critically important for further project purposes," owner). Pure, no `fs`: shared by the client
// textarea's live counter AND the server route's defense-in-depth check (never trust one layer alone).
export const MAX_CATEGORY_DESCRIPTION_WORDS = 200;

export function countWords(s: string): number {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
