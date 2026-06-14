// Field descriptor for the Site Settings preview on the home page.
//
// IMPORTANT: this is a VERBATIM MIRROR of the admin panel's field list
// (bridges/app/_components/coding-workspace/site-settings/fields.ts). The two Next apps do
// not share a bundle, so the SECTIONS array below must be kept BYTE-IDENTICAL to the panel's
// — the home page shows exactly the fields the owner edits, with exactly the same labels.
// When you add/rename a field in the panel, copy the SECTIONS change here too.

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "switch"
  | "select"
  | "image"
  | "icons";

export type Field = {
  path: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  crop?: "square" | "horizontal";
};

export type Section = { title: string; description?: string; fields: Field[] };

const indexing = [
  { value: "allow", label: "Allow (index this site)" },
  { value: "disallow", label: "Disallow (no-index)" },
];
const ogTypes = [
  { value: "website", label: "website" },
  { value: "article", label: "article" },
  { value: "product", label: "product" },
];
const displays = [
  { value: "standalone", label: "standalone" },
  { value: "fullscreen", label: "fullscreen" },
  { value: "minimal-ui", label: "minimal-ui" },
  { value: "browser", label: "browser" },
];
const orientations = [
  { value: "portrait-primary", label: "portrait" },
  { value: "landscape-primary", label: "landscape" },
  { value: "any", label: "any" },
];

export const SECTIONS: Section[] = [
  {
    title: "Brand & identity",
    description: "Core name and description used across titles, OG tags and structured data.",
    fields: [
      { path: "name", label: "App name", type: "text", placeholder: "Fractera" },
      { path: "short_name", label: "Short name", type: "text", placeholder: "Fractera", hint: "Used by the PWA icon label." },
      { path: "description", label: "Description", type: "textarea", placeholder: "What this app is…" },
      { path: "url", label: "Site URL", type: "text", placeholder: "https://example.com" },
      { path: "mailSupport", label: "Support email", type: "text", placeholder: "admin@example.com" },
      { path: "chatBrand", label: "Chat brand", type: "text", placeholder: "Hermes" },
      { path: "lang", label: "Language", type: "text", placeholder: "en" },
    ],
  },
  {
    title: "Logo & images",
    description: "Stored in object storage; the app references them by URL. Crop on upload.",
    fields: [
      { path: "logo", label: "Logo", type: "image", crop: "square" },
      { path: "images.ogImage", label: "OG / social image", type: "image", crop: "horizontal" },
      { path: "images.homePage-light", label: "Home illustration (light)", type: "image", crop: "horizontal" },
      { path: "images.homePage-dark", label: "Home illustration (dark)", type: "image", crop: "horizontal" },
      { path: "images.loading-light", label: "Loading (light)", type: "image", crop: "square" },
      { path: "images.loading-dark", label: "Loading (dark)", type: "image", crop: "square" },
      { path: "images.notFound-light", label: "404 (light)", type: "image", crop: "horizontal" },
      { path: "images.notFound-dark", label: "404 (dark)", type: "image", crop: "horizontal" },
      { path: "images.error500-light", label: "500 (light)", type: "image", crop: "horizontal" },
      { path: "images.error500-dark", label: "500 (dark)", type: "image", crop: "horizontal" },
      { path: "images.chatbot-light", label: "Chatbot (light)", type: "image", crop: "square" },
      { path: "images.chatbot-dark", label: "Chatbot (dark)", type: "image", crop: "square" },
    ],
  },
  {
    title: "App icons & PWA",
    description: "Upload one square logo to generate favicon, apple-touch and PWA icons (192/512/maskable) + manifest.",
    fields: [
      { path: "iconSet", label: "Icon set (square source)", type: "icons" },
      { path: "pwa.themeColor", label: "Theme color", type: "text", placeholder: "#ffffff" },
      { path: "pwa.backgroundColor", label: "Background color", type: "text", placeholder: "#ffffff" },
      { path: "pwa.display", label: "Display", type: "select", options: displays },
      { path: "pwa.orientation", label: "Orientation", type: "select", options: orientations },
      { path: "pwa.startUrl", label: "Start URL", type: "text", placeholder: "/" },
      { path: "pwa.scope", label: "Scope", type: "text", placeholder: "/" },
      { path: "themeColors.light", label: "Browser bar color (light)", type: "text", placeholder: "#ffffff" },
      { path: "themeColors.dark", label: "Browser bar color (dark)", type: "text", placeholder: "#09090b" },
    ],
  },
  {
    title: "Author",
    description: "Default author used in metadata and Person structured data.",
    fields: [
      { path: "author.name", label: "Name", type: "text" },
      { path: "author.email", label: "Email", type: "text" },
      { path: "author.url", label: "URL", type: "text" },
      { path: "author.jobTitle", label: "Job title", type: "text" },
      { path: "author.bio", label: "Bio", type: "textarea" },
      { path: "author.image", label: "Photo", type: "image", crop: "square" },
      { path: "author.twitter", label: "Twitter", type: "text", placeholder: "@handle or URL" },
      { path: "author.linkedin", label: "LinkedIn", type: "text" },
      { path: "author.facebook", label: "Facebook", type: "text" },
    ],
  },
  {
    title: "Social profiles",
    description: "Linked from OG/Twitter cards and Organization sameAs.",
    fields: [
      { path: "seo.social.twitter", label: "Twitter", type: "text", placeholder: "@handle or URL" },
      { path: "seo.social.github", label: "GitHub", type: "text" },
      { path: "seo.social.linkedin", label: "LinkedIn", type: "text" },
      { path: "seo.social.facebook", label: "Facebook", type: "text" },
    ],
  },
  {
    title: "SEO",
    fields: [
      { path: "seo.indexing", label: "Indexing", type: "select", options: indexing },
      { path: "seo.titleTemplate", label: "Title template", type: "text", placeholder: "%s | Brand", hint: "%s is the page title." },
      { path: "seo.robotsIndex", label: "Robots: index", type: "switch" },
      { path: "seo.robotsFollow", label: "Robots: follow", type: "switch" },
      { path: "seo.keywords", label: "Keywords", type: "textarea", placeholder: "comma, separated" },
      { path: "seo.canonicalBase", label: "Canonical base URL", type: "text" },
      { path: "seo.sitemapUrl", label: "Sitemap URL", type: "text" },
      { path: "seo.googleVerification", label: "Google verification", type: "text" },
      { path: "seo.yandexVerification", label: "Yandex verification", type: "text" },
    ],
  },
  {
    title: "OpenGraph",
    fields: [
      { path: "og.type", label: "Type", type: "select", options: ogTypes },
      { path: "og.siteName", label: "Site name", type: "text" },
      { path: "og.locale", label: "Locale", type: "text", placeholder: "en_US" },
      { path: "og.imageWidth", label: "Image width", type: "number", placeholder: "1200" },
      { path: "og.imageHeight", label: "Image height", type: "number", placeholder: "630" },
    ],
  },
  {
    title: "Analytics",
    fields: [
      { path: "analytics.enabled", label: "Enable Google Analytics", type: "switch" },
      { path: "analytics.googleAnalyticsId", label: "Measurement ID", type: "text", placeholder: "G-XXXXXXX" },
    ],
  },
  {
    title: "Structured data (JSON-LD)",
    fields: [
      { path: "jsonLd.website", label: "WebSite schema", type: "switch" },
      { path: "jsonLd.organization", label: "Organization schema", type: "switch" },
      { path: "jsonLd.localBusiness", label: "LocalBusiness schema", type: "switch" },
    ],
  },
  {
    title: "Local business / address",
    description: "Only used when the LocalBusiness schema above is on.",
    fields: [
      { path: "geo.address", label: "Street address", type: "text" },
      { path: "geo.city", label: "City", type: "text" },
      { path: "geo.country", label: "Country", type: "text" },
      { path: "geo.postalCode", label: "Postal code", type: "text" },
      { path: "geo.phone", label: "Phone", type: "text" },
      { path: "geo.latitude", label: "Latitude", type: "text" },
      { path: "geo.longitude", label: "Longitude", type: "text" },
      { path: "geo.hours", label: "Opening hours", type: "text", placeholder: "Mo-Fr 09:00-18:00" },
    ],
  },
];

// nested get on a plain config object (mirror of the admin helper)
export function getAt(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined),
    obj
  );
}
