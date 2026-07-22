import type { Column } from "../../columns";
import { dashboardStrings } from "../../i18n";
import { pick } from "../../../shared/localized";

// ТАБЛИЦА ОБЪЯВЛЕННЫХ КОЛОНОК — общий компонент административной половины: показывает, из чего состоит
// таблица, ровно так, как это записано в ядре. Серверный, без JavaScript.
export default function ColumnsTable({ columns, lang }: { columns: Column[]; lang: string }) {
  const L = dashboardStrings(lang);
  if (columns.length === 0) return <p className="text-sm text-muted-foreground">{L.noColumns}</p>;

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
          <th className="py-1 pr-4 font-medium">{L.columnKey}</th>
          <th className="py-1 font-medium" />
        </tr>
      </thead>
      <tbody>
        {columns.map((c) => (
          <tr key={c.key} className="border-b last:border-b-0">
            <td className="py-1 pr-4 font-mono text-xs">{c.key}</td>
            <td className="py-1 text-xs text-muted-foreground">{pick(c.label, lang)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
