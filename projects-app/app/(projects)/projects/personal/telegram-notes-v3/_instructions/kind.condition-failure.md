# KIND `condition-failure` — the named end of a path

PORTS (law, not a choice): `in` — required, and only from a `transform`. `out` — PROHIBITED: nothing
continues past it, ever. No channel: `ioType` is `null`.

WHAT IT IS FOR: it states, in the owner's words, WHY the run stopped here — "no date in the text",
"the client is not in the list", "the calendar refused". A run that ends at such a node ended
honestly; a run that dies inside a function with no node to point at is a defect. Code lives in
`_lib/nodes/<function-name>.ts`.

- ONE REASON, ONE NODE. Two different reasons to stop are two failure nodes, not one node with an
  "or" in its name — the owner must see on the canvas WHICH wall his run hit.
- IT CANNOT DELIVER ANYTHING. There is no edge out, so it cannot answer the sender, write to a table
  or send an email. If the owner must be TOLD about the failure, that message is a normal flow: the
  failure is detected upstream by a `condition-success` whose property is "there is something to
  report", and delivered through a door. Do not try to smuggle delivery into this node.
- IT IS NOT AN ERROR HANDLER. A crash inside a function is handled by throwing; this node is for
  outcomes you EXPECTED and chose not to continue from.
- NAME EVERY FAILURE YOU DELIBERATELY SURVIVE. Walking the failure surface on purpose (passport §8.5)
  is what turns an automation from "it broke" into "it stopped here, for this reason".
