"use client";

import { useRef, useState } from "react";
import { controlPanelStrings } from "../../i18n";
import VoiceInput from "../../../shared/voice-input.client";

// ОТПРАВИТЬ ПУЛЬТ В РАЗРАБОТКУ — слова владельца ложатся в ЯДРО, в `info.crudUser` ЭТОГО пульта
// (адрес `{object:"entity", tab:"control-panel", cuid}`), а статус пульта становится `in-development`.
// Ровно то же, что делает «Отправить задание» в шапке, только адресно: задание принадлежит пульту, а не
// автоматизации целиком, поэтому модель видит, ЧТО именно просили переделать.
//
// `info` в ядре — union из двух честных состояний: либо слово владельца (`crudUser`), либо разбор модели
// (`aiSummary`). Отправка перезаписывает его словом владельца: пока задание не разобрано, выдавать
// старую выжимку за правду нельзя.
//
// ЭТО НЕ ЗАПУСК КОНВЕЙЕРА РАЗРАБОТКИ: уведомление кодеру и полный цикл — следующий шаг. Здесь только
// настройка: задание записано в ядро и ждёт.
export default function SendToDevelopment({ tab, cuid, lang }: { tab: string; cuid: string; lang: string }) {
  const L = controlPanelStrings(lang);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "saved" | "failed">("idle");
  // Задание в разработку диктуется голосом — тот же единственный примитив папки, что и в публичном поле.
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  async function submit() {
    const brief = text.trim();
    if (!brief) return;
    setStatus("sending");
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/patch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: { object: "entity", tab, cuid },
          set: { info: { crudUser: brief }, status: "in-development" },
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setStatus("saved");
      setText("");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <p className="text-sm font-medium">{L.devTitle}</p>
      <textarea
        ref={areaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setStatus("idle");
        }}
        placeholder={L.devPlaceholder}
        className="min-h-20 w-full resize-y rounded-md border bg-transparent p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
      />
      <VoiceInput
        targetRef={areaRef}
        value={text}
        lang={lang}
        onChange={(next) => {
          setText(next);
          setStatus("idle");
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {status === "sending" ? L.devSending : status === "saved" ? L.devSaved : status === "failed" ? L.devFailed : ""}
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || status === "sending"}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {L.devSubmit}
        </button>
      </div>
    </div>
  );
}
