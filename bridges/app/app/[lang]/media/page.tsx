// Раздел «Медиатека» (шаг 501, Ф2, партия 4).
//
// Единственная поверхность, которая ходит НЕ к панели, а прямо в слой данных
// `:3300`. Так и осталось для всего, что делает браузер: загрузка, обрезка,
// монтаж, правка подписей, удаление. Изменилось одно — СПИСОК читает сервер по
// внутреннему секрету через петлю, поэтому таблица приезжает готовым HTML, без
// спиннера и без запроса из браузера.
//
// Динамическая по той же причине, что «Пользователи» и «База данных»: содержимое
// хранилища живое, запекать его нельзя. Канон это разрешает служебным страницам
// архитектора; объявлено НА СТРАНИЦЕ, не на layout.
//
// Поиск живёт в адресе (`?q=`) и отбирается на сервере — работает без JS, ссылку
// с запросом можно переслать. Старая панель фильтровала загруженный массив в
// браузере.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { SearchForm } from "../_components/search-form";
import { listMedia, filterMedia } from "./_lib/media";
import { MediaTable } from "./_components/media-table";
import { UploadBar } from "./_components/upload-bar.client";

export const dynamic = "force-dynamic";

const fill = (t: string, vars: Record<string, string>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

export default async function MediaPage(
  { params, searchParams }: {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ q?: string }>;
  },
) {
  const { lang } = await params;
  const { q = "" } = await searchParams;
  const s = getAdminStrings(lang);
  const m = s.media;

  const list = await listMedia();
  const items = list.ok ? filterMedia(list.items, q, list.publicBase) : [];

  const actionLabels = {
    actions: m.actions, preview: m.preview, trim: m.trim, edit: m.edit,
    copyUrl: m.copyUrl, delete: m.delete, copied: m.copied,
    editTitle: m.editTitle, titleField: m.titleField, descriptionField: m.descriptionField,
    cancel: m.cancel, save: m.save, saved: m.saved, failed: m.failed,
    deleteTitle: m.deleteTitle, deleteBody: m.deleteBody, deleted: m.deleted,
    previewLabels: m.previewLabels,
    trimmerLabels: m.trimmer,
  };

  return (
    <PageShell lang={lang} slug="media" s={s} title={s.pages.media.title} hint={s.pages.media.hint}>
      {!list.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{m.unavailable}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{list.reason}</p>
        </div>
      ) : (
        <>
          {/* Сервер не смог назвать свой публичный адрес — файлы в браузере не
              откроются, и сказать об этом надо здесь, а не молча отдать битые
              ссылки. */}
          {list.baseReason && (
            <p className="mb-3 rounded-md border border-dashed border-amber-500/50 px-3 py-2 text-[11px] text-amber-600 dark:text-amber-400">
              {list.baseReason}
            </p>
          )}

          <UploadBar
            mediaBase={list.publicBase}
            labels={{
              verb: m.uploadVerb, image: m.image, video: m.video, pdf: m.pdf,
              markdown: m.markdown, html: m.html,
              uploading: m.uploading, uploaded: m.uploaded, failed: m.failed,
              cropper: m.cropper, trimmer: m.trimmer,
            }}
          />

          <div className="mt-3">
            <SearchForm value={q} placeholder={m.searchPlaceholder} submit={m.search} />
          </div>

          <p className="mt-2 text-[10px] text-muted-foreground">
            {q
              ? fill(m.countFiltered, { shown: String(items.length), total: String(list.items.length) })
              : fill(m.count, { total: String(list.items.length) })}
            <span className="ml-2 font-mono">{m.storageNote}</span>
          </p>

          <div className="mt-2">
            {list.items.length === 0 ? (
              <p className="py-8 text-center text-[11px] text-muted-foreground">{m.empty}</p>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-[11px] text-muted-foreground">{fill(m.noMatch, { query: q })}</p>
            ) : (
              <MediaTable
                items={items}
                mediaBase={list.publicBase}
                labels={{
                  title: m.colTitle, name: m.colName, description: m.colDescription, url: m.colUrl,
                  ext: m.colExt, type: m.colType, crop: m.colCrop, size: m.colSize,
                  dimensions: m.colDimensions, created: m.colCreated,
                }}
                actionLabels={actionLabels}
              />
            )}
          </div>
        </>
      )}

      <HelpDetails label={m.helpLabel}>
        <p><strong>{m.helpHoldsTitle}</strong> {m.helpHolds}</p>
        <p><strong>{m.helpVsDbTitle}</strong> {m.helpVsDb}</p>
        <p><strong>{m.helpCostTitle}</strong> {m.helpCost}</p>
        <p><strong>{m.helpWeakTitle}</strong> {m.helpWeak}</p>
      </HelpDetails>
    </PageShell>
  );
}
