# Why the key here is OpenAI while the project is built with Claude models

A fair question, and the answer is three different budgets. They are what people
confuse most often, and that confusion is where money is lost.

## Three budgets that must not be mixed

**1. The developer's subscription.** Claude Pro or Max is an allowance for a
PERSON. It is issued per seat, shared with chat, and runs on rolling windows —
a five-hour one and a weekly one. It pays for writing code in Claude Code on your
machine.

**2. An API balance at Anthropic.** Metered per token. Needed by those who embed
a model into their own application.

**3. The key on this page.** It pays for the services that run ON YOUR SERVER and
answer your visitors: the Quiz, vector search, the knowledge graph. It has nothing
to do with development.

The first is about a person, the third about a server. Different things, and they
do not contradict each other.

## A trap that costs money for nothing

There is one peculiarity of Anthropic's tooling worth knowing, because many people
walk into it.

If you have a subscription AND the `ANTHROPIC_API_KEY` variable is set in your
environment, the tool picks the **key**, not the subscription. Anthropic's
documentation states verbatim:

> «If you have an active Claude subscription but also have `ANTHROPIC_API_KEY` set
> in your environment, the API key takes precedence once approved.»

The credential order, top to bottom, is: cloud providers → `ANTHROPIC_AUTH_TOKEN`
→ `ANTHROPIC_API_KEY` → a helper script → a long-lived OAuth token → profiles →
and **only last** the `/login` sign-in, which is your subscription.

**What it costs you.** The subscription keeps being charged every month, but you
are not using it in the terminal: the work draws on the API balance. You pay
twice, and you find out from the invoice.

**Are you asked?** Yes, once: in interactive mode the tool offers to approve or
decline the key it found, and your choice is remembered. Decline it and the
subscription keeps working. But in non-interactive mode (the `-p` flag — any
script or automation) the key is **always** used.

## How to check, and how to get the subscription back

**Check:** run `/status` in the session. The `Login method` row shows your
account, and an `API key` row appears when a key is in use.

**Get the subscription back:** remove the variable — `unset ANTHROPIC_API_KEY` —
or switch off "Use custom API key" in `/config`. The toggle is visible only while
the variable is set.

## What this means for your project

**We never ask you for an Anthropic key.** Not at deployment, not in the panel,
not in the application. So this trap is never opened by our product: no reason to
create such a key, no variable in the environment, no risk of the subscription
silently going unused.

The key on this page is OpenAI's and has nothing to do with Anthropic's
variables: it lives on your server and only server-side services read it.

## Why OpenAI rather than "it could have been Anthropic"

The reason is technical and hard. Vector search and the knowledge graph rest on
text embeddings. Anthropic does not have them. From its documentation, verbatim:

> «Anthropic does not offer its own embedding model.»

The same page then points to a third-party provider. So the choice is not between
"Anthropic and OpenAI" but among providers that have embeddings at all.

## An honest caveat about savings

We do **not** claim OpenAI is cheaper than Anthropic per token: prices depend on
the model and change, and such a comparison would go stale before you finished
reading it.

We claim something else, and it is checkable: **separating the budgets protects
you from paying twice.** The developer's subscription is not spent by the server,
the server is not spent from the subscription, and the credential-substitution
trap never arises here — because we create no reason to have an Anthropic key.
