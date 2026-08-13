// Зелёная врезка «это уже построено» (владелец 2026-08-13).
//
// ЗАЧЕМ ОНА ЗДЕСЬ. Страница языков — то место, где человек впервые решает,
// многоязычным будет его проект или нет. И решает он в тишине: экран показывает
// список из 84 отметок и ничего не говорит о том, что за ними стоит. Между тем
// именно здесь лежит самая дорогая часть проекта — та, ради которой команды
// тратят недели: языковая маршрутизация, канонические адреса, `hreflang`,
// структурированные данные, устанавливаемое приложение. Врезка называет это
// прямо, потому что не названное считается несделанным.
//
// СЕРВЕРНЫЙ КОМПОНЕНТ. Слова приезжают из словаря, документы за вопросиками —
// с диска, разметка markdown делается здесь же. В браузер уезжает готовый текст.

import { BadgeCheck } from "lucide-react";
import type { AdminStrings } from "@/lib/i18n/admin-strings";
import { readLocalizedContent } from "@/lib/content/localized-content";
import { GuideProse } from "../../how-to-build/_components/guide-prose";
import { DocPopup } from "./doc-popup.client";

// Документ за вопросиком. Нет файла — нет и вопросика: пустое окно хуже, чем
// отсутствующая кнопка, потому что обещает и не даёт.
function Doc({ name, lang, label, title }: { name: string; lang: string; label: string; title: string }) {
  const found = readLocalizedContent(name, lang);
  if (!found.ok) return null;
  return (
    <DocPopup label={label} title={title}>
      <GuideProse markdown={found.text} />
    </DocPopup>
  );
}

export function ReadyNote({ s, lang }: { s: AdminStrings; lang: string }) {
  const t = s.languages;

  return (
    <div className="rounded-lg border border-emerald-600/40 bg-emerald-500/5 p-3">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-800 dark:text-emerald-300">
        <BadgeCheck size={13} className="shrink-0" />
        {t.readyTitle}
      </p>

      <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-emerald-900/90 dark:text-emerald-100/80">
        <p>{t.readyBody}</p>
        {/* 🔒 АБЗАЦ ПРО ЯЗЫКОВЫЕ АТРИБУТЫ ПОЯВИЛСЯ ТОЛЬКО ПОСЛЕ ТОГО, КАК ЭТО
            СТАЛО ПРАВДОЙ (шаг 503, 2026-08-13). До него главная брала канонический
            адрес у макета, и каждый язык объявлял себя копией английского корня.
            Обещание, которое покупатель проверяет одной командой `curl`, обязано
            быть правдой в минуту, когда он его читает, — поэтому у каждого
            утверждения этой врезки есть машинный гейт: здесь `check:seo`. */}
        <p>{t.readySignals}</p>
        {/* Читатель, о котором вспоминают последним, а приходит он уже сегодня.
            Абзац появился вместе с шагом 505 — и по тому же правилу: сначала
            машина держит утверждение (`check:aio` в слоте), потом оно
            публикуется. */}
        <p>{t.readyAio}</p>
        <p>{t.readyCost}</p>
        <p>{t.readyChoice}</p>
      </div>

      {/* Два вопросика — доказательства обещания. Стоят под текстом, а не внутри
          него: ссылка посреди абзаца уводит из чтения, а здесь она ждёт, пока
          абзац дочитают. */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <Doc name="seo-inside" lang={lang} label={t.readySeo} title={t.readySeoTitle} />
        <Doc name="aio-inside" lang={lang} label={t.readyAioLabel} title={t.readyAioTitle} />
        <Doc name="pwa-inside" lang={lang} label={t.readyPwa} title={t.readyPwaTitle} />
      </div>
    </div>
  );
}
