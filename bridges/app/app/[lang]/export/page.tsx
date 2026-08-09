// Раздел «Выгрузка данных» (шаг 501, Ф2, партия 8).
//
// БЕЗ ЕДИНОГО КЛИЕНТСКОГО ОСТРОВКА, и это не аккуратность, а устройство: форма
// отправляется ПРЯМО в маршрут выгрузки (`action="/api/data/export"`,
// `method="get"`), тот отвечает архивом с заголовком вложения — браузер скачивает
// его сам. Кнопка «Скачать архив» и есть кнопка отправки формы.
//
// Что это даёт против старой панели: работает при выключенном JS; нет
// промежуточного состояния «пакую» с двойным нажатием; выбор частей виден в
// адресе, значит ссылку на конкретную выгрузку можно сохранить.
//
// Чем платим: суммарный размер не пересчитывается на каждом щелчке, потому что
// считать его без JS нечем. Поэтому размер показан У КАЖДОЙ части — по ним видно
// цену выбора, а сумма по умолчанию названа отдельной строкой. Это дешёвая
// потеря: решение принимают по крупной части (граф знаний, файлы), а не по сумме
// до килобайта.
//
// Размеры читает сервер тем же `partSize`, которым живёт маршрут манифеста, —
// один источник правды о том, из чего состоит резервная копия.

import { Download, ShieldAlert } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { BACKUP_PARTS, partSize } from "@/lib/backup-parts";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { Button } from "@/components/ui/button";

// Размеры живые, поэтому страница динамическая: запечённый размер соврал бы уже
// на следующей загрузке файла.
export const dynamic = "force-dynamic";

function human(bytes: number, empty: string): string {
  if (bytes <= 0) return empty;
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

const fill = (t: string, vars: Record<string, string>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

export default async function ExportPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const e = s.backup;

  const parts = BACKUP_PARTS.map((p) => ({
    id: p.id,
    label: p.label,
    note: p.note,
    secret: p.secret === true,
    defaultOn: p.defaultOn,
    bytes: partSize(p),
  }));

  // Сумма выбора ПО УМОЛЧАНИЮ: пустая часть не отмечается, её нечего выгружать.
  const defaultTotal = parts
    .filter((p) => p.defaultOn && p.bytes > 0)
    .reduce((sum, p) => sum + p.bytes, 0);

  return (
    <PageShell lang={lang} slug="export" s={s} title={s.pages.export.title} hint={s.pages.export.hint}>
      <form method="get" action="/api/data/export" className="flex flex-col gap-2">
        {parts.map((p) => {
          const empty = p.bytes === 0;
          return (
            <label
              key={p.id}
              className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 ${
                empty ? "border-border/60 opacity-50" : "border-border"
              }`}
            >
              {/* Родной `<input type="checkbox">`, а не компонент shadcn: тот
                  клиентский, а вся суть страницы в том, что клиента здесь нет.
                  Форма отправляет повторяющееся поле `parts` — маршрут выгрузки
                  специально научен читать и такую запись, и склеенную запятыми. */}
              <input
                type="checkbox"
                name="parts"
                value={p.id}
                defaultChecked={p.defaultOn && !empty}
                disabled={empty}
                className="mt-0.5 size-4 accent-primary"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-foreground">
                  {p.label}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {human(p.bytes, e.empty)}
                  </span>
                  {p.secret && (
                    <span className="text-[9px] uppercase tracking-wide text-amber-600 dark:text-amber-400">
                      {e.secretTag}
                    </span>
                  )}
                </span>
                <span className="text-[10px] leading-relaxed text-muted-foreground">{p.note}</span>
              </span>
            </label>
          );
        })}

        {/* Предупреждение о секретах показано ВСЕГДА, а не по факту выбора:
            без JS узнать, отмечены ли они сейчас, нечем, а предупреждение,
            появляющееся только иногда, легче пропустить, чем постоянное. */}
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5">
          <ShieldAlert size={13} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
            {e.secretWarning}
          </span>
        </div>

        <p className="border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
          {e.neverExported}
        </p>

        <div className="flex items-center gap-2">
          <span className="flex-1 font-mono text-[10px] text-muted-foreground">
            {fill(e.defaultTotal, { size: human(defaultTotal, e.empty) })}
          </span>
          <Button type="submit" variant="outline" size="sm" className="text-[11px]">
            <Download size={11} />{e.download}
          </Button>
        </div>
      </form>

      <HelpDetails label={e.helpExportLabel}>
        <p><strong>{e.helpWhatTitle}</strong> {e.helpWhat}</p>
        <p><strong>{e.helpWhenTitle}</strong> {e.helpWhen}</p>
        <p><strong>{e.helpNotTitle}</strong> {e.helpNot}</p>
      </HelpDetails>
    </PageShell>
  );
}
