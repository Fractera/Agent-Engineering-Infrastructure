# Agentic RAG: what is already built

Vector memory finds what is **similar**. A knowledge graph answers questions where
**connections** matter: who relates to whom, what follows from what, how one thing
affected another. Such an answer cannot be produced by stacking ten similar
paragraphs — it has to be assembled.

The service runs on your server.

## What you never have to do

**No third-party knowledge service to connect.** No subscription, no per-document
fee, no agreement about where your texts are kept.

**No preparing documents.** You hand over text; the breakdown into entities and
relations happens by itself.

**No worrying that your material leaves.** The analysis runs on your server, in its
own database.

## How it works

The text is broken into entities and the relations between them, producing a graph.
A question walks the graph rather than a list of paragraphs — which is why an answer
can rest on a chain that no single paragraph contains.

Hence an honest peculiarity: **it takes tens of seconds**. The waiting is shown by
the browser itself, and that is a deliberate choice — a spinner that lies about
progress is worse than an honest pause. In exchange the answer arrives inside the
page, reads with scripts disabled, and can be sent as an ordinary link.

## What is needed from you

An **OpenAI key** — the same one the vector memory uses. A model does the entity
extraction, and that is the only cost item: it sits with your model provider, not
with us, and you see it on your own bill.

## How it differs from vector memory

| | Vector memory | Knowledge graph |
|---|---|---|
| Answers | "what is similar to this" | "how is this connected to that" |
| Speed | instant | tens of seconds |
| Write cost | one embedding | a model parses the text |
| Use it for | search, recommendations, related | questions about links and causes |

They do not replace each other; they are two halves of knowledge. Both are included.

## The honest boundary

A graph shines on a coherent corpus — documentation, an article base, a project
history. On scattered fragments it will give little more than ordinary search, and
the parsing still costs model calls. Start with a small corpus and look at the
answers before loading everything.
