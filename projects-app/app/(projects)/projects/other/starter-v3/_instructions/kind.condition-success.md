# KIND `condition-success` — the branch on which the flow CONTINUES

PORTS (law, not a choice): `in` — required, and only from a `transform`. `out` — required, into
another `transform` or into an `output`. No channel: `ioType` is `null`.

WHAT IT IS FOR: it evaluates ONE named property of the data and, when that property holds, lets the
flow go on. It produces no new data — it routes. Code lives in `_lib/nodes/<function-name>.ts` and
answers exactly one question.

## 🔒 THE VALIDATOR — a condition without one always lets the flow through

A condition that does not evaluate anything is not a condition: it passes every run, and the branch it
guards is decorative. So a condition node declares the same two things a transform does, and for the same
reason (`kind.transform.md` — the law and the three levels that enforce it):

- **`outcomes`** — at least TWO. A property is rarely binary: «above the threshold», «below it», «no data
  to judge by» are three outcomes, and each deserves its name;
- **`validator`** — the function that names which outcome this run produced. Its name is DERIVED
  (`ifSuccess` → `ifSuccessValidate`) and it lives in `_lib/validators.ts`.

The engine writes the named outcome into the context and the run journal, so the branch the run took is
visible afterwards without reading code.

- A CONDITION IS A PROPERTY, NOT NECESSARILY A YES/NO QUESTION: "amount over 25", "colour is green",
  "the date was understood". Name that property in the node's `name` so the owner reads the branch off
  the canvas without opening anything.
- SEVERAL CONDITIONS MAY HANG OFF ONE TRANSFORM. That is how a fork in the road is expressed: each
  branch is its own node with its own property, not a switch buried inside a function.
- IT IS THE ONLY WAY OUT. A door — `output` or `output-connector` — accepts an edge from a
  `condition-success` and from nothing else. A result therefore reaches the owner only after something
  affirmed that it is worth delivering. That is deliberate: no silent, unchecked delivery exists.
- IT DOES NOT TRANSFORM. If you feel the need to reshape data here, that work belongs to a transform
  before or after this node.
- IF THE PROPERTY DOES NOT HOLD and that case is real, it is not this node's business: give it its own
  `condition-failure` off the same transform.
