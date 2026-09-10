// Записи DNS, которые владелец заводит у регистратора (шаг 501, Ф2, партия 9).
// СЕРВЕРНЫЙ компонент.
//
// Это самая полезная часть раздела для чтения: справочная таблица, которую
// переписывают в панель регистратора. Она приезжает готовым HTML, значит читается
// без JS, печатается и остаётся видимой, даже если что-то в интерактивной части
// не оживёт.

import { DNS_HOSTS } from "../_lib/domain";

export type DnsLabels = {
  intro: string; type: string; name: string; value: string;
  notes: Record<string, string>;
};

const COLS = { gridTemplateColumns: "3rem 5rem 1fr" } as const;

export function DnsRecords({ serverIp, labels }: { serverIp: string | null; labels: DnsLabels }) {
  const ip = serverIp ?? "…";
  return (
    <>
      {/* 🔒 ЧИСЛО ЗАПИСЕЙ ПОРОЖДАЕТСЯ ИЗ ТОГО ЖЕ СПИСКА, ЧТО И САМА ТАБЛИЦА
          (2026-09-10). ✗ Оплачено дважды подряд одним и тем же классом: сперва
          пять рукописных СТРОК разошлись со `SUBDOMAINS`, когда пришёл `chat`
          (2026-09-03) — строки тогда научились порождаться, а ЧИСЛО в тексте
          осталось рукописным и разошлось на следующем же поддомене, `memory`.
          Экран просил «все пять» и показывал шесть.
          🔒 Лечение то же самое, что было применено к строкам: порождать, а не
          перечислять. Подстановка `{n}` делает расхождение невозможным. */}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {labels.intro.replace("{n}", String(DNS_HOSTS.length))}{" "}
        <span className="font-mono text-foreground">{ip}</span>
      </p>
      <div className="mt-2 space-y-1 overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-[10px]">
        <div className="grid gap-x-3 border-b border-border pb-1 text-muted-foreground" style={COLS}>
          <span>{labels.type}</span><span>{labels.name}</span><span>{labels.value}</span>
        </div>
        {DNS_HOSTS.map(({ name, noteKey }) => (
          <div key={name} className="grid gap-x-3 text-foreground" style={COLS}>
            <span>A</span>
            <span>{name}</span>
            <span className="break-all">
              {/* 🛑 ПОДПИСЬ МОЖЕТ ОТСУТСТВОВАТЬ, И ТОГДА ПОКАЗЫВАЕТСЯ ИМЯ, А НЕ
                  ПУСТОТА. Панель живёт на 82 языках, а `en` и `ru` пишет агент —
                  остальные приезжают файлом позже. Новый поддомен появляется в
                  таблице сразу во всех языках; без запасного значения строка
                  выглядела бы как «213.199.61.7 — », то есть как поломка. */}
              {ip} <span className="font-sans text-muted-foreground">— {labels.notes[noteKey] || name}</span>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
