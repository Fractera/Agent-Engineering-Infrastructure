# KIND `input` — the door a channel of the outside world pushes work through

PORTS (law, not a choice): `in` — prohibited, nothing flows into it. `out` — required, into a
`transform`, and into nothing else.

CHANNEL: `ioType` is one key of the input vocabulary — `control-panel`, `webhook`, `cron`,
`public-page`, `telegram-bot`, `user-telegram-chat`, `email`, or `custom`. It is fixed for life.
(`hermes` was REMOVED from this vocabulary by the owner in step 293: an automation is not fed by the
workspace's agent runtime. Do not put it back.)

ITS FUNCTION does exactly one thing: take the envelope the channel pushed in and RETURN THE SHAPE THE
MIDDLE ALREADY CONSUMES — the same key names every other door produces. Parsing belongs here;
deciding does not, and neither does business work. Code lives in `_lib/nodes/<function-name>.ts`.

- The event ARRIVES; you never fetch it. No polling loop, no scheduled fetch of your own input.
- `cron` is the one channel that is a clock rather than a message: its envelope carries the tick time,
  and it exists for scheduled OUTPUT work, never for pulling someone else's input.
- If the envelope is malformed, throw. The failure belongs to a `condition-failure` downstream, not to
  a quietly empty result.
- One channel, one door: a second channel is a second node, never a branch inside this one.

## KEYS — the one law of connecting a channel (step 293)

A channel that needs credentials DECLARES them in its own `envKeys`, and nowhere else. The declaration
is the whole contract:

- the VALUES live in the project's runtime environment, never in a file of this folder. They are
  written and read through the single door `api/env` — one key per call, presence-only on read. A
  secret is never echoed back, not even to the owner's own page;
- WHAT each key is — its human name, where to get it, whether it is secret or optional — lives in the
  catalogue `_components/channels.ts`. Two facts, two homes: which keys are needed is a property of
  THIS automation, what a key means is a property of the service;
- the keys are PROJECT-WIDE (the owner's decision): one Resend account, one bot, one set of keys for
  every automation in the project — the same shape as the single global OpenAI key;
- a channel is REVEALED only after its required keys are present, and **the DOOR enforces it**, not a
  screen: `api/patch` with `op: "visibility"` refuses to reveal a node whose required keys are missing,
  and names them. It lives there because the door is the one place everything passes through — canvas,
  menu, agent alike. In a component the law would guard one screen out of three. An OPTIONAL key
  (empty = a lawful default) never blocks a reveal. Revealing a channel that cannot connect would be a
  lie told on the canvas.

An inbound channel whose provider PUSHES into a door of ours (email is the first) authenticates by the
provider's SIGNATURE, not by a session — see the comment in `api/inbound-email`. That is an exception
written down on purpose, not an oversight to be "fixed" with `authorize`.
