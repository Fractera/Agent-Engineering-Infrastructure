# KIND `output` — the door the result leaves through

PORTS (law, not a choice): `in` — required, and ONLY from a `condition-success`: a result is delivered
on the success branch and on no other. `out` — prohibited: nothing continues past a door.

DESTINATION: `ioType` is one key of the output vocabulary — `public-page`, `dashboard`, `calendar`,
`analytics`, `map`, `email`, `telegram-bot`, `user-telegram-chat`, `vector-memory`, `database`,
`storage`, or `custom`. Fixed for life. (The three stores — `vector-memory`, `database`, `storage` —
joined the vocabulary together with the `hermes` input channel; a door is never deleted, an unused one
is HIDDEN.)

ITS FUNCTION takes what the branch handed over, puts it into the form this destination demands, and
delivers or persists it. Nothing else: no deciding, no enriching — that work belongs upstream. Code
lives in `_lib/nodes/<function-name>.ts`.

- Delivery that fails must THROW. A door that swallows an error reports success the owner will
  discover to be false days later.
- Whatever the destination needs — a key, a chat id, a table name — is declared in `envKeys` and read
  from the environment. A secret is never written into a file.
- One destination, one door. Recording to the dashboard and answering in Telegram are two nodes.
- Several branches may end at the same door; that is normal.

## The scheduler exception — read before "fixing" the calendar

"One destination, one door" has exactly ONE recorded exception, and it is deliberate: a **scheduler
channel** — today `calendar` — may declare outward INTEGRATIONS and fan the SAME due event out to
several of them. It is not three deliveries; it is one event announced in several places, and the
places are chosen per entry by the owner, not by the graph.

The limits of the exception, so it does not spread:

- it applies to a channel that WAITS for a moment and then announces it — not to ordinary delivery;
- the integrations add **no node and no edge**. They appear on the canvas as badges on that one node
  and change nothing else about the diagram;
- what may be sent is declared in the core (`entity.data.integrations` of the matching tab), what IS
  sent lives in the individual entry. Two places, and neither duplicates the other.

For every other destination the law above stands unchanged: a second addressee means a second node.
Do not "unify" the calendar with it — that would delete a capability the owner asked for.
