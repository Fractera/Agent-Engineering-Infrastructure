# TESTING.md — how a step is proven finished

Every step and every sub-step ends the same way: **two independent proofs, from two different planes.**
Not a summary. Not a claim. Two proofs, written out, in the shape defined below.

## Why this document exists

The rule itself is old and it kept failing. Not because anyone disagreed with it — because it named the
*goal* ("prove it works") and left the *form* of the answer free. When the form is free, the cheapest
form wins, and the cheapest form is always the one taken from a plane where the code cannot fail:

> "`npm run build` finished with exit code 0."
> "The commit hash appears in the footer."
> "The page returns HTTP 200."
> "Go ahead and test it in the browser."

Every one of those sentences is true and none of them says whether the feature works. A build proves the
code compiles. A 200 proves a page is served. A hash proves a deploy happened. **The feature was never
exercised.** Work reported that way is discovered to be broken days later, by the owner, on a live site.

So this document does not ask you to be diligent. It fixes the *shape* of the answer, so that a missing
proof is visibly missing instead of quietly replaced by a cheaper one.

## The planes

A proof lives in exactly one plane. Name the plane out loud for each proof — naming it is what forces the
check.

| # | Plane | What a proof from it looks like |
|---|---|---|
| 1 | **Compilation** | the build succeeds, types pass, a linter is clean |
| 2 | **Observable behaviour** | a real request produces a real answer: `curl` output, a rendered value, a log line the new code writes |
| 3 | **Stored state** | a row in the database, bytes on disk, a file that now exists, a queue that drained |
| 4 | **External system** | GitHub answers, a service replies, a message actually arrives in the channel |
| 5 | **Live surface** | after deploy, the public URL shows the result to a visitor |

**The law: the two proofs must come from two different rows of that table.** `npm run build` plus
`tsc --noEmit` are both plane 1 — that is one proof, counted twice. A build plus "the page opens" is one
proof about delivery and nothing about the feature.

**Plane 1 is never one of the two.** Compilation is a precondition for showing up at all, not evidence.
Report it separately, as delivery, and never in place of a proof.

## The shape of a proof

Each proof is four fields. A proof missing any field is not a proof.

1. **Plane** — the row number and name from the table above.
2. **What was actually run** — the exact command, request or click. Not "I checked" — the thing itself.
3. **The output, verbatim** — copied, not paraphrased, not summarised, not "it printed OK".
4. **Falsification** — *what this same output would have looked like if the change had NOT been made.*

Field 4 is the lock, and it is the field a cheap proof cannot fill. If the output would look identical
before and after your change, it proves nothing, and now you can see that yourself before the architect
does. A build log looks the same whether or not the button works. A 200 looks the same on the old page.

## The negative control

One passing case is compatible with the feature being permanently on, hardcoded, cached, or accidentally
right. So one of the two proofs must include a **case whose answer is required to differ**: the search
that must return nothing, the user who must be refused, the input that must be rejected, the language
that must fall back. Show both answers side by side.

Without a negative control you have shown that something happened, not that your logic decides anything.

## Not proofs — do not offer these

Each of these has been offered before and each hid a defect:

- **"It builds", "types pass", "exit code 0"** — plane 1. Says nothing about behaviour.
- **"Tests are green"** without naming *which assertion* covers the change — a green suite proves the
  suite ran, and a suite that never touched your code is green by default.
- **"I checked", "I verified", "works as expected"** — a claim, not an observation. Where is the output?
- **"It should work", "presumably", "it must be fine now"** — a prediction reported as a result.
- **The diff, the file content, the code you just wrote** — reading your own change is not testing it.
- **"Restarted successfully", "the deploy completed", "the commit hash is in the footer"** — delivery.
  It proves the new bytes are in place, and nothing about what they do.
- **"Please test it in the browser"** — handing the proof back to the architect and calling the step done.
- **A screenshot of a page that would look the same before the change** — same failure as the build log.
- **Output you did not actually see** — never write a plausible-looking result. Fabricated evidence is the
  one failure that destroys trust in every other line of the report.

## When a proof cannot be obtained

Some proofs genuinely need something you do not have: an API key, the owner's session, an architect-only
page, a paid external service, a device.

**Say so, plainly, and before reporting readiness.** Name what is missing, name the proof it would have
produced, and ask for it. Two sentences.

What is forbidden is the substitution: quietly dropping to a weaker proof from a plane you *can* reach,
and letting the report read as if the feature were verified. "I could not test X because I have no key" is
a professional answer. A build log presented where a behaviour proof belonged is not.

## Closing a step

- **No two proofs ⇒ the step is not closed.** The word "done" is not available. Say what is proven, what
  is not, and what is missing.
- This applies to **sub-steps too**, not only to the step that ends a day of work. A sub-step whose proofs
  are deferred is a sub-step that will never be proven — the context ends first.
- Both proofs go into the report **as text**, in the four-field shape, where the architect can read them
  without opening anything.
- If a proof requires the architect to look at something only they can see, that is a fifth line in the
  report — never a replacement for one of the two.

## The report block

Copy this shape. Empty fields are visible; prose hides them.

```
PROOF 1 — plane <n>, <name>
  ran:            <command / request / action>
  output:         <verbatim>
  proves:         <which line of that output means the change works>
  would look like: <what this output would be WITHOUT the change>

PROOF 2 — plane <m>, <name>          (m ≠ n)
  ran:            …
  output:         …
  proves:         …
  would look like: …

NEGATIVE CONTROL
  case:           <the input whose answer must differ>
  answer:         <and it did differ, like this>

DELIVERY (not a proof)
  build / deploy / restart: <exit codes, hashes>

NOT VERIFIED BY ME
  <what needs the architect, and why I could not reach it>
```

## The command: proofs on demand

The owner may ask for the proofs at any moment, with the command listed in the instruction-set block of
`CLAUDE.md`. It does not switch anything on — this document is already on. It means: **stop and produce
the two proofs for what you have done so far**, in the shape above, without waiting for the step to close.

Answer it with the form, not with a summary. If one of the two planes is out of reach at that moment, say
which and why — that sentence is part of the answer, never a reason to send one proof as if it were two.

**Near-variants count as the same command.** It is spoken, so *"show me the proof"*, *"докажи"*,
*"предоставь доказательства"* are one request. Refusing because the words were rearranged is a defect.
