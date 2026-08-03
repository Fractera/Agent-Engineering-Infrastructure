# CLASS `refuse` — the request that must not be answered

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

**Where the answer lives:** nowhere it may lawfully come from. **Routes to:** SPEECH, then an output — never the middle. The refusal is worded by the speech layer, in the language of the chat; this class only declares `speechAct: refuse` (step 312.5).

A request for a secret of the server it runs on — a password, an API key, a connection string, the
contents of an env file. The automation does not hold these to hand out, and «the owner asked» is not a
reason: a chat is not an authenticated channel for secrets, and the person typing may not be the owner.

## Why it stands FIRST in the core

Precedence is the order of class nodes, and this one is first on purpose: a refusal must happen before any
content class recognizes something familiar in the wording and walks the request into the middle. By the
time a store or an external tool is touched, the refusal is already too late.

## How it recognizes

Deterministically, from a short closed list of forms (password, api key, secret, token, credential,
connection string, `.env`). No model: the list is finite, and a class that needs no key keeps working on a
server where nothing has been configured yet.

## What it must never do

- **Never explain the refusal by describing what it protects.** «I cannot give you the database password»
  already tells an attacker there is a database and a password. Refuse plainly, without an inventory.
- **Never negotiate.** No «unless you are the owner», no «send me the admin code first» — that is a
  credential-collection flow, and building one is out of bounds.
- **Never widen it into a moral filter.** This class is about secrets of the running system, not about
  policing the owner's subject matter. A request that is merely unusual belongs to another class.

## Reuse

Fully domain-neutral: every automation on every server has secrets to not hand out. Copy as is.
