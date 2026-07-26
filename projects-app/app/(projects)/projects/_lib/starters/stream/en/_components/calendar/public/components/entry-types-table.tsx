import type { EntryType, Tone } from "../../entries";
import { calendarStrings } from "../../i18n";
import { pick } from "../../../shared/localized";

// ТАБЛИЦА ОБЪЯВЛЕННЫХ ВИДОВ ЗАПИСЕЙ — общий компонент административной половины: показывает, из чего
// состоит календарь, ровно так, как это записано в ядре. Серверный, без JavaScript.
//
// Кружок цвета стоит рядом с ключом не ради украшения: владелец видит на витрине точки и полосы, и по
// таблице должен понимать, какой вид какого цвета, не сверяя это с кодом.
const DOT: Record<Tone, string> = { event: "bg-blue-500", reminder: "bg-amber-500" };

export default function EntryTypesTable({ types, lang }: { types: EntryType[]; lang: string }) {
  const L = calendarStrings(lang);
  if (types.length === 0) return <p className="text-sm text-muted-foreground">{L.noTypes}</p>;

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
          <th className="py-1 pr-4 font-medium">{L.entryType}</th>
          <th className="py-1 font-medium" />
        </tr>
      </thead>
      <tbody>
        {types.map((t) => (
          <tr key={t.key} className="border-b last:border-b-0">
            <td className="py-1 pr-4 font-mono text-xs">
              <span className={`mr-2 inline-block size-2 rounded-full align-middle ${DOT[t.tone]}`} />
              {t.key}
            </td>
            <td className="py-1 text-xs text-muted-foreground">
              {pick(t.label, lang) || (t.key === "event" ? L.typeEvent : t.key === "reminder" ? L.typeReminder : "")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
