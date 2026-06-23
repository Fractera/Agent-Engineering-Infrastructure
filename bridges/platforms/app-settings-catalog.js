// Catalog of the deployed app's settings (App Settings — branding/SEO/PWA), mirroring the
// admin panel descriptor (bridges/app/_components/coding-workspace/site-settings/fields.ts).
// Pure data — drives the App Settings MCP so Hermes can enumerate the TEXT records, explain
// each one's role, flag which the owner has not filled, and write text values.
//
// `kind`: 'text' (settable free text), 'choice' (select — settable, has `options`),
//         'number' (settable), 'flag' (switch boolean — settable), 'image' (NOT settable
//         here — the owner uploads via the control panel, which crops + stores the file).
// `def`: the shipped default; a text field counts as "not set by the owner" while it equals
//        this default or is empty. `role`: what it does / why it matters.

export const APP_SETTINGS_CATALOG = [
  // ── Brand & identity ──────────────────────────────────────────────────────
  { path: 'name', label: 'App name', kind: 'text', section: 'Brand & identity', def: 'Fractera — Production-Coding AI Server', role: 'The public name of the app. Used in the page <title>, OpenGraph tags and JSON-LD. The single most important text field.' },
  { path: 'short_name', label: 'Short name', kind: 'text', section: 'Brand & identity', def: 'Fractera', role: 'Short wordmark — the PWA icon label and the compact brand name shown on the home screen.' },
  { path: 'description', label: 'Description', kind: 'text', section: 'Brand & identity', def: 'Production-Coding AI Server — multiple frontier AI models running entirely on your own server. No cloud lock-in.', role: 'One-line pitch. Becomes the meta description, OG/Twitter description and JSON-LD description — the snippet search engines and social shares show.' },
  { path: 'url', label: 'Site URL', kind: 'text', section: 'Brand & identity', def: 'https://fractera.ai', role: 'The real canonical URL of the deployed app. Drives metadataBase, OG url and JSON-LD. Set this to the owner’s actual domain.' },
  { path: 'mailSupport', label: 'Support email', kind: 'text', section: 'Brand & identity', def: 'admin@fractera.ai', role: 'Public support email — shown in the Organization / contactPoint structured data.' },
  { path: 'chatBrand', label: 'Chat brand', kind: 'text', section: 'Brand & identity', def: 'Hermes', role: 'Name of the built-in chat assistant as shown to end users.' },
  // NOTE: the free-text `lang` field was removed (step 133) — the language SET is managed
  // via the dedicated language tools (owner_app_settings_*_languages), not as a text field.

  // ── App icons & PWA (text/choice) ─────────────────────────────────────────
  { path: 'pwa.themeColor', label: 'PWA theme color', kind: 'text', section: 'App icons & PWA', def: '#ffffff', role: 'PWA manifest theme color (hex).' },
  { path: 'pwa.backgroundColor', label: 'PWA background color', kind: 'text', section: 'App icons & PWA', def: '#ffffff', role: 'PWA splash background color (hex).' },
  { path: 'pwa.display', label: 'PWA display', kind: 'choice', section: 'App icons & PWA', options: ['standalone', 'fullscreen', 'minimal-ui', 'browser'], role: 'How the installed PWA is presented.' },
  { path: 'pwa.orientation', label: 'PWA orientation', kind: 'choice', section: 'App icons & PWA', options: ['portrait-primary', 'landscape-primary', 'any'], role: 'Preferred PWA orientation.' },
  { path: 'pwa.startUrl', label: 'PWA start URL', kind: 'text', section: 'App icons & PWA', def: '/', role: 'URL the PWA opens at.' },
  { path: 'pwa.scope', label: 'PWA scope', kind: 'text', section: 'App icons & PWA', def: '/', role: 'Navigation scope of the PWA.' },
  { path: 'themeColors.light', label: 'Browser bar color (light)', kind: 'text', section: 'App icons & PWA', def: '#ffffff', role: 'Browser theme-color in light mode (hex).' },
  { path: 'themeColors.dark', label: 'Browser bar color (dark)', kind: 'text', section: 'App icons & PWA', def: '#09090b', role: 'Browser theme-color in dark mode (hex).' },

  // ── Author ────────────────────────────────────────────────────────────────
  { path: 'author.name', label: 'Author name', kind: 'text', section: 'Author', def: 'Fractera', role: 'Default content author — used in metadata and Person structured data.' },
  { path: 'author.email', label: 'Author email', kind: 'text', section: 'Author', def: 'admin@fractera.ai', role: 'Author contact email in metadata.' },
  { path: 'author.url', label: 'Author URL', kind: 'text', section: 'Author', role: 'Author homepage/profile URL.' },
  { path: 'author.jobTitle', label: 'Author job title', kind: 'text', section: 'Author', role: 'Author job title (Person schema).' },
  { path: 'author.bio', label: 'Author bio', kind: 'text', section: 'Author', role: 'Short author biography.' },
  { path: 'author.twitter', label: 'Author Twitter', kind: 'text', section: 'Author', role: 'Author Twitter handle or URL.' },
  { path: 'author.linkedin', label: 'Author LinkedIn', kind: 'text', section: 'Author', role: 'Author LinkedIn handle or URL.' },
  { path: 'author.facebook', label: 'Author Facebook', kind: 'text', section: 'Author', role: 'Author Facebook handle or URL.' },

  // ── Social profiles ───────────────────────────────────────────────────────
  { path: 'seo.social.twitter', label: 'Twitter', kind: 'text', section: 'Social profiles', def: '@fractera', role: 'Brand Twitter — Twitter card site/creator and Organization sameAs.' },
  { path: 'seo.social.github', label: 'GitHub', kind: 'text', section: 'Social profiles', role: 'Brand GitHub URL — Organization sameAs.' },
  { path: 'seo.social.linkedin', label: 'LinkedIn', kind: 'text', section: 'Social profiles', role: 'Brand LinkedIn handle/URL — Organization sameAs.' },
  { path: 'seo.social.facebook', label: 'Facebook', kind: 'text', section: 'Social profiles', role: 'Brand Facebook handle/URL — Organization sameAs.' },

  // ── SEO ───────────────────────────────────────────────────────────────────
  { path: 'seo.indexing', label: 'Indexing', kind: 'choice', section: 'SEO', options: ['allow', 'disallow'], role: 'Allow or block search-engine indexing of the whole site.' },
  { path: 'seo.titleTemplate', label: 'Title template', kind: 'text', section: 'SEO', def: '%s | Fractera', role: 'Template for page titles; %s is replaced by the page title.' },
  { path: 'seo.robotsIndex', label: 'Robots: index', kind: 'flag', section: 'SEO', role: 'Whether robots may index pages.' },
  { path: 'seo.robotsFollow', label: 'Robots: follow', kind: 'flag', section: 'SEO', role: 'Whether robots may follow links.' },
  { path: 'seo.keywords', label: 'Keywords', kind: 'text', section: 'SEO', role: 'Comma-separated meta keywords (minor SEO signal).' },
  { path: 'seo.canonicalBase', label: 'Canonical base URL', kind: 'text', section: 'SEO', def: 'https://fractera.ai', role: 'Base URL for canonical links; usually the same as Site URL.' },
  { path: 'seo.sitemapUrl', label: 'Sitemap URL', kind: 'text', section: 'SEO', role: 'Explicit sitemap URL if different from default.' },
  { path: 'seo.googleVerification', label: 'Google verification', kind: 'text', section: 'SEO', role: 'Google Search Console verification token.' },
  { path: 'seo.yandexVerification', label: 'Yandex verification', kind: 'text', section: 'SEO', role: 'Yandex Webmaster verification token.' },

  // ── OpenGraph ─────────────────────────────────────────────────────────────
  { path: 'og.type', label: 'OG type', kind: 'choice', section: 'OpenGraph', options: ['website', 'article', 'product'], role: 'OpenGraph object type.' },
  { path: 'og.siteName', label: 'OG site name', kind: 'text', section: 'OpenGraph', def: 'Fractera', role: 'OpenGraph site name.' },
  { path: 'og.locale', label: 'OG locale', kind: 'text', section: 'OpenGraph', role: 'OpenGraph locale, e.g. en_US.' },
  { path: 'og.imageWidth', label: 'OG image width', kind: 'number', section: 'OpenGraph', def: 1200, role: 'OG image width in px.' },
  { path: 'og.imageHeight', label: 'OG image height', kind: 'number', section: 'OpenGraph', def: 630, role: 'OG image height in px.' },

  // ── Analytics ─────────────────────────────────────────────────────────────
  { path: 'analytics.enabled', label: 'Enable Google Analytics', kind: 'flag', section: 'Analytics', role: 'Turn the Google Analytics tag on/off.' },
  { path: 'analytics.googleAnalyticsId', label: 'GA Measurement ID', kind: 'text', section: 'Analytics', role: 'Google Analytics measurement ID (G-XXXXXXX).' },

  // ── Structured data (JSON-LD) ─────────────────────────────────────────────
  { path: 'jsonLd.website', label: 'WebSite schema', kind: 'flag', section: 'Structured data (JSON-LD)', role: 'Emit WebSite JSON-LD.' },
  { path: 'jsonLd.organization', label: 'Organization schema', kind: 'flag', section: 'Structured data (JSON-LD)', role: 'Emit Organization JSON-LD.' },
  { path: 'jsonLd.localBusiness', label: 'LocalBusiness schema', kind: 'flag', section: 'Structured data (JSON-LD)', role: 'Emit LocalBusiness JSON-LD (needs the address below).' },

  // ── Local business / address ──────────────────────────────────────────────
  { path: 'geo.address', label: 'Street address', kind: 'text', section: 'Local business / address', role: 'Street address — only used when LocalBusiness schema is on.' },
  { path: 'geo.city', label: 'City', kind: 'text', section: 'Local business / address', role: 'City for LocalBusiness schema.' },
  { path: 'geo.country', label: 'Country', kind: 'text', section: 'Local business / address', role: 'Country for LocalBusiness schema.' },
  { path: 'geo.postalCode', label: 'Postal code', kind: 'text', section: 'Local business / address', role: 'Postal code for LocalBusiness schema.' },
  { path: 'geo.phone', label: 'Phone', kind: 'text', section: 'Local business / address', role: 'Phone for LocalBusiness schema.' },
  { path: 'geo.latitude', label: 'Latitude', kind: 'text', section: 'Local business / address', role: 'Latitude for LocalBusiness geo.' },
  { path: 'geo.longitude', label: 'Longitude', kind: 'text', section: 'Local business / address', role: 'Longitude for LocalBusiness geo.' },
  { path: 'geo.hours', label: 'Opening hours', kind: 'text', section: 'Local business / address', role: 'Opening hours, e.g. Mo-Fr 09:00-18:00.' },
]

// Image fields are intentionally NOT settable by the MCP — the owner uploads them through
// the control panel (Admin -> App Settings), which crops and stores the file in object
// storage. The MCP only tells the owner this.
export const APP_SETTINGS_IMAGE_FIELDS = [
  { path: 'logo', label: 'Logo' },
  { path: 'iconSet', label: 'Icon set (square source for favicon / PWA icons)' },
  { path: 'images.ogImage', label: 'OG / social image' },
  { path: 'images.homePage-light', label: 'Home illustration (light)' },
  { path: 'images.homePage-dark', label: 'Home illustration (dark)' },
  { path: 'images.loading-light', label: 'Loading (light)' },
  { path: 'images.loading-dark', label: 'Loading (dark)' },
  { path: 'images.notFound-light', label: '404 (light)' },
  { path: 'images.notFound-dark', label: '404 (dark)' },
  { path: 'images.error500-light', label: '500 (light)' },
  { path: 'images.error500-dark', label: '500 (dark)' },
  { path: 'images.chatbot-light', label: 'Chatbot (light)' },
  { path: 'images.chatbot-dark', label: 'Chatbot (dark)' },
  { path: 'author.image', label: 'Author photo' },
]

export const IMAGE_UPLOAD_NOTE =
  'Images (logo, icon set, OG/social image, illustrations, author photo) cannot be set through ' +
  'this tool. The owner uploads them in the control panel: Admin -> Settings -> App Settings, ' +
  'which crops the image and stores it. Tell the owner to use that panel for any image.'
