# Site Settings — branding / SEO / PWA config (the standard)

Your app's brand, SEO and PWA identity (name, description, logo, favicon/icons, OG image,
social links, JSON-LD, theme colors, analytics) are configured in **Admin → Settings →
Site Settings** and stored as a **real JSON file on disk**: `APP-CONFIG/app-config.json` at
the project root. This is the single source of truth — there is no database table.

## How it works
- **Source of truth:** `APP-CONFIG/app-config.json` (gitignored — per-server data). The seed
  defaults live in code (`config/app-config.defaults.ts`), so a fresh server is already
  branded; the file is created from those defaults on first read (`ensureConfig`).
- **Loader:** `config/app-config.ts` → `getAppConfig()` reads the file server-side, deep-merges
  it over the code defaults (a missing key never breaks rendering), and memoizes per request.
  **Never import this from a client component** (it uses `fs`) — pass values down as props. The
  client-safe types/defaults/getters are in `config/app-config.defaults.ts`.
- **Consumers (all server-side):** `app/layout.tsx` (`generateMetadata` via
  `lib/construct-metadata.ts`, `generateViewport`, and Organization/WebSite/LocalBusiness
  JSON-LD via `lib/jsonld.ts`) and `app/manifest.ts` (the PWA manifest).
- **Applies at runtime — no rebuild.** The root layout and manifest are `force-dynamic`, so a
  save shows up on the **next page load**. (This is why config is a file, not a `NEXT_PUBLIC_*`
  env var — those are baked into the build and would need a rebuild.)

## Images
Branding images are **not** stored in the config — they live in object storage (the Media
service). The config holds only references:
- Picture fields (logo, OG, illustrations, author photo) store the URL `/api/media/{id}/file`.
- PWA/favicon icons store a generated **icon set** `{ id, files }`. The admin uploads one
  square logo → `POST :3300/media/generate-icons` builds favicon / apple-touch / 192 / 512 /
  og / manifest. The Shell serves them via `/api/media/icons/{setId}/file/{name}` (public).

## Editing
Use the **Site Settings** panel. Text fields are plain inputs; image fields use the built-in
crop tool and upload to object storage; the icon field generates a full set from one square
logo. You may save a partial config — the app fills the rest from the defaults.

Do not hand-edit `APP-CONFIG/app-config.json` on disk unless you understand the shape in
`config/app-config.defaults.ts`; prefer the panel.
