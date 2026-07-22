import type { Param } from "../../params";
import { controlPanelStrings } from "../../i18n";

// ТАБЛИЦА ОБЪЯВЛЕННЫХ ПОЛЕЙ — общий компонент административной половины: показывает, что именно пульт
// спрашивает, ровно так, как это записано в ядре. Серверный, без JavaScript.
export default function ParamsTable({ params, lang }: { params: Param[]; lang: string }) {
  const L = controlPanelStrings(lang);
  if (params.length === 0) return <p className="text-sm text-muted-foreground">{L.noParams}</p>;

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
          <th className="py-1 pr-4 font-medium">{L.paramKey}</th>
          <th className="py-1 pr-4 font-medium">{L.paramType}</th>
          <th className="py-1 font-medium" />
        </tr>
      </thead>
      <tbody>
        {params.map((p) => (
          <tr key={p.key} className="border-b last:border-b-0">
            <td className="py-1 pr-4 font-mono text-xs">{p.key}</td>
            <td className="py-1 pr-4">{p.type ?? "text"}</td>
            <td className="py-1 text-xs text-muted-foreground">{p.required ? L.required : L.optional}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
