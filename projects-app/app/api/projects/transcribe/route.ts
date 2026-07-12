import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { defaultLanguage, openAiKey } from "@/lib/quiz";

// VOICE INPUT — the transcription half (step 232). ONE route for the WHOLE application: every input that
// accepts speech posts its recording here. There is no second transcription path anywhere (owner's rule) —
// a new input gets voice by mounting <VoiceInput/>, never by re-implementing a recorder.
//
// The key is the GLOBAL OpenAI key (step 208); the language is the project's default (step 227), so the
// model is not left guessing when the owner dictates in Russian into an English UI.
export const runtime = "nodejs";

const OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions";
const MODEL = "gpt-4o-transcribe";
const MAX_BYTES = 25 * 1024 * 1024; // the API's own limit — refuse earlier, with a readable message

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const key = openAiKey();
  if (!key) {
    // The client shows its OWN localized message for this reason (six languages) — the text here is a
    // non-localized fallback for any other caller.
    return NextResponse.json(
      { error: "Voice input needs the OpenAI key — add it in the workspace settings.", reason: "no-key" },
      { status: 400 },
    );
  }

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "no audio was recorded" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "the recording is too long — record it in shorter pieces" }, { status: 413 });
  }

  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "speech.webm");
  upstream.append("model", MODEL);
  upstream.append("language", defaultLanguage());

  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: upstream,
  });
  if (!r.ok) {
    return NextResponse.json(
      { error: `Transcription failed (${r.status}). Try again, or type the text.` },
      { status: 502 },
    );
  }
  const d = (await r.json()) as { text?: string };
  return NextResponse.json({ ok: true, text: (d.text ?? "").trim() });
}
