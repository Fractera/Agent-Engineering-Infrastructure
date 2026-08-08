// Найденное по смыслу (шаг 501, Ф2, партия 5). СЕРВЕРНЫЙ компонент.
//
// Столбцы как в старой панели: score, collection, row, text. Ссылка на строку
// показывается парой «таблица · id» — именно так вектор указывает назад на факт,
// который его породил.

import type { Hit } from "../_lib/vectors";

export type HitsLabels = { score: string; collection: string; row: string; text: string };

export function HitsTable({ hits, labels }: { hits: Hit[]; labels: HitsLabels }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {[labels.score, labels.collection, labels.row, labels.text].map((h) => (
              <th key={h} className="border-r border-border px-3 py-2 text-left font-mono font-medium whitespace-nowrap text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hits.map((h) => (
            <tr key={h.id} className="border-b border-border transition-colors hover:bg-muted/30">
              <td className="border-r border-border px-3 py-1.5 font-mono whitespace-nowrap text-foreground">
                {h.score.toFixed(3)}
              </td>
              <td className="max-w-[160px] border-r border-border px-3 py-1.5">
                <span className="block truncate font-mono text-muted-foreground" title={h.collection}>{h.collection}</span>
              </td>
              <td className="max-w-[220px] border-r border-border px-3 py-1.5">
                {h.refTable ? (
                  <span className="block truncate font-mono text-muted-foreground" title={`${h.refTable} · ${h.refId ?? ""}`}>
                    {h.refTable}<span className="text-muted-foreground/40"> · </span>{h.refId ?? "—"}
                  </span>
                ) : (
                  <span className="font-mono text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="border-r border-border px-3 py-1.5">
                <span className="block font-mono text-foreground">{h.text}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
