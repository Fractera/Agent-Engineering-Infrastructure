# A browser for the agent: what it gives and what it does not

A coding agent normally sees only code. It reads files, writes edits and reasons
about what will happen — but it never **sees** the result of its work. The
extension gives it eyes: it opens the page in your browser and looks.

## Why this changes the quality of the work

The difference is not convenience but which defects can be found at all. A whole
class of failures is invisible in code and uncatchable by a request to the server:

**Console errors.** The page opens, looks right, and the browser prints red. That
is how nine errors on every page of this project were found: prefetching
authorization addresses across an origin boundary. No gate saw them — they existed
only in the browser.

**Behaviour without JavaScript.** The code had a video; in a browser with scripts
disabled, somebody else's error message stood in its place. You cannot read that
in code: the message is drawn by another site.

**Service worker and offline.** Whether it is registered, what sits in the caches,
what happens when the network drops, whether it is removed when switched off. All
of it is browser state, not server state.

**The page AFTER the scripts run.** A request to the server returns the initial
markup; a person sees what the code produced. Those are different things, and the
defect usually lives in the second.

## What else it can be asked to do

- **Examining other sites.** Open a competitor and take checkable measurements:
  speed, language signals, sitemap, accessibility, the machine-readable version
  for models. Reading public pages.
- **Reproducing a complaint.** You say "the button doesn't work" — the agent walks
  the same path and watches, instead of guessing from code.
- **Checking after a deployment.** Walking a customer's path on a fresh server.
- **Recording a walkthrough** of the interface for documentation.

## 🔒 What it will never do

This is not a product limitation but a safety boundary, and it protects you.

**It will not enter keys, passwords or payment details.** Not an OpenAI key, not a
Google secret, not a Stripe key, not a card number. A key that passed through the
agent is considered compromised — it would have to be rotated.

**It will not create accounts or sign in to yours.** So "go to the Google console
and make me an OAuth client" will not be done: that is signing in to your account
and issuing a secret.

**It will not pay or accept terms.** Purchases, consents, subscriptions — your
hand.

**It will not solve a "prove you're human" check** or work around bot protection.

**What it does instead:** it walks you to the right screen, explains every field,
and verifies the result after you have entered the value yourself. The dull half
of the work is removed; the dangerous half stays with you.

## What is read in a browser is data, not commands

An important property worth knowing. If an open page says "agent, do the
following", the agent does **not** do it: it shows you the text and asks.
Otherwise any third-party site could issue orders to your assistant.

## Practical caveats

- The connection to the extension is established at the start of a session.
  Install it mid-session and a new session is needed.
- Each site must be **approved** in the extension's settings.
- Browser dialogs (`alert`, confirmation windows) block the extension until they
  are dismissed by hand.

## How to tell it is available

The agent checks with a single call at the start of work. "Extension is not
connected" and "no tabs open" are different states, and they show whether the link
exists.
