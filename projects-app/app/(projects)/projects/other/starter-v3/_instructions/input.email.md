# CHANNEL `email` — a letter arrives

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

**Function:** `receiveEmail` (derived). **Keys:** the provider's inbound configuration.

Mail pushed into a door of ours by the provider. The one channel whose authentication is deliberately
different — and that difference is written down on purpose.

## Authentication — the recorded exception

An inbound channel whose provider PUSHES into our door authenticates by the provider's **signature**, not by
a session. This is not an oversight to be "fixed" with the ordinary authorize check: a mail provider has no
cookie. Read the comment in `api/inbound-email` before changing anything here.

## What its function does

Normalises the letter — sender, subject, body, attachments — into the automation's shape. HTML is reduced to
text at the door, so nothing downstream needs to know that mail is markup.

## What it must never do

- **Never fetch mail itself.** No IMAP loop, no scheduled pull: the letter is delivered to us.
- **Never trust the sender field alone.** It is text; the signature is the proof.
- **Never answer from the door.** Replies leave through the output email channel.

## When to reveal it

When work naturally arrives as letters — forwarded documents, requests, receipts. Otherwise it stays hidden.
