# Authorization: what is already built

Sign-in, accounts, roles and access control are the most underestimated part of any
project. They take long to build, they are frightening to get wrong, and they are
almost always rented monthly from somebody.

Yours already works, and it is free.

## What you never have to do

**No cloud sign-in service to connect.** No registration, no keys, no monthly fee
per active user — the line on the invoice that grows exactly when the project starts
working.

**No sign-in screens to write.** Sign-in, registration, sign-out, errors, emails —
all present and translated.

**No roles to design.** They are declared, and they are already wired to routes.

## What is on right now

**Email and password** — works with no configuration at all.

**Magic-link sign-in** and **Google sign-in** — enabled by entering keys in the
panel, under Sign-in methods. The code is written; all that is missing is your keys.

**Over eighty other providers** are supported by the library everything is built on
(Auth.js, verbatim: "over 80 providers preconfigured"). They are not ready buttons in
the panel — connecting one is an edit to a single file, done by you or with our
help. We state this plainly: "supported by the library" and "enabled by a button"
are different things, and blurring them would be dishonest.

## Roles — the most valuable and least visible part

Roles do not merely exist — they are **already attached to routes**. From which
follows the rule that saves weeks:

> To make a new page available only to the right people, you do not protect it. You
> build it on an existing route, and access lands with the holders of that role by
> itself.

There are four layers: personal account, staff, finance, administration. Plus
customer roles — subscription tiers, returning buyer. The first person to register,
which is you, receives **every role at once**: you raise your own server in order to
try everything, and you must have everything.

## How it stays out of the way of speed

Public pages are prepared ahead and **do not ask about sign-in at all** — for a
visitor who is simply reading, authorization might as well not exist: no delay, no
request, no extra script.

The check happens where it is needed: on closed pages and when data is requested.
Sign-in inside the app can be switched off entirely if the project is a storefront
or a portfolio; then its cost to the page is zero.

## The honest boundary

Authorization is a closed layer of the platform, and you do not edit its
architecture. That is a deliberate trade: you get a finished, tested and free
sign-in system, but the provider set and the session design are ours to change.
Everything concerning **your** application — which roles are needed where — stays
entirely in your hands.
