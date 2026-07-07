# fractera-automations — the @fractera_auto automations listener (step 200/201)

Substrate service (sibling of `fractera-cron`). Polls the **automations** Telegram bot (@fractera_auto),
matches each message against the global `project_hooks` registry (deterministic normalized-phrase lookup),
and POSTs the owning automation's `/run` route with the message as input. No Hermes dependency; inert when
`AUTOMATIONS_BOT_TOKEN` is absent.

Standard: `fractera-next-starter/CRUD-DOCS/workspace-standards/agent-channel-routing.md` §3.

## Why a SEPARATE bot from the Hermes chat bot

Telegram's `getUpdates` gives each update to exactly ONE consumer. If the automations listener and the Hermes
gateway poll the **same** bot, whichever polls first eats the message and the other never sees it (the root
outage: Hermes ate every message, 0 automation records). So **@fractera_auto MUST be a different bot** from the
Hermes chat bot (@fractera_bot). Create it in BotFather → its token → `AUTOMATIONS_BOT_TOKEN`.

## Env (`services/automations-listener/.env`, written by bootstrap)

```
AUTOMATIONS_BOT_TOKEN=<the @fractera_auto bot token — DISTINCT from the Hermes chat bot>
DATA_URL=http://127.0.0.1:3300
DATA_SECRET=<same as other substrate services>
APP_URL=http://127.0.0.1:3000
POLL_TIMEOUT_S=25
```

## Bootstrap registration (additive — the same pattern that added fractera-cron, step 179)

In `fractera-easy-starter/lib/bootstrap.sh` (L1), beside the fractera-cron block (~line 546) and its start
step (~line 813):

```sh
# Substrate automations listener (fractera-automations, step 201) — @fractera_auto receiver.
mkdir -p /opt/fractera/services/automations-listener
cat > /opt/fractera/services/automations-listener/.env <<ENVEOF
AUTOMATIONS_BOT_TOKEN=${AUTOMATIONS_BOT_TOKEN:-}
DATA_URL=http://127.0.0.1:3300
DATA_SECRET=${DATA_SECRET}
APP_URL=http://127.0.0.1:3000
POLL_TIMEOUT_S=25
ENVEOF
```
```sh
step "start_automations" "Starting automations listener" \
  "cd /opt/fractera/services/automations-listener && pm2 start node --name fractera-automations -- server.js && cd /opt/fractera"
```

The service file (`server.js`) ships in `ai-workspace/services/automations-listener/` and is copied to
`/opt/fractera/services/automations-listener/server.js` by the normal repo clone during deploy — no separate
copy step (it lives inside the cloned ai-workspace). Confirm the deploy clone path covers `services/*`.

## Runtime contract

- Poll `getUpdates` (long-poll) on the automations-bot token; in-memory offset (acked updates are dropped
  server-side, so a restart never reprocesses).
- On each `message.text`: `normalizePhrase` (byte-identical to `lib/hooks/normalize.ts`), match against
  `project_hooks` (`norm === hook` or `norm.startsWith(hook + " ")`), longest-phrase-first.
- On a match: `POST {APP_URL}/api/projects/<cat>/<slug>/run` with
  `{ input: JSON.stringify({ source:"telegram", chatId, messageId, text, date, action }) }`.
- The automation does the work and REPLIES via the bot itself (its `reply-in-telegram` node). The listener
  never replies.

## Pairing with the automation (step 201 reception switch — telegram-notes)

The automation stops self-polling: its `cron.json` getUpdates job is removed; its reception node consumes the
listener's `input` instead of calling getUpdates. Time-based work (reminder delivery) keeps its own cron.
The automation's own `TELEGRAM_BOT_TOKEN` in the slot must be the **automations-bot** token (step 202) so its
replies go out on @fractera_auto.
