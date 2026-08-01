# DESTINATION `email` — a letter leaves

**Function:** `deliverEmail` (derived). **Keys:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, optionally `RESEND_TO_EMAIL`.

The destination for people who are not sitting in a chat: a formal record, a document, someone outside the
automation's world.

## What its function does

Puts the result into a letter and sends it through the provider. Recipient and sender come from the run when
it named them, otherwise from the declared keys.

## What it must never do

- **Never send silently on failure.** A refused or failed send must throw; a swallowed error is a letter the
  owner believes was delivered.
- **Never send without a recipient.** No address in the run and none configured → skip honestly with a
  reason. Guessing an address is unrecoverable.
- **Never put a secret in a letter.** Mail is forwarded, archived and read by others.

## When to reveal it

When the recipient is outside the automation — a client, an accountant, an institution. For the owner
himself a chat is faster and cheaper.
