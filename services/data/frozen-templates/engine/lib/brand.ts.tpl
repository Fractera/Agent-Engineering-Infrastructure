// Brand identity from environment variables (white-label). NEXT_PUBLIC_* values are
// baked into the bundle at build time, so changing the brand needs a rebuild.
// Unset vars fall back to the defaults below.
export const BRAND = {
  /** Product/marketing name, e.g. in titles and breadcrumbs. */
  name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || 'Fractera',
  /** Legal entity name for structured data (Organization publisher). */
  legalName: process.env.NEXT_PUBLIC_BRAND_LEGAL_NAME?.trim() || 'Fractera, Inc.',
  /** Canonical site origin, no trailing slash. */
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.fractera.ai').replace(/\/+$/, ''),
  /** Logo path relative to the site origin. */
  logoPath: process.env.NEXT_PUBLIC_BRAND_LOGO_PATH?.trim() || '/fractera-logo.jpg',
} as const

/** Absolute logo URL (origin + path) for structured data / OpenGraph. */
export const brandLogoUrl = `${BRAND.siteUrl}${BRAND.logoPath}`
