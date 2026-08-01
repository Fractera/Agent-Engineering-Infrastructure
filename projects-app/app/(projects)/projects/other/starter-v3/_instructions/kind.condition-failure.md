# KIND `condition-failure` — the named end of a path

PORTS (law, not a choice): `in` — required, and only from a `transform`. `out` — REQUIRED, into an
`output` (step 311.8). No channel: `ioType` is `null`.

🔒 **A FAILURE IS NO LONGER A DEAD END.** Until this law the outgoing port was FORBIDDEN — a failed run
reached no output at all, and the human learned neither what happened nor why. The silence looked exactly
like success. Now the branch leads out, in practice into the `toast` channel, which cannot be hidden
(`output.toast.md`): «failed silently» stopped being an expressible state.

WHAT IT IS FOR: it states, in the owner's words, WHY the run stopped here — "no date in the text",
"the client is not in the list", "the calendar refused". A run that ends at such a node ended
honestly; a run that dies inside a function with no node to point at is a defect. Code lives in
`_lib/nodes/<function-name>.ts`.

## 🔒 THE VALIDATOR — a condition without one always lets the flow through

A condition that does not evaluate anything is not a condition: it passes every run, and the branch it
guards is decorative. So a condition node declares the same two things a transform does, and for the same
reason (`kind.transform.md` — the law and the three levels that enforce it):

- **`outcomes`** — at least TWO. A property is rarely binary: «above the threshold», «below it», «no data
  to judge by» are three outcomes, and each deserves its name;
- **`validator`** — the function that names which outcome this run produced. Its name is DERIVED
  (`ifFailure` → `ifFailureValidate`) and it lives in `_lib/validators.ts`.

The engine writes the named outcome into the context and the run journal, so the branch the run took is
visible afterwards without reading code.

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
