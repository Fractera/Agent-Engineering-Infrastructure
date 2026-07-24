"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendStrings } from "./build-with-ai-i18n";
import VoiceInput from "./voice-input.client";

// «СТРОИТЬ … ВМЕСТЕ С ИИ» — раскрывашка, через которую владелец оставляет задание модели. Общий компонент
// ВСЕХ вкладок: и пульт, и дашборд, и будущие календарь с хранилищем зовут ровно её.
//
// 🔒 ЭТО МЯГКИЙ ДЕВ-СЛОЙ (`_shared-v2`), а НЕ рантайм автоматизации (закон устойчивости, шаг 298). Кнопка
// нужна ТОЛЬКО пока автоматизацию разрабатывают; конечному пользователю в готовом продукте она не нужна.
// Поэтому её единственная копия живёт здесь, снаружи папки автоматизации, и папка тянет её лишь через
// fail-silent дев-слот (`_components/shared/dev-slot*`): нет `_shared-v2` — кнопки просто не появляются, а
// автоматизация продолжает работать. Внутри папки автоматизации этой копии больше нет.
//
// 🔒 ДВА УРОВНЯ ЗАЯВКИ — ЗАКОН, а не удобство. Ядро описывает страницу двумя уровнями (вкладка и её
// сущности), поэтому и заявка бывает двух видов, и КАЖДАЯ пишется по СВОЕМУ адресу:
//   • ЦЕЛАЯ ВКЛАДКА  → address { object: "tab", name: "dashboard" }   — «Строить дашборд вместе с ИИ»;
//   • ОДНА СУЩНОСТЬ  → address { object: "entity", tab, cuid }        — «Строить История вместе с ИИ».
// Заголовок раскрывашки ВСЕГДА называет свой предмет по имени: по названию видно, куда именно уйдёт
// задание. Заявка на одну таблицу не должна выглядеть как заявка на весь дашборд — это разные объекты
// ядра, и разбирать их модель будет по-разному.
//
// Слова владельца ложатся в `info.crudUser` адресуемого объекта, а его `status` становится
// `in-development`. `info` в ядре — union из двух честных состояний: либо слово владельца, либо разбор
// модели; пока задание не разобрано, выдавать старую выжимку за правду нельзя.
//
// ЭТО НЕ ЗАПУСК КОНВЕЙЕРА РАЗРАБОТКИ: уведомление кодеру и полный цикл — отдельный шаг. Здесь задание
// записывается в ядро и ждёт.
export type BuildTarget = { object: "tab"; name: string } | { object: "entity"; tab: string; cuid: string };

export default function BuildWithAi({
  target,
  name,
  pending,
  lang,
}: {
  /** Адрес объекта ядра, которому принадлежит задание. */
  target: BuildTarget;
  /** Как называется предмет заявки — попадает в заголовок раскрывашки. */
  name: string;
  /** Уже записанное и ещё не разобранное задание — показываем, чтобы отправка не выглядела как «ушло в никуда». */
  pending?: string;
  lang: string;
}) {
  const L = sendStrings(lang);
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "saved" | "failed">("idle");
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
        body: JSON.stringify({ address: target, set: { info: { crudUser: brief }, status: "in-development" } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setStatus("saved");
      setText("");
      // Задание записано в ядро (status → in-development) — просим Next перечитать серверные данные, чтобы
      // полоса-уведомление пересчитала поводы БЕЗ перезагрузки (так же, как это делает разморозка узла на
      // диаграмме). Клиентское состояние («сохранено») переживает refresh.
      router.refresh();
    } catch {
      setStatus("failed");
    }
  }

  return (
    <details
      className="rounded-md border border-dashed"
      data-build-with-ai={target.object === "tab" ? target.name : target.cuid}
    >
      {/* Без иконки: раскрывашка открывается кликом по названию, и этого достаточно (владелец
          2026-07-22 — стрелка странно вела себя при наведении). */}
      <summary className="flex cursor-pointer list-none items-center px-3 py-2 text-sm font-medium hover:underline">
        {L.buildWith.replace("{name}", name)}
      </summary>
      <div className="space-y-2 px-3 pb-3">
        {pending ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">{L.devPending}</span> {pending}
          </p>
        ) : null}
        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); setStatus("idle"); }}
          placeholder={L.devPlaceholder}
          className="min-h-20 w-full resize-y rounded-md border bg-transparent p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
        <VoiceInput
          targetRef={areaRef}
          value={text}
          lang={lang}
          onChange={(next) => { setText(next); setStatus("idle"); }}
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
    </details>
  );
}
