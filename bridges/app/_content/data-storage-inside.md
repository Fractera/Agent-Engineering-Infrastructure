# Object storage: what is already built

Images, video, documents, audio — everything that does not fit in a table row —
already has a home on your server. There is nothing to set up.

## What you never have to do

**No cloud storage to arrange.** No bucket, no access keys, no access policies, no
separate invoice. Files sit on your disk, next to the application.

**No paying for outbound traffic.** The nastiest line on a cloud storage bill is
not storage but delivery: the more popular your site, the more you pay for people
looking at your own pictures. Here delivery comes from your server and is included
in its price.

**No thinking about permissions.** An uploaded file is immediately available at its
own address on your domain — not on somebody else's, and not behind a link with an
expiry date.

## What happens to a file on upload

Uploading is more than putting bytes on a disk. Everything that will be needed
later happens in one step:

- the file gets **its own row** — name, type, size, date;
- an image has its **width and height measured**, not guessed from the file name;
- a **tiny blurred copy** is computed — the one that appears on the page before the
  picture itself arrives;
- a **crop** chosen in the panel is applied if asked for.

From then on the row is the file's identity. Pages reference the row, not a path on
disk — which is why a picture can be replaced from the panel and changes everywhere
it appears, with no code edited.

## Sizes and formats on demand

Storage holds **one original**. Smaller copies and modern formats are produced when
a particular browser asks for them, and remembered. Cutting a dozen variants ahead
of time means guessing which sizes the layout will need and keeping waste that goes
stale at its first change.

## How this spares the server

A served file is cached for a long time — a repeat visit costs nothing. The pages
showing it are prepared ahead. Lists do not query storage for each picture's
dimensions: the dimensions already sit in the row.

## The honest boundary

A server disk is finite, and that is the one limit worth remembering: a video
library of terabytes will need dedicated storage. For a site, a catalogue, a blog
and documents, an ordinary server has room to spare — and when it does not, you take
a bigger disk, which is again a linear price with no move onto somebody's tier.
