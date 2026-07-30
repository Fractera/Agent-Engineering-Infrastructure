# Tool: voice-input — dictate speech into a text field

A ready-made, reusable UI primitive. **It already exists — never write a second microphone / `MediaRecorder`
/ transcription path.** When a field should accept dictation, wire THIS.

## What it is
A press-and-hold microphone button next to a text input: hold to record (a live 40px waveform proves the mic
hears you), release to transcribe. The recognised text is inserted **at the cursor position**, not appended.

## Where it lives — TWO copies, one per layer (this is lawful, by design)
- **Runtime copy, IN this folder:** `_components/shared/voice-input.client.tsx`. This is the one **public
  input fields use** — it is law-0 self-contained (no `_shared-v2`, no shadcn), so it works in the production
  layer. Wire this one into a public field.
- **Dev copy:** `_shared-v2/tools/voice-input/` — used by development-layer inputs (e.g. the "Build with AI"
  brief field). Same primitive, soft layer.

Two copies of ONE primitive (one per layer) is the accepted two-layer pattern — but never a THIRD hand-rolled
microphone within a layer.

## API (runtime copy)
```ts
import VoiceInput from "…/_components/shared/voice-input.client";

<VoiceInput
  targetRef={ref}     // ref to the <textarea> / <input> being dictated into
  value={string}
  onChange={(next: string) => void}
  lang={string}       // UI language (ten languages, English fallback)
  disabled?={boolean}
/>
```

## Server door
`POST api/transcribe` — sends the recorded audio to OpenAI transcription (global key, step 208) and returns
`{ ok, text }`. The key is server-side, never leaves the server.

## Constraints
- `getUserMedia` needs **HTTPS or localhost**. In IP mode the button disables itself and explains why; typing
  always works. Inside a preview iframe the browser blocks the mic — the button says to open the page in its
  own tab.
