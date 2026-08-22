import Link from "next/link";
import { Layers, TriangleAlert } from "lucide-react";
import { TwoPane } from "../../_components/two-pane";
import { SectionPreview } from "./preview";
import { pick, kindsOfType, type SectionsCatalogue } from "@/lib/sections-catalogue";
import type { AdminStrings } from "@/lib/i18n/admin-strings";

// КАТАЛОГ СЕКЦИЙ — одиннадцать типов слева, превью справа.
//
// 🔒 ВЫБОР СТОИТ В АДРЕСЕ (`?kind=flow`), а не в состоянии браузера. Отсюда три
// свойства разом: ссылку на конкретную секцию можно переслать, «назад» — обычная
// ссылка, и всё работает с выключенным JavaScript. Ни одной клиентской строки на
// этой странице нет.
//
// 🔒 ПУСТОЙ ТИП ПОКАЗЫВАЕТСЯ, А НЕ ПРЯЧЕТСЯ (решение владельца 2026-08-22). Из
// десяти лендинговых типов сегодня закрыто пять; спрятать пустые значило бы
// показать каталог полным, каким он не является. Пустая строка и есть карта того,
// что предстоит построить.

export function SectionsBrowser(
  { lang, s, catalogue, selectedKind, baseHref }: {
    lang: string;
    s: AdminStrings;
    catalogue: SectionsCatalogue;
    selectedKind?: string;
    baseHref: string;
  },
) {
  const m = s.designSections;

  // Каталога нет — говорим об этом прямо. Слот в покое пуст, гостевое приложение
  // может быть чужим и слоя секций не иметь вовсе: это не поломка панели.
  if (!catalogue.ok) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-900 dark:text-amber-100">
          <TriangleAlert size={13} />{m.emptyTitle}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-100/90">{m.emptyBody}</p>
      </div>
    );
  }

  const selected = catalogue.kinds.find(k => k.kind === selectedKind);
  const selectedType = selected ? catalogue.types.find(t => t.id === selected.type) : undefined;

  const list = (
    <div className="space-y-3">
      {catalogue.types.map(type => {
        const kinds = kindsOfType(catalogue, type.id);
        return (
          <div key={type.id}>
            <p className="flex items-baseline gap-1.5 text-[12px] font-medium text-foreground">
              <span className="text-muted-foreground">{type.order}.</span>
              {pick(type.title, lang)}
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{pick(type.purpose, lang)}</p>

            {kinds.length === 0 ? (
              // Тип без единого вида — самая ценная строка на странице: она
              // называет то, чего в проекте ещё нет.
              <p className="mt-1 rounded-md border border-dashed border-border px-2 py-1 text-[10px] text-muted-foreground">
                {m.typeEmpty}
              </p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-1">
                {kinds.map(k => {
                  const active = k.kind === selectedKind;
                  return (
                    <li key={k.kind}>
                      <Link
                        href={`${baseHref}?kind=${k.kind}`}
                        className={`inline-block rounded-md border px-2 py-1 font-mono text-[11px] transition-colors ${
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-foreground hover:border-primary/40"
                        }`}
                      >
                        {k.kind}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );

  const detail = selected ? (
    <div className="space-y-3">
      <div>
        <p className="flex flex-wrap items-center gap-2">
          <code className="font-mono text-[13px] font-semibold text-primary">{selected.kind}</code>
          {selectedType && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
              {selectedType.order}. {pick(selectedType.title, lang)}
            </span>
          )}
        </p>
        {selected.title && <p className="mt-1 text-[12px] text-foreground">{selected.title}</p>}
      </div>

      {/* 🔒 ОГОВОРКА СТОИТ НАД ПРЕВЬЮ, А НЕ СНОСКОЙ ВНИЗУ (владелец 2026-08-22).
          Здесь секция нарисована оформлением ПО УМОЛЧАНИЮ; на сайте к ней
          применяются токены владельца — цвет, шрифт, скругления, плотность. Сноска
          под длинным превью не будет прочитана тем, кто уже решил, что видит
          настоящий вид. */}
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 px-2.5 py-1.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {m.previewNote}
      </p>

      <div className="rounded-xl border border-border p-4">
        <SectionPreview shape={selected.shape} />
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-[11px] font-medium text-foreground">{m.fieldsLabel}</p>
        <code className="mt-1 block font-mono text-[11px] leading-relaxed text-muted-foreground">
          {selected.fields || "—"}
        </code>
      </div>

      {selected.description ? (
        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-[11px] font-medium text-foreground">{m.cardLabel}</summary>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-muted-foreground">
            {selected.description}
          </pre>
        </details>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
          {m.noCard}
        </p>
      )}
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-blue-800 dark:text-blue-200">
          <Layers size={12} />{m.introTitle}
        </p>
        {m.intro.map(line => (
          <p key={line} className="mt-1 text-[10px] leading-relaxed text-blue-700/90 dark:text-blue-300/90">
            {line}
          </p>
        ))}
      </div>

      <TwoPane
        list={list}
        detail={detail}
        selected={Boolean(selected)}
        backHref={baseHref}
        backLabel={m.back}
        emptyHint={m.pickHint}
        ratio="3fr"
      />
    </div>
  );
}
