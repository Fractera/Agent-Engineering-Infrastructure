"use client";

import { useState } from "react";
import { chromeStrings } from "./i18n";
import { CloseIcon } from "./icons";

// КНОПКА «ОТПРАВИТЬ ЗАДАНИЕ» — живая запись в ядро: текст владельца ложится в passport.info.crudUser
// через собственную дверь api/patch (то поле, что будущий агент читает как задачу). Двусторонняя связь
// шапка ↔ ядро. Дверь адресуется ОТНОСИТЕЛЬНО текущего пути — без хардкода слага (закон 0: папка
// переносима; на новом месте путь другой, а код тот же).
type Status = "idle" | "sending" | "saved" | "failed";

export default function SendTask({ lang }: { lang: string }) {
  const L = chromeStrings(lang);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function submit() {
    const brief = text.trim();
    if (!brief) return;
    setStatus("sending");
    try {
      const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
      const r = await fetch(`${apiBase}/patch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: { object: "passport" }, set: { info: { crudUser: brief } } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setStatus("saved");
      setText("");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
      >
        {L.sendOpen}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border bg-background p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">{L.sendTitle}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label={L.cancel} className="text-muted-foreground hover:text-foreground">
              <CloseIcon className="size-4" />
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setStatus("idle"); }}
            placeholder={L.sendPlaceholder}
            className="min-h-24 w-full resize-y rounded-md border bg-transparent p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {status === "sending" ? L.sendSending : status === "saved" ? L.sendSaved : status === "failed" ? L.sendFailed : ""}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim() || status === "sending"}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {L.sendSubmit}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
