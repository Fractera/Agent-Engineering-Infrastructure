import { NextRequest } from "next/server";
import { authorize } from "@/lib/nodes";
import {
  addTurnFor, autoSystemPrompt, getPhase, getQuizFor, openAiKey, quizSeed, resolveQuizTarget, turnsFor,
} from "@/lib/quiz";

// AUTO-QUIZ (step 227.B; both subjects since 225 G4) — the owner skips the manual Q&A and lets the model
// brainstorm WITH ITSELF: it asks its own questions and answers them, out loud. STREAMING is mandatory
// (owner's rule): the text is streamed token by token so the owner READS the reasoning as it forms, can
// PAUSE at any moment, EDIT what the model wrote (the text area is interactive), and resume — the edited
// text is what the node (or the link) is synthesized from, because the client saves it back as the turn.
//
// SUBJECT: {automation} designs the next NODE; {edge} designs the LINK between two automations.
// SSE: each chunk is a `data: {"delta":"..."}` line; the stream ends with `data: [DONE]`.
export const runtime = "nodejs";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return new Response("forbidden", { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; edge?: string } | null;
  const t = await resolveQuizTarget({ automation: body?.automation, edge: body?.edge });
  if (!t.ok) return new Response(t.error, { status: 400 });
  const quiz = await getQuizFor(t.target);
  if (!quiz) return new Response("quiz not started", { status: 400 });

  const key = openAiKey();
  if (!key) return new Response("OPENAI_API_KEY is not set", { status: 400 });

  const seed = await quizSeed(t.target);
  const turns = await turnsFor(quiz, t.target);
  const transcript = turns.map((x) => `${x.role === "user" ? "OWNER" : "DESIGNER"}: ${x.content}`).join("\n");
  const phase = await getPhase(quiz, t.target);
  const subject =
    t.target.kind === "edge" ? "this link" : phase === "usecases" ? "the user cases" : "this node";

  const messages = [
    { role: "system", content: await autoSystemPrompt(quiz, t.target, seed) },
    {
      role: "user",
      content: transcript
        ? `What has been said so far:\n${transcript}\n\nContinue the design of ${subject}.`
        : `Design ${subject}.`,
    },
  ];

  const upstream = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages, temperature: 0.5, stream: true }),
  });
  if (!upstream.ok || !upstream.body) {
    return new Response(`OpenAI ${upstream.status}`, { status: 502 });
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let full = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buf = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const s = line.trim();
            if (!s.startsWith("data:")) continue;
            const payload = s.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
              const delta = j.choices?.[0]?.delta?.content;
              if (delta) {
                full += delta;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
            } catch { /* skip a partial frame */ }
          }
        }
        // Persist what the model produced as the assistant turn — the owner may still edit it (the client
        // saves the edited text back), and the node / the link is synthesized from the turns.
        if (full.trim()) await addTurnFor(quiz, t.target, "assistant", full.trim());
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
