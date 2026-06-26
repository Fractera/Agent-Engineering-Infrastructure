import type { ReactNode } from 'react'
{{ASPECT_IMPORTS}}
// CONSTRUCTOR PRIMITIVE files-depth1 — SEAM: uniform aspects (Slot B). Every enabled
// aspect is composed HERE, applied identically at every level of the structure
// (the Two-Slot Law: an aspect is the same rule at any depth, independent of the data
// source). The composer injects each enabled aspect's wrapper into {{ASPECT_OPEN}} /
// {{ASPECT_CLOSE}} and its import into {{ASPECT_IMPORTS}}.
//
// Reference primitive: i18n is ON (carried by the [lang] route segment + the tab's
// localized chrome) and roles is OFF (no guard). Turning roles ON injects the role
// guard into this same slot ONLY — depth and the list-provider are untouched.
export default function {{TAB_PASCAL}}Layout({ children }: { children: ReactNode }) {
  return ({{ASPECT_OPEN}}<>{children}</>{{ASPECT_CLOSE}})
}
