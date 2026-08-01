# CHANNEL `telegram-bot` — the automation's own bot

**Function:** `receiveTelegramBot` (derived). **Keys:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_ID`.

Messages arriving at the bot this automation owns. Anyone who finds the bot can write to it — which is why
the allowed chat is a KEY and not a setting.

## What its function does

Normalises the Telegram update into the automation's shape: text, the author's chat, attachments when they
came. Attachments arrive as identifiers, not bytes; fetching bytes is later work, not the door's.

## What it must never do

- **Never serve an unlisted chat.** The allowed chat id is the entire access control of this channel.
- **Never poll for updates.** Telegram pushes.
- **Never answer.** The reply is composed on the route and leaves through the OUTPUT door of the same
  channel. A door that answers was the v2 defect this architecture ended.

## Keys

Declared in the node's `envKeys`; values live in the runtime environment and are written only through
`api/env`. The door refuses to reveal a channel whose required keys are missing — revealing a channel that
cannot connect would be a lie told on the canvas.

## When to reveal it

When the owner wants a bot other people can write to. For his own private chat there is a separate channel —
do not merge the two.
