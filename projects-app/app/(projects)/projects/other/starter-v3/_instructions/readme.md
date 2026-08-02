# System instructions

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

The law texts themselves, one file per name. An object in the core carries the NAME of its instruction
(`systemInstructionName`), never the text: the link is visible in the object and costs one word.

```
_instructions/
  passport.md            ← the STARTING law: how to work here at all (doors, order of iterations)
  graph.md · nodes.md    ← the graph, and every node whatever its kind
  group.{input,intent,middle,output,evolution}.md
  kind.{input,input-connector,intent,transform,condition-success,condition-failure,output,output-connector,evolution}.md
  input.<channel>.md · output.<channel>.md   ← one per channel of the vocabulary, incl. `custom`
  intent.<class>.md · evolution.<scope>.md   ← one per class / scope, incl. `custom`
  middle.custom.md       ← the middle has no vocabulary: this is its law of BIRTH instead
  components.md · tab.md · tab.<name>.md     ← the surfaces the owner sees
  useCases.md · history.md · fracteraPro.md · replies.md
```

**One source of truth.** The text lives only here. The schema knows only the LIST of lawful names and
demands the right one of every object: a node carries `nodes`, a tab `tab`, the input group `group.input`.
The name cannot be swapped — it is law, merely a cheap one.

**Names are DERIVED, not chosen.** A channel, a request class and an evolution scope each generate their
instruction name from their vocabulary (`telegram-bot` → `input.telegram-bot`, `self-describe` →
`intent.self-describe`). A vocabulary entry without a registered instruction crashes the schema module on
load — an empty law is never served silently.

**How an agent reads.** Either the file (`_instructions/<name>.md`) or the door
`GET api/instruction?name=<name>` — whichever is cheaper where it stands. Doors that hand out objects
(`api/work`, `api/core`) attach the text themselves when it is needed for the work.

**How the owner edits.** Plain markdown: open, write, save. No rebuild, no code change. An empty file is
lawful — that law is simply not written yet.
