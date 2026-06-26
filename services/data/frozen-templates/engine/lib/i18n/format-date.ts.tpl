// Defensive localized date formatter (step 149 — language-safety vaccine). SHARED engine brick,
// not versioned, installed copy-if-absent by the Frozen Template Constructor.
//
// `Date.prototype.toLocaleDateString(lang, …)` throws `RangeError: Invalid language tag` on a
// structurally invalid locale. An unexpected or garbled language must NEVER 500 a page — so this
// wraps the call: it falls back to the default 'en' locale, then to the raw ISO string, but never
// throws. The page keeps rendering; at worst the date is shown in the base locale.
export function formatLocalizedDate(
  iso: string,
  lang: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const opts = options ?? { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  try {
    return date.toLocaleDateString(lang, opts)
  } catch {
    try {
      return date.toLocaleDateString('en', opts)
    } catch {
      return iso
    }
  }
}
