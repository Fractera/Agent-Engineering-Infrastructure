# Purpose

What this slot solves: bottom application bar (40px height) — logo, footer page navigation, dark mode toggle, width toggle, language switcher.
Entry state: slot renders on every page via layout.tsx.
Exit state: static panel with conditionally rendered active plugins.

# Behaviour

- Loads 4 data sources in parallel: menu categories, slot config, footer page contents, active plugins
- Conditional render by active plugins: `dark-mode-toggle`, `width-toggle`, `footer-pages`, `multilingual`
- No slug-based navigation — only `default.tsx`, no `[slug]` pages
- Service slot without urlPrefix

# Components

_components/footer-panel.client.tsx       → root compositor: logo, nav menu, toolbar, dialog, drawer
_components/footer-toolbar.client.tsx     → plugin mount point: renders DarkModeTogglePlugin + width toggle button + language switcher
_components/footer-nav-menu-client.client.tsx  → desktop navigation menu (footer pages, horizontal)
_components/footer-nav-menu-mobile.client.tsx  → mobile navigation menu (footer pages, dropdown)
_components/footer-menu-dialog.client.tsx      → compositor: state management for footer pages manager dialog
_components/footer-menu-dialogs.client.tsx     → Add / Edit / Delete / Translate dialogs for footer pages
_components/footer-menu-list.client.tsx        → draggable list of footer pages inside the manager dialog
_components/footer-page-drawer.client.tsx      → drawer that shows footer page HTML content on link click

# Plugins

See `PLUGINS.md` for plugin architecture and `config/marketplace/plugins.config.ts` for the full plugin registry.

Footer slot supports 4 plugins — all from `fractera-team`, all `compatibleSlots: ['footer']`:

| Plugin ID        | What it does in this slot | Rendered by | Controlled by prop |
|------------------|---------------------------|-------------|-------------------|
| `dark-mode-toggle` | Theme switcher button in toolbar | `footer-toolbar.client.tsx` via `DarkModeTogglePlugin` from `@/components/plugins/dark-mode-toggle-plugin` | `showDarkModeToggle` |
| `width-toggle`   | Center width toggle button in toolbar | `footer-toolbar.client.tsx` (inline button using `useWidthToggle`) | `showWidthToggle` |
| `footer-pages`   | Horizontal footer nav menu + mobile menu + pages manager dialog + page content drawer | `footer-nav-menu-client.client.tsx`, `footer-nav-menu-mobile.client.tsx`, `footer-menu-dialog.client.tsx`, `footer-page-drawer.client.tsx` | `showFooterPages` |
| `multilingual`   | Language switcher dropdown in toolbar | `footer-toolbar.client.tsx` via `LanguageSwitcher` (inline component) — hidden automatically when `SINGLE_LANG_MODE=true` | no prop — always rendered unless `SINGLE_LANG_MODE` |

**How plugins are activated:**
1. `default.tsx` calls `getActivePluginsForSlot('footer')` → returns array of active plugin IDs from DB
2. Passes boolean props to `FooterPanel`: `showDarkModeToggle`, `showWidthToggle`, `showFooterPages`
3. `multilingual` plugin has no prop — `LanguageSwitcher` renders unless `SINGLE_LANG_MODE` config flag is true

**Plugin component location rule:**
`DarkModeTogglePlugin` lives in `@/components/plugins/` — this is a global plugin component shared across slots (header uses it too). It does NOT move to `_components/` because it is not footer-specific.

# Dependencies

- `@/lib/db/get-menu-categories` — footer menu categories
- `@/lib/db/get-slot-data` — slot config (bgColor, bgClass, routes)
- `@/lib/actions/get-all-footer-page-contents` — footer page HTML contents
- `@/lib/db/get-active-plugins-for-slot` — active plugin IDs from DB
- `@/lib/get-logo-path` — logo file path
- `@/config/app-config` — company name
- `@/components/ui/SlotLabel` — error boundary label (shared across all slots, stays in components/ui/)
- `@/components/plugins/dark-mode-toggle-plugin` — global plugin component (shared, not footer-specific)
- `@/providers/CodeGeneratorProvider` — flag for code generator open state (shows FolderTree button)
- `@/providers/WidthToggleProvider` — center width toggle state
- `@/config/translations/translations.config` — SINGLE_LANG_MODE, SUPPORTED_LANGUAGES

# Do not touch

- `layout.tsx` → `relative overflow-hidden` wrapper — required for correct stacking context
- `error.tsx` → `'use client'` is required by Next.js error boundary API
- `not-found.tsx` → isolates `notFound()` from bubbling up to parent layout
