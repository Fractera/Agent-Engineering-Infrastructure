// Таблица медиатеки (шаг 501, Ф2, партия 4). СЕРВЕРНЫЙ компонент: строки
// приезжают готовым HTML, в браузере оживают только меню действий.
//
// Столбцы и их порядок — как в старой панели: title, name, description, url, ext,
// type, crop, size, dimensions, created. Ширину таблице даёт переключатель в
// подвале (`data-app-column`), поэтому здесь никаких фиксированных чисел.

import { fileHref, type MediaItem } from "../_lib/media";
import { ItemActions, type ItemActionLabels } from "./item-actions.client";

export type MediaTableLabels = {
  title: string; name: string; description: string; url: string; ext: string;
  type: string; crop: string; size: string; dimensions: string; created: string;
};

export function MediaTable(
  { items, mediaBase, labels, actionLabels }: {
    items: MediaItem[];
    mediaBase: string;
    labels: MediaTableLabels;
    actionLabels: ItemActionLabels;
  },
) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="w-8 border-r border-border px-3 py-2" />
            {[labels.title, labels.name, labels.description, labels.url, labels.ext,
              labels.type, labels.crop, labels.size, labels.dimensions, labels.created].map((h) => (
              <th key={h} className="border-r border-border px-3 py-2 text-left font-mono font-medium whitespace-nowrap text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const sizeKb = (item.size / 1024).toFixed(1);
            const dims = item.width && item.height
              ? `${item.width}×${item.height}`
              : item.duration ? `${item.duration.toFixed(1)}s` : "—";
            const created = item.created_at.replace("T", " ").slice(0, 16);
            // Адрес файла считается от ПУБЛИЧНОГО адреса слоя данных: браузер
            // обращается к `data.<домен>`, а не к петле сервера.
            const href = fileHref(mediaBase, item.id, item.size);

            return (
              <tr key={item.id} className="border-b border-border transition-colors hover:bg-muted/30">
                <td className="border-r border-border px-2 py-1.5 text-center">
                  <ItemActions item={item} mediaBase={mediaBase} fileUrl={href} labels={actionLabels} />
                </td>
                <td className="max-w-[140px] border-r border-border px-3 py-1.5">
                  <span className="block truncate font-mono text-foreground" title={item.title}>
                    {item.title || <span className="text-muted-foreground/40">—</span>}
                  </span>
                </td>
                <td className="max-w-[140px] border-r border-border px-3 py-1.5">
                  <span className="block truncate font-mono text-muted-foreground" title={item.name}>{item.name}</span>
                </td>
                <td className="max-w-[140px] border-r border-border px-3 py-1.5">
                  <span className="block truncate font-mono text-muted-foreground" title={item.description}>
                    {item.description || <span className="text-muted-foreground/40">—</span>}
                  </span>
                </td>
                <td className="max-w-[220px] border-r border-border px-3 py-1.5">
                  <span className="block truncate font-mono text-[10px] text-muted-foreground" title={item.url}>{item.url}</span>
                </td>
                <td className="border-r border-border px-3 py-1.5 font-mono text-muted-foreground">.{item.extension}</td>
                <td className="border-r border-border px-3 py-1.5 font-mono whitespace-nowrap text-muted-foreground">{item.mime_type}</td>
                <td className="border-r border-border px-3 py-1.5 font-mono whitespace-nowrap text-muted-foreground">{item.crop_mode || "—"}</td>
                <td className="border-r border-border px-3 py-1.5 font-mono whitespace-nowrap text-muted-foreground">{sizeKb} KB</td>
                <td className="border-r border-border px-3 py-1.5 font-mono whitespace-nowrap text-muted-foreground">{dims}</td>
                <td className="border-r border-border px-3 py-1.5 font-mono whitespace-nowrap text-muted-foreground">{created}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
