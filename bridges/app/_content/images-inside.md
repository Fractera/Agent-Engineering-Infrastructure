# Images: what is already built

Images are the heaviest part of almost any site. They are also where speed, search
rankings and a visitor's trust are most often lost — and lost invisibly: the page
looks fine while the numbers are bad.

Here is what your project does with images on its own, and why each of these
decisions shows up in search results.

## How a picture reaches the screen

Usually it arrives in a jerk. First there is empty space, then the file lands and
unfolds — and the text below jumps down. The visitor has already started reading,
and the line moves out from under their eyes.

Yours works in a different order:

**1. The page arrives with the picture already inside it.** A tiny blurred copy of
the image — **about 150 bytes** — is written into the HTML itself. There is no
separate request for it, because it came with the text. The visitor sees the shape
and colours of the coming image in the same millisecond as the heading.

**2. The space is reserved in advance.** Width and height are known before the file
starts loading, so the browser sets aside exactly the rectangle the image will
occupy. The text does not move.

**3. The real image arrives and replaces the blurred one.** The swap happens on its
own, with no flicker and no jump: the dimensions match, because they were known
from the start.

**This works with JavaScript disabled** — the blurred copy is written as a style,
not as a script.

## Why this shows up directly in search

Search engines have long measured more than text: they measure how a page behaves
for a real person. Two of the three key figures are about images:

**Layout shift.** The jump of text as an image loads is measured and hurts the
score. Known-in-advance dimensions are what remove it — from the file's real
numbers, not from a guess.

**How fast the main thing appears.** A search engine times when the largest element
on screen shows up. Often that element is an image. The blurred copy appears
instantly, and the real one arrives at the size THIS screen needs rather than at
its original size.

There is a third, less obvious one: a page that loads faster is cheaper to crawl. A
robot spends a limited amount of time on your site, and the faster pages are served
the more of them it reads in one visit.

## What else happens by itself

**Size per screen.** A phone does not download a file made for a large monitor. The
needed sizes are produced from one original — on demand rather than in advance —
and the result is cached.

**Format per browser.** Modern formats (webp, avif) go to browsers that understand
them, older ones to the rest. Nothing to arrange separately.

**Lazy loading.** Anything below the first screen loads only when the visitor
reaches it. Until then the blurred copy stands there — not emptiness.

**The same for project files and for your uploads.** An image you upload through
the panel takes the same path: dimensions are measured and the blurred copy is
computed at upload, and both are stored beside the image itself.

## Why the copies are computed ahead of time

A blurred copy cannot honestly be made in the browser: to produce it you must first
download the image — which is exactly what we are waiting for.

Computing it on the server per view is wrong too: that means reading and decoding a
file on every visit, while your pages are prepared ahead and served without
computation. One such small thing per request, and a prepared page stops being
prepared.

So the copy is computed once: at build time for project files, at upload time for
your uploads. After that it simply sits beside the image and travels with the page.

## Honest boundaries

**Vector images (SVG) take no part in this, and rightly so.** A vector scales
losslessly, usually weighs under a kilobyte, and a blurred copy of it would be
heavier than the original.

**Images hosted on other sites** stay as they are: we cannot measure a file that is
not ours, and inventing its dimensions would be worse than leaving it alone.

**Very small icons** gain nothing from this machinery — they arrive faster than its
benefit can show.

## What is left for you

Nothing. Upload an image in the panel and it is measured, its copy computed, its
dimensions ready. Add an image to an article and the same happens at the next
build. Forgetting is impossible: a check refuses an image without dimensions.
