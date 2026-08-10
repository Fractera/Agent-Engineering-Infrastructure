# CONTEXT-STATE.md — the handoff between two context windows

<!-- fractera:context-state v1 -->

**state:** empty
**written_at:** —
**session:** —
**git_head:** —
**git_dirty:** —
**step:** —
**substep:** —
**next_action:** —

---

## What this file is

A context window ends. Sometimes it ends politely, with a compaction; sometimes the machine is switched
off mid-sentence. Either way the next session starts cold, and the most expensive minutes of this project
are the ones a new session spends re-deriving what the previous one already knew — usually getting it
subtly wrong.

This file is the one thing that crosses that gap. It is **written by the model, not by hand**, and it is
deliberately small: it is injected into every new session, so every line in it is paid for again and
again. It answers three questions and nothing else — what was being done, where it stopped, and what the
very next physical action is.

It is **not** a diary and **not** a summary of the work. History lives in git; decisions live in
`LESSONS.md`; what the product is for lives in `USE-CASES.md`. This file is the baton, and a baton is
useless if it is heavy.

## When the model writes it

Writing starts long before the window is full, because the failure this file exists for is exactly the
one that gives no warning.

| Context used | What the model must do |
|---|---|
| **50%** | Write this file — now, not "later". Say plainly to the architect that half the window is spent and ask which sub-step to close. |
| **65%** | Close what is open, start nothing new, refresh the "next action" line. |
| **75%** | Stop taking work. Require the architect to end the step or sub-step; anything not in this file by now is what gets lost. |

The thresholds are deliberately early. A demand that arrives at 90% cannot be obeyed: there is no room
left to close a step cleanly, and the instruction competes with the work itself. Fifty percent feels
premature — that is exactly why it works.

After the first write, keep it current: every time the next physical action changes, update the line. A
file written once and left alone describes a state that stopped being true half an hour ago.

## When the model reads it

**At the start of every session, before any other document.** A new session that starts building without
reading this file will redo work that is already done, or continue from a step that was already closed.

The reading is not passive. What is written here is a **hint, not proof** — see the law below.

## 🔒 The law of the stale baton

**The record says where the work was interrupted. It does not say where the work IS.**

The whole point of this file is that it survives an ungraceful ending: a crash, a closed laptop, a power
cut. The same ungraceful ending is what prevents the record from being updated. So the file can name step
123 while the repository has quietly passed 124, 125 and 126.

Acting on that stale line is worse than having no file at all: the model confidently rebuilds what is
already there and reports progress that is actually regression. This is the single failure mode that
makes this whole mechanism a liability instead of an asset.

**Therefore, on reading, always verify against reality before acting on a single line:**

1. `git log --oneline -10` and `git status --short` — commits do not lie about what happened; prose does.
2. Compare the repository's `HEAD` with the `git_head` recorded above. **They differ ⇒ the record is
   older than the work.** Treat it as a lead, and re-derive the current position from the commits.
3. Look at the files the record names. If the described "not done yet" work exists on disk and compiles,
   it was done after the record was written.
4. Only when reality and record agree may the record be used as the starting context.

Say out loud which of the two you are following — "the record and the repository agree, resuming at X" or
"the record is stale, the repository shows Y, I am resuming from Y". The architect must never have to
guess which one you believed.

## 🔒 The law of the consumed baton

**A baton is handed over once.** The moment a new session has read this file and established the true
position, the handoff is spent: it describes a window that no longer exists.

Where the session entry hook is installed, this is enforced mechanically: it hands the content to the new
session and resets this file to empty in the same move, keeping the previous copy under
`CONTEXT-STATE.archive/`. Then a record from three sessions ago cannot reach you.

Where it is not installed, the discipline is yours and it is not optional: **the moment you have adopted
the handoff and confirmed the real position, clear this file back to `state: empty`.** Leaving a spent
baton lying here is how the next session gets sent back to work that was finished days ago.

## What goes in it, and what never does

**In:** the current step and sub-step, the next physical action (a command, a file, a decision), the open
question waiting on the architect, the paths touched in this window, and the check that proves the work
is where it is claimed to be.

**Never in:** secrets, tokens or passwords — this file lives in your repository and travels to GitHub
with everything else. Never a retelling of the conversation. Never a list of everything done since the
beginning of the project; that is what commits are.

---

## Handoff

*(Empty. Nothing has been handed over — this is a fresh window, and there is no interrupted work to
resume. If you are reading this section and it says "Empty", start from the ordinary session entry.)*

## The command: write the handoff now

The owner may ask for the handoff at any moment, with the command listed in the instruction-set block of
`CLAUDE.md`. It overrides the thresholds: write the record **now**, whatever the window is at.

He has information the mechanism does not — he is about to close the laptop, switch chats, or hand the
work to a different session. Answer by writing the file and saying, in one line, what you recorded and
where the work actually stands.

**Near-variants count as the same command.** It is spoken: *"remember where we are"*, *"запомни текущее
состояние"*, *"запиши состояние"* are one request.

**While this document is switched off, the command does not exist** — the instruction lists commands only
for documents that are on, because a command for a switched-off mechanism would be a lie. Turning the
handoff on in the control panel brings the command with it.
