# KIND `output` — the door the result leaves through

PORTS (law, not a choice): `in` — required, and ONLY from a `condition-success`: a result is delivered
on the success branch and on no other. `out` — prohibited: nothing continues past a door.

DESTINATION: `ioType` is one key of the output vocabulary — `public-page`, `dashboard`, `calendar`,
`analytics`, `map`, `email`, `telegram-bot`, `user-telegram-chat`, or `custom`. Fixed for life.

ITS FUNCTION takes what the branch handed over, puts it into the form this destination demands, and
delivers or persists it. Nothing else: no deciding, no enriching — that work belongs upstream. Code
lives in `_functions/<function.name>.ts`.

- Delivery that fails must THROW. A door that swallows an error reports success the owner will
  discover to be false days later.
- Whatever the destination needs — a key, a chat id, a table name — is declared in `envKeys` and read
  from the environment. A secret is never written into a file.
- One destination, one door. Recording to the dashboard and answering in Telegram are two nodes.
- Several branches may end at the same door; that is normal.
