# KIND `input` — the door a channel of the outside world pushes work through

PORTS (law, not a choice): `in` — prohibited, nothing flows into it. `out` — required, into a
`transform`, and into nothing else.

CHANNEL: `ioType` is one key of the input vocabulary — `control-panel`, `webhook`, `cron`,
`public-page`, `telegram-bot`, `user-telegram-chat`, or `custom`. It is fixed for life.

ITS FUNCTION does exactly one thing: take the envelope the channel pushed in and RETURN THE SHAPE THE
MIDDLE ALREADY CONSUMES — the same key names every other door produces. Parsing belongs here;
deciding does not, and neither does business work. Code lives in `_lib/nodes/<function-name>.ts`.

- The event ARRIVES; you never fetch it. No polling loop, no scheduled fetch of your own input.
- `cron` is the one channel that is a clock rather than a message: its envelope carries the tick time,
  and it exists for scheduled OUTPUT work, never for pulling someone else's input.
- If the envelope is malformed, throw. The failure belongs to a `condition-failure` downstream, not to
  a quietly empty result.
- One channel, one door: a second channel is a second node, never a branch inside this one.
