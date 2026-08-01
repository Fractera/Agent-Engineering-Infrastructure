# DESTINATION `storage` — the bytes themselves

**Function:** `deliverStorage` (derived). **Keys:** none — the store is a folder inside the automation.

Files: images, documents, anything that is not text. The third store, and the only one that holds something
a human could open outside this system.

## What its function does

Puts the object into the folder's storage under an unpredictable key, and keeps a row that points at it. The
key is the capability: whoever holds it can fetch the object, which is why it is not guessable.

## The row points at the object, never the other way

A database row stores the `fileKey`; the bytes live here. One object may belong to several records — that is
normal and is exactly why the reference lives on the row.

## What it must never do

- **Never inline bytes into a record.** A row with a picture inside it stops being searchable and starts
  being expensive.
- **Never lose an object because nothing claimed it yet.** An unattached file stays, waiting to be linked.
  Deleting what nobody has claimed yet is the one irreversible mistake this store can make.
- **Never trust the sender's file name** as a key.

## When to reveal it

Whenever the automation receives files at all. It costs nothing when unused.
