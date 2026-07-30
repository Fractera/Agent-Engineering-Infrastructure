"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { chromeStrings } from "./i18n";
import VoiceInput from "../tools/voice-input/client/voice-input.client";

// КНОПКА «ОТПРАВИТЬ ЗАДАНИЕ» — живая запись в ядро: текст владельца ложится в passport.info.crudUser
// через собственную дверь api/patch (то поле, что будущий агент читает как задачу). Двусторонняя связь
// шапка ↔ ядро. Дверь адресуется ОТНОСИТЕЛЬНО текущего пути — без хардкода слага (закон 0: папка
// переносима; на новом месте путь другой, а код тот же).
//
// ГОЛОС (шаг 302): поле принимает речь тем же переиспользуемым примитивом `VoiceInput`, что и пульт —
// задание можно надиктовать. УВЕДОМЛЕНИЕ (шаг 302): как только задание легло в ядро, шлём событие
// `fractera:notices-refresh` — полоса-уведомление перечитывает поводы и показывает новый повод категории
// `task` СРАЗУ, без перезагрузки (деривация `collectNotices` читает `passport.info.crudUser`).
//
// 🔒 НА shadcn (шаг 298): прежде — сырые `<button>` + `<textarea>` и самодельная всплывашка на `absolute`.
// Теперь `Dialog` + `Textarea` + `Button`: фокус-ловушка, Esc, крестик и клик вне окна — от примитива.
type Status = "idle" | "sending" | "saved" | "failed";

export default function SendTask({ lang }: { lang: string }) {
  const L = chromeStrings(lang);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
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
        body: JSON.stringify({ address: { object: "passport" }, set: { info: { crudUser: brief } } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setStatus("saved");
      setText("");
      // Задание в ядре → полоса-уведомление перечитывает поводы: новый `task` появится сразу, без перезагрузки.
      window.dispatchEvent(new CustomEvent("fractera:notices-refresh"));
    } catch {
      setStatus("failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-7 text-xs">{L.sendOpen}</Button>
      </DialogTrigger>
      <DialogContent className="space-y-2 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{L.sendTitle}</DialogTitle>
        </DialogHeader>
        <Textarea
          ref={areaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); setStatus("idle"); }}
          placeholder={L.sendPlaceholder}
          className="min-h-24 resize-y text-sm"
        />
        {/* Голос — тот же примитив, что в пульте: задание можно надиктовать. Курсор помнит место вставки. */}
        <VoiceInput
          targetRef={areaRef}
          value={text}
          onChange={(v) => { setText(v); setStatus("idle"); }}
          lang={lang}
          disabled={status === "sending"}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {status === "sending" ? L.sendSending : status === "saved" ? L.sendSaved : status === "failed" ? L.sendFailed : ""}
          </span>
          <Button size="sm" className="h-7 text-xs" onClick={submit} disabled={!text.trim() || status === "sending"}>
            {L.sendSubmit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
