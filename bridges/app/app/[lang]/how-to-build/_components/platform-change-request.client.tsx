"use client";

// Запрос на доработку ПЛАТФОРМЫ — единственная сегодня дверь для партнёра
// (решение владельца 2026-08-18).
//
// 🔒 ЧТО ЭТО ЛЕЧИТ. Проект партнёра принадлежит ему целиком, а платформа под ним
// заменяется при каждом развёртывании: `bootstrap.sh` делает `rm -rf /opt/fractera`
// и клонирует её заново. Значит правка платформы на этом сервере не переживает
// следующего развёртывания и не хранится нигде. До этой врезки партнёр узнавал об
// этом, только потеряв работу.
//
// ПОЧЕМУ ОСТРОВОК. Копирование в буфер — действие браузера, серверу недоступное.
// Слова приходят пропсом `ui`: словарь панели живёт на сервере, и 82 языка не
// имеют права оказаться в браузере.
//
// ПОЧЕМУ ПИСЬМО КОРОТКОЕ. Вводное письмо решает одну задачу — назвать сервер, с
// которого пришёл запрос. Всё остальное выясняется в переписке, а длинная форма
// на входе отсеивает ровно тех, кому правка нужна по делу.

import { useState } from "react";
import { Mail, Copy, Check } from "lucide-react";

export type PlatformChangeUi = {
  title: string;
  body: string;
  button: string;
  copied: string;
  hint: string;
  /** Готовый текст письма, собранный на сервере: адрес уже подставлен. */
  mailSubject: string;
  mailBody: string;
};

export function PlatformChangeRequest({ ui, to }: { ui: PlatformChangeUi; to: string }) {
  const [copied, setCopied] = useState(false);

  const letter = `${ui.mailSubject}\n\n${ui.mailBody}`;
  const mailto = `mailto:${to}?subject=${encodeURIComponent(ui.mailSubject)}&body=${encodeURIComponent(ui.mailBody)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 4000);
    } catch {
      // Буфер отказал (нет https, отказ в правах) — письмо всё равно видно ниже
      // и его можно выделить руками. Молчаливого провала быть не должно.
      setCopied(false);
    }
  }

  return (
    <section className="mt-10 rounded-lg border border-border bg-muted/30 px-4 py-4">
      <h2 className="text-[13px] font-semibold text-foreground">{ui.title}</h2>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{ui.body}</p>

      <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-[10px] leading-relaxed text-foreground">
{letter}
      </pre>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground hover:opacity-90"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? ui.copied : ui.button}
        </button>
        <a
          href={mailto}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[11px] text-foreground hover:bg-muted"
        >
          <Mail size={12} />
          {to}
        </a>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/80">{ui.hint}</p>
    </section>
  );
}
