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
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {labels.intro} <span className="font-mono text-foreground">{ip}</span>
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
              {ip} <span className="font-sans text-muted-foreground">— {labels.notes[noteKey]}</span>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
