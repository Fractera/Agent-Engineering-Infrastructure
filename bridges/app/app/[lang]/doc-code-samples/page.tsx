// Образцы кода (шаг 501, 2026-08-09).
//
// Склад готовых наработок владельца: главная страница из прошлого проекта, набор
// стилей, кусок компонента. Смысл — не разрабатывать заново то, что уже сделано.
//
// Две колонки: слева список и создание, справа содержимое. Выбор стоит в адресе
// (`?file=…`), поэтому раскладку решает сервер и всё читается без JS.
//
// 🔒 Агент сам сюда НЕ заглядывает. Библиотека чужих наработок может весить
// сколько угодно, и читать её на всякий случай значит платить контекстом за
// материал, который в текущей задаче может не понадобиться вовсе. Пользуется
// только по прямой просьбе и по имени образца — правило записано в главной
// инструкции стартера.
//
// Динамическая: папка живая.

import Link from "next/link";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { DocKindBadge } from "../_components/doc-kind-badge";
import { TwoPane } from "../_components/two-pane";
import { listSamples, readSample } from "@/lib/code-samples";
import { NewSample, SampleBody } from "./_components/sample-editor.client";

export const dynamic = "force-dynamic";

export default async function CodeSamplesPage(
  { params, searchParams }: {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ file?: string }>;
  },
) {
  const { lang } = await params;
  const { file } = await searchParams;
  const s = getAdminStrings(lang);
  const c = s.codeSamples;
  const page = s.pages["doc-code-samples"];

  const { dir, files } = listSamples();
  const opened = file ? readSample(file) : null;
  const openedMeta = opened?.exists ? files.find((f) => f.file === opened.file) : undefined;
  const base = `/${lang}/doc-code-samples`;

  const labels = {
    newTitle: c.newTitle, namePlaceholder: c.namePlaceholder,
    create: c.create, creating: c.creating, created: c.created,
    badName: c.badName, failed: c.failed,
    save: c.save, saving: c.saving, saved: c.saved, nothingToSave: c.nothingToSave,
    remove: c.remove, removeConfirm: c.removeConfirm, removed: c.removed,
    editMode: c.editMode, viewMode: c.viewMode,
  };

  return (
    <PageShell lang={lang} slug="doc-code-samples" s={s} params={{ file }} title={page.title} hint={page.hint}>
      <div className="mb-2">
        <DocKindBadge
          kind="static"
          evolvingLabel={s.docs.kindEvolving}
          staticLabel={s.docs.kindStatic}
          evolvingHint={s.docs.kindEvolvingHint}
          staticHint={s.docs.kindStaticHint}
        />
      </div>

      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {c.intro} <span className="font-mono text-foreground">{dir}/</span>
      </p>

      {/* Правило пользования стоит НА странице, а не только в справке: оно
          меняет то, как владелец разговаривает с агентом, и узнать о нём надо
          до того, как образец загружен и забыт. */}
      <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-[10px] leading-relaxed text-amber-800 dark:text-amber-200">
        {c.askExplicitly}
      </p>

      <div className="mt-3">
        <TwoPane
          selected={Boolean(opened?.exists)}
          backHref={base}
          backLabel={c.backToList}
          emptyHint={files.length === 0 ? c.empty : c.pickSample}
          list={
            <div className="rounded-lg border border-border">
              <NewSample base={base} labels={labels} />
              {files.length === 0 ? (
                <p className="px-3 py-3 text-[11px] text-muted-foreground">{c.empty}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {files.map((f) => {
                    const active = opened?.exists && opened.file === f.file;
                    return (
                      <li key={f.file}>
                        <Link
                          href={active ? base : `${base}?file=${encodeURIComponent(f.file)}`}
                          className={`flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-muted ${active ? "bg-muted" : ""}`}
                        >
                          <span className="truncate font-mono text-foreground">{f.file}</span>
                          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                            {Math.max(1, Math.round(f.bytes / 1024))} KB
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          }
          detail={
            opened?.exists && openedMeta ? (
              <SampleBody
                base={base}
                file={opened.file}
                name={openedMeta.name}
                ext={openedMeta.ext}
                initialText={opened.text}
                labels={labels}
              />
            ) : null
          }
        />
      </div>

      <HelpDetails label={c.helpLabel}>
        <p><strong>{c.helpWhatTitle}</strong> {c.helpWhat}</p>
        <p><strong>{c.helpHowTitle}</strong> {c.helpHow}</p>
        <p><strong>{c.helpSilentTitle}</strong> {c.helpSilent}</p>
        <p><strong>{c.helpFormatsTitle}</strong> {c.helpFormats}</p>
      </HelpDetails>
    </PageShell>
  );
}
