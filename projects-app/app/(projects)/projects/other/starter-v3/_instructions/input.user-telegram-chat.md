# CHANNEL `user-telegram-chat` — the owner's own private chat

**Function:** `receiveUserTelegramChat` (derived). **Keys:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_USER_CHAT_ID`.

The owner writing to his automation from his phone. Distinct from the bot channel because the counterparty
is known and trusted, and because the conversation is CONTINUOUS — this is where an outstanding question and
its answer live.

## What its function does

Normalises the message into the automation's shape and marks it as the owner's. Attachments arrive as
identifiers.

## What it must never do

- **Never mix chats.** A message from another chat is not the owner's, whatever it says.
- **Never parse the request.** He writes as he pleases; understanding what he wants is the intent layer's
  work and must not leak back into this door.
- **Never keep the token anywhere but the environment.**

## When to reveal it

Almost always, for a personal automation: it is the shortest path from a thought to a record. Link it
natively (`api/telegram/link`) instead of asking the owner to find a chat id.
