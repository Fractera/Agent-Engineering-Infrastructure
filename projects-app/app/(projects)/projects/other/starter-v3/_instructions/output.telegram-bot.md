# DESTINATION `telegram-bot` — an answer through the automation's own bot

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

**Function:** `deliverTelegramBot` (derived). **Keys:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_ID`.

The reply side of the bot channel: the automation answers in the chat the message came from, or in the chat
the keys allow.

## What its function does

Sends the composed reply to the chat. What is SAID is decided on the route; this door only carries it.

## What it must never do

- **Never compose the answer here.** A delivery door that writes text is the v2 defect this architecture
  ended: the reply belongs to the route, so that one automation speaks with one voice regardless of which
  door it leaves through.
- **Never answer a chat that did not write.** The allowed chat is the boundary.
- **Never swallow a rejected send.** Telegram refusing must fail the run, not pass quietly.

## When to reveal it

Together with its input channel: a bot people can write to and cannot get an answer from is worse than no
bot at all.
