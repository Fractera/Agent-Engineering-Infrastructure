# DIALOGUE-FORMAT.md — say back what you understood, before you build it

**Every answer opens by restating the request in your own words. Not a quote back — an understanding,
offered for correction.**

This is the cheapest instrument in the project. A misread request is discovered either in one sentence,
here, or after a day of building the wrong thing.

## The block

Four moves, in this order:

> **Have I understood you correctly** — you are talking about **{the subject, in your own words}**.
>
> **That means we are going to** **{what will actually be done — files, behaviour, the visible change}**.
>
> **And what should come out is** **{the result, stated so that it can be checked}**.
>
> **If I have understood you wrongly, say it again and I will correct course.**

The last line is not politeness. It is the invitation that makes the first three safe to be wrong.

## Why this exists

**Most requests here are spoken, not typed.** Dictation drops words, merges sentences and mangles names —
"класс" becomes a school grade, a slug becomes a stranger's word, a negation disappears entirely. The
owner sees what he meant; you see what the microphone produced. The restatement is where those two texts
are compared, and it is the only place where the comparison is cheap.

**A wrong reading does not announce itself.** It produces working code, a green build and a confident
report — for a task nobody asked for. Every proof you then present is a proof about the wrong thing.

## Restate the meaning, never the wording

Repeating the request back in slightly different words proves nothing: the same misunderstanding survives
a paraphrase intact. What you say back must be **your reading of the intent** — the thing you would build
if the owner walked away right now.

- Name the **subject** in your own vocabulary, not his.
- Say what you will **change**, concretely: which files, which behaviour, what the person will see.
- State the **result as something checkable**, not as a feeling ("the panel stops showing a stale
  warning", not "it will work better").
- Say what you are **not** going to do, when the boundary is not obvious. Misunderstandings live in the
  scope far more often than in the subject.

## When the request has two readings

Do not pick one silently. Show both in one line each, say which you are taking and why, and carry on.
The owner corrects a stated choice in five seconds; he cannot correct a choice he never saw.

## Proportion

**The block is sized to the request.** A one-line ask gets a one-line restatement — "understood: clear the
disk cache, project untouched" — and that is the whole block. A step, a new capability or anything that
touches more than one file gets the full four-move form.

Never skip it silently. If there is genuinely nothing to restate — the request is a single unambiguous
fact — say the one sentence anyway and move on.

## You state, you do not wait

The restatement is not a permission gate. State it and keep working in the same answer: the owner reads it
first and stops you if it is wrong.

**One exception.** When the two readings would produce *materially different work* — different files,
different result, hours in either direction — stop after the block and ask. That is the only case where
waiting is cheaper than building.

## Assumptions are part of the block

Anything you had to decide for yourself belongs in the restatement, marked as your decision: "I am
assuming the switch is on by default". An assumption stated is a question the owner can answer in passing;
an assumption buried in code is a defect discovered later.

## The command

The owner may ask for this explicitly, at any moment, with the command listed in the instruction-set block
of `CLAUDE.md`. It means: **stop and tell me how you understood me** — before anything else happens.

Then the full four-move form is required, no matter how small the request looked, and you do wait for the
answer. That is what the command is for.

**Near-variants of the phrase count as the same command.** The instruction-set block lists one canonical
wording, but the owner speaks it, and a spoken command is never word-perfect — *"are we understanding each
other correctly"*, *"tell me what you understood"*, *"правильно ли мы друг друга понимаем"* are the same
request. Refusing one because the words were rearranged is a defect, not discipline.

## When this document is switched off

Do not open with the block and do not apologise for its absence. Answer directly. The owner switched it
off deliberately, usually to keep a small task short — and the command above still works whenever he wants
the restatement once.
