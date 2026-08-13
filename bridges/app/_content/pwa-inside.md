# Progressive web app: what is already built

A **progressive web app (PWA)** is a site a phone can install like an ordinary
application: an icon on the home screen, a launch without the address bar, its own
splash screen. No app stores, no review, no separate iOS and Android builds — the
same site.

## What your project does

It serves a **manifest** — `/manifest.webmanifest` — which is how a phone knows the
site can be installed. The manifest is built from your settings:

| Field | What it is for the user |
|---|---|
| `name`, `short_name` | how the app is labelled on the screen |
| `description` | the description shown when installing |
| `start_url` | the page it opens on |
| `scope` | what counts as "inside the app" |
| `display` | with the browser bar or without it |
| `orientation` | portrait, landscape or any |
| `theme_color` | the colour of the status bar |
| `background_color` | the splash colour at launch |
| `icons` | 192 and 512, including a **maskable** one |

## About icons — the part where people usually get stuck

One image is not enough. Android wants 192 and 512, plus a separate **maskable**
one (the system clips it to your launcher's shape — circle, rounded square,
teardrop), an iPhone wants its own `apple-touch-icon`, and the browser wants a set
of `favicon` sizes including the old `.ico`.

**You upload one image and the panel cuts the whole set.** By hand this is a few
hours in a graphics editor for every logo update.

The theme colour is also declared **separately for light and dark**: otherwise the
status bar on a dark-themed phone takes the wrong colour and the installed app
looks like someone else's.

## An honest boundary: offline is not included

The project ships **no service worker** — the background intermediary that can
serve pages with no network.

That is a deliberate boundary, not forgotten work. A service worker caches your
site on the device, and from that moment a user can be left holding **yesterday's
version** of a page without knowing it; fixing that takes update strategies, and
those strategies are where the time goes in projects that genuinely need offline.

So: installing to the home screen, launching as an app, icons and theming all
work. Reading on a plane with no network does not.

## What is left for you

Upload one image and pick the colours in the application settings. The rest is
assembled for you and follows your settings without a rebuild.
