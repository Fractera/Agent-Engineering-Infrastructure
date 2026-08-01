# CHANNEL `custom` — the open door of the input side, and the law for adding a channel

Not a channel. The single lawful way to add one, plus the rules that keep additions rare. `custom` sits in
the input vocabulary but is EXCLUDED from the group's quota: no node is born with it, one is made when a
channel is actually needed. It is also the `ioType` the input connector carries — the tail that speaks
whatever a neighbouring automation speaks.

## Default answer: no

The seven doors already cover the shapes work arrives in: a human on our page, a human in a chat, a machine
over HTTP, a clock, a stranger on the public surface, a letter. Most "we need a channel" is really one of:

1. **A source mistaken for a channel.** Three different systems posting HTTP are three senders on ONE webhook
   door, not three channels. The channel is the SHAPE of arrival, not who sends.
2. **A capability mistaken for a channel.** "We must read PDFs" is work for the middle; the letter still
   arrives by email.
3. **A schedule mistaken for a channel.** "Every morning" is the clock, whatever it then does.

## The three questions that must all pass

Answer all three in the node's `description`:

1. **Does work ARRIVE in a way none of the seven describes?** A new transport, not a new sender and not a
   new subject.
2. **Is it PUSHED?** If you would have to poll for it, it is not an input channel — polling is forbidden here
   and a clock plus middle work is the honest shape.
3. **Would it exist in a completely different business?** Replace the subject with any other noun. A channel
   that only makes sense for one domain is not a channel.

Fail any one → not a channel.

## How to add one

1. Add the value to `InputChannelSchema`. The group's quota is COUNTED from the vocabulary, so it moves by
   itself — and one more node becomes mandatory in every automation, which is why this is not a light step.
2. Register `input.<channel>` in `SYSTEM_INSTRUCTION_NAMES` and write its law; the module refuses to load if
   a channel has no registered instruction.
3. Write the function — its name is DERIVED (`receive` + the channel in PascalCase), not chosen — and register
   it in `_lib/nodes/index.ts`.
4. Declare the channel's keys in the node's `envKeys` and describe them in `_components/channels.ts`.
5. `npm run check:core`, then prove it with a real run through the new door.

## What must never happen

- **Never a door that polls.**
- **Never a door that classifies or answers.** It normalises; the front decides; the route replies.
- **Never a door revealed without its keys** — the `api/patch` visibility door refuses it, and rightly.
- **Never leave it named `custom`.** Once the channel has a name, give it that name in the vocabulary.
