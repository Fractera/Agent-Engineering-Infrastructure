// Generic per-document, per-language resolver. Generalizes what used to be
// news-only `resolveArticle` so blog/documentation can adopt the same
// per-document file structure and translation fallback without copy-pasting it.

import type { LocalizedBody, LocalizedBodyOverride } from './types'

export function resolveLocalizedBody<TOverride extends LocalizedBodyOverride>(
  base: LocalizedBody,
  override: TOverride | undefined,
): LocalizedBody {
  const blocks = override?.blocks
    ?? (override?.headings
      ? base.blocks.map(b =>
          b.kind === 'h2' && override.headings?.[b.text]
            ? { ...b, text: override.headings[b.text] }
            : b,
        )
      : base.blocks)
  return {
    blocks,
    faq: override?.faq ?? base.faq,
  }
}

// Per-key EN-fallback: any scalar field missing (or undefined) on the
// per-language override falls back to the base-language value. This is what
// lets a language ship with only some fields translated.
export function resolveFields<TBase, TOverride, TFields extends readonly (keyof TBase & keyof TOverride)[]>(
  base: TBase,
  override: TOverride | undefined,
  fields: TFields,
): Pick<TBase, TFields[number]> {
  const result = {} as Pick<TBase, TFields[number]>
  for (const field of fields) {
    const overrideValue = override?.[field]
    result[field] = (overrideValue ?? base[field]) as Pick<TBase, TFields[number]>[typeof field]
  }
  return result
}

export function resolveEntry<
  TBase extends LocalizedBody,
  TOverride extends LocalizedBodyOverride,
  TFields extends readonly (keyof TBase & keyof TOverride)[],
>(
  base: TBase,
  overridesByLang: Record<string, TOverride> | undefined,
  lang: string,
  fields: TFields,
): Pick<TBase, TFields[number]> & LocalizedBody {
  const override = overridesByLang?.[lang]
  return {
    ...resolveFields(base, override, fields),
    ...resolveLocalizedBody(base, override),
  }
}
