import Link from "next/link";
import { Layers, TriangleAlert, Flower2, ChevronRight } from "lucide-react";
import { TwoPane } from "../../_components/two-pane";
import { SectionPreview } from "./preview";
import { kindsOfType, pick, type SectionsCatalogue, type SectionKind } from "@/lib/sections-catalogue";
import type { AdminStrings } from "@/lib/i18n/admin-strings";

// КАТАЛОГ СЕКЦИЙ — аккордеон типов слева, превью справа.
//
// 🔒 АККОРДЕОН СДЕЛАН НА `<details>`, БЕЗ ЕДИНОЙ СТРОКИ JS. Атрибут `name` даёт
// исключительность на уровне браузера: открылся один тип — соседние закрылись сами.
// Тот же приём вложен внутрь: у каждого типа свой набор видов со своим `name`.
// Клиентский аккордеон потребовал бы состояния, гидратации и работал бы хуже с
// выключенным JavaScript.
//
// 🔒 ОТКРЫТОЕ СОСТОЯНИЕ ВЫВОДИТСЯ ИЗ АДРЕСА. Выбрали вид — его тип и он сам
// открыты после перезагрузки, потому что `open` считается из `?kind=`. Иначе
// переход по ссылке закрывал бы всё, и человек искал бы место, где только что был.
//
// 🔒 ПУСТОЙ ТИП ПОКАЗЫВАЕТСЯ, А НЕ ПРЯЧЕТСЯ (решение владельца). Из десяти
// лендинговых типов сегодня закрыто пять; спрятать пустые значило бы показать
// каталог полным, каким он не является.

/** Описание вида — то, что читает агент, выбирая секцию. */
function KindBody({ kind, UI }: { kind: SectionKind; UI: AdminStrings["designSections"] }) {
  return (
    <div className="space-y-2 px-2 pb-2 pt-1">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{UI.descriptionLabel}</p>
        {kind.description ? (
          <pre className="mt-1 whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-muted-foreground">
            {kind.description}
          </pre>
        ) : (
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{UI.noDescription}</p>
        )}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{UI.fieldsLabel}</p>
        <code className="mt-0.5 block font-mono text-[10px] leading-relaxed text-muted-foreground">
          {kind.fields || "—"}
        </code>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{UI.usedOnLabel}</p>
        {kind.usedOn.length === 0 ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{UI.usedNowhere}</p>
        ) : (
          <ul className="mt-0.5 space-y-0.5">
            {kind.usedOn.map(u => (
              <li key={u.page} className="text-[11px] text-muted-foreground">
                <span className="text-foreground">{u.page}</span>
                {" — "}
                {UI.orderLabel} {u.order}
                {u.times > 1 && ` ×${u.times}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function SectionsBrowser(
  { lang, s, catalogue, selectedKind, baseHref }: {
    lang: string;
    s: AdminStrings;
    catalogue: SectionsCatalogue;
    selectedKind?: string;
    baseHref: string;
  },
) {
  const UI = s.designSections;
  // Каталога нет — говорим прямо. Слот в покое пуст, гостевое приложение может быть
  // чужим и слоя секций не иметь вовсе: это не поломка панели.
  if (!catalogue.ok) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-900 dark:text-amber-100">
          <TriangleAlert size={13} />{UI.emptyTitle}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-100/90">{UI.emptyBody}</p>
      </div>
    );
  }

  const selected = catalogue.kinds.find(k => k.kind === selectedKind);
  const selectedType = selected ? catalogue.types.find(t => t.id === selected.type) : undefined;

  const list = (
    <div className="space-y-1.5">
      {catalogue.types.map(type => {
        const kinds = kindsOfType(catalogue, type.id);
        const typeOpen = selected?.type === type.id;

        return (
          <details
            key={type.id}
            name="section-type"
            open={typeOpen}
            className="group rounded-lg border border-border open:border-primary/40"
          >
            <summary className="flex cursor-pointer items-start gap-1.5 px-2.5 py-2 text-[12px] font-medium text-foreground marker:content-['']">
              <ChevronRight
                size={12}
                className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
              />
              <span className="min-w-0">
                <span className="text-muted-foreground">{type.order}.</span> {pick(type.title, lang)}
                <span className="mt-0.5 block text-[10px] font-normal leading-relaxed text-muted-foreground">
                  {pick(type.purpose, lang)}
                </span>
              </span>
            </summary>

            <div className="border-t border-border px-2 py-2">
              {kinds.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-2 py-1.5 text-[10px] text-muted-foreground">
                  {UI.typeEmpty}
                </p>
              ) : (
                <div className="space-y-1">
                  {kinds.map(k => (
                    <details
                      key={k.kind}
                      name={`kind-${type.id}`}
                      open={k.kind === selectedKind}
                      className="rounded-md border border-border bg-muted/20"
                    >
                      <summary className="flex cursor-pointer items-center justify-between gap-2 px-2 py-1.5 marker:content-['']">
                        <span className="flex items-center gap-1.5">
                          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {k.id ?? "—"}
                          </code>
                          <code className="font-mono text-[11px] font-medium text-foreground">{k.kind}</code>
                        </span>
                        {/* Ссылка выбирает вид для превью справа; сам аккордеон
                            раскрывается нажатием на строку и без перехода. */}
                        <Link
                          href={`${baseHref}?kind=${k.kind}`}
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                            k.kind === selectedKind
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          preview
                        </Link>
                      </summary>
                      <KindBody kind={k} UI={UI} />
                    </details>
                  ))}
                </div>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );

  const detail = selected ? (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {UI.idLabel} {selected.id ?? "—"}
        </code>
        <code className="font-mono text-[13px] font-semibold text-primary">{selected.kind}</code>
        {selectedType && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            {selectedType.order}. {pick(selectedType.title, lang)}
          </span>
        )}
      </div>

      {/* 🔒 ОГОВОРКА СТОИТ НАД ПРЕВЬЮ, А НЕ СНОСКОЙ ВНИЗУ. Сноску под длинным
          превью не прочитает тот, кто уже решил, что видит настоящий вид. */}
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 px-2.5 py-1.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {UI.previewNote}
      </p>

      <div className="rounded-xl border border-border p-4">
        <SectionPreview shape={selected.shape} />
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-blue-800 dark:text-blue-200">
          <Layers size={12} />{UI.introTitle}
        </p>
        {UI.intro.map(line => (
          <p key={line} className="mt-1 text-[10px] leading-relaxed text-blue-700/90 dark:text-blue-300/90">
            {line}
          </p>
        ))}
      </div>

      {/* Как завести новую секцию — оранжевым, потому что это не настройка панели,
          а работа на машине владельца: путь отсюда ведёт наружу. */}
      <div className="rounded-md border border-orange-500/40 bg-orange-500/5 p-2.5">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-orange-900 dark:text-orange-200">
          <Flower2 size={12} />{UI.addTitle}
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-orange-900/90 dark:text-orange-200/90">
          {UI.addBody}
        </p>
        <p className="mt-1.5 rounded border border-orange-500/30 bg-background/60 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-orange-900 dark:text-orange-100">
          {UI.addQuote}
        </p>
        <p className="mt-1.5 text-[10px] leading-relaxed text-orange-900/90 dark:text-orange-200/90">
          {UI.addAfter}
        </p>
      </div>

      <TwoPane
        list={list}
        detail={detail}
        selected={Boolean(selected)}
        backHref={baseHref}
        backLabel={UI.back}
        emptyHint={UI.pickHint}
        ratio="3fr"
      />
    </div>
  );
}
