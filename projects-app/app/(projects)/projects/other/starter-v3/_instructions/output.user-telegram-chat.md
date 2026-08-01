# DESTINATION `user-telegram-chat` — the answer in the owner's own chat

**Function:** `deliverUserTelegramChat` (derived). **Keys:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_USER_CHAT_ID`.

Where the automation talks to its owner. The most-used destination of a personal automation, and the one
where a wrong word is noticed instantly.

## What its function does

Sends the composed reply to the owner's private chat. A chat named by the run outranks the configured one.

## What it must never do

- **Never compose the answer here.** The reply is built on the route. A delivery door that reaches for a
  model is the defect the intent layer and the reply contract exist to prevent — and it is exactly what v2
  did.
- **Never send twice for one run.** Two doors carrying the same answer is a duplicate to the human, whatever
  the graph thinks.
- **Never fall silent on failure.** If the message did not go, the run did not succeed.

## When to reveal it

Almost always for a personal automation: it is where the owner already is.
