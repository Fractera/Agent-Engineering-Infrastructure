# SCOPE `custom` — the open door of the evolution layer, and the law for growing it

Not a scope of self-change. The single lawful way to add one, and the rules that keep additions rare.

`custom` is in the scope vocabulary but EXCLUDED from the quota, exactly like `custom` among the channels
and among the request classes: no node is born with it, one is made when it is actually needed.

## Why this door matters more than the others

This layer WRITES INTO THE AUTOMATION ITSELF. A careless new class of request makes a wrong answer; a
careless new scope of evolution makes an automation that quietly becomes something else. Every addition
here must be justified twice as hard as anywhere else.

## The three questions that must all pass

Answer all three in writing, in the node's `description`:

1. **Does it change something none of the existing scopes owns?** Behaviour, examples, voice, the graph —
   if the thing you want to change is already owned by a scope, extend that scope's rules, do not add a
   neighbour that writes to the same place. **Two nodes writing one file is the defect this rule exists to
   prevent.**
2. **Can it be undone?** If the change it makes cannot be shown as a diff and reverted by the owner, it is
   not a scope — it is damage waiting to happen.
3. **Does it survive the neutrality test?** Replace the subject with another noun — request, part, patient,
   shipment. Evolution knows the SHAPE of a dialogue; a scope that knows a business is a middle node.

Fail any one → not a scope.

## How to add one

1. Add the value to `EvolutionScopeSchema`. Decide deliberately whether it belongs in the quota: a scope
   whose work is not yet built stays OUT of it (as `graph` does today).
2. Register `evolution.<scope>` in `SYSTEM_INSTRUCTION_NAMES` and write its law — the module refuses to
   load if a scope has no registered instruction.
3. Write the function; its name is derived, not chosen (`evolveSomething`). Register it in
   `_lib/nodes/index.ts`.
4. Add the node through `api/patch` with `ioType: "<scope>"`; the quota moves by itself.
5. `npm run check:core`, then prove it on a real cycle — and prove the UNDO as well. A self-change that has
   never been reverted in a test is a self-change nobody can trust.

## What must never happen

- **Never a scope that writes where another already writes.**
- **Never a scope that applies a structural change without the owner.** The graph belongs to the owner;
  the layer may propose, never decide.
- **Never a placeholder scope.** A node that reflects on nothing is a defect, not a draft.
- **Never leave it named `custom`.** It is a staging area; once the scope has a name, give it that name in
  the vocabulary.
