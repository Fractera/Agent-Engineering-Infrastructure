# The database: what is already built

Your project already has a database. It is running, it already holds rows, and you
did nothing to make that happen.

## What you never have to do

**No schema to design.** No tables, no relations, no column types to plan. A new
table is declared once in the project and appears in every environment by itself —
on your server and in the local copy on your laptop. There are no migration files,
no "apply migration" button, and no state where the server's schema is newer than
the local one.

**No account to register anywhere.** The database is a file on your server. There
is no cloud account to create, confirm by email, renew and not lose. There is no
second company holding your data.

**No moment when the free plan ends.** The familiar path of a cloud database: free
at first, then "you have grown — pay for a plan", then "pay per request and per
gigabyte". That step does not exist here by construction: the database costs
exactly what your server costs and not a penny more, however many queries it
serves.

**No bill for a traffic spike.** A surge does not turn into an invoice. It turns
into load on a processor you have already paid for.

## What to do when the project grows

Take a bigger server. It is a level, predictable step: the price grows linearly and
modestly, and the data travels with you because it is a file. No migration between
pricing tiers, no export out of somebody else's storage.

## How we spend your server carefully

**Pages are prepared ahead.** A public page does not query the database when a
visitor opens it — it is already built. A hundred visitors and a hundred thousand
cost the same.

**Answers are cached with a stated lifetime.** Where data really is needed at
runtime, the answer lives in a cache and is re-asked on a schedule, not per visit.

**Queries are kept to a minimum.** The product list is one query per page, not one
per product — which is exactly why image dimensions and placeholders are stored
next to the row.

**The backup is a file too.** Export and restore live in the panel and work on the
whole thing, not table by table.

## The honest boundary

This is a database for a site, not for a bank: it is meant for one server, not a
cluster of ten. Projects that need several servers sharing one database will need a
different solution — and that is a normal growth line, not a failure. While you are
on one server, you pay for the server and for nothing else.
