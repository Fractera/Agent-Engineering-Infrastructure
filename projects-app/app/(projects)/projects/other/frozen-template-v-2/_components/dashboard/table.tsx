import { listRows } from "../../_lib/rows";

// ТАБЛИЦА ДАШБОРДА — СЕРВЕРНЫЙ компонент: читает строки прямо из локального хранилища (_lib/rows →
// _data/runtime/rows.jsonl), без клиентского fetch. Работает и без JavaScript (канон статики). Строки
// появляются после успешных прогонов api/run; перезагрузка страницы показывает свежие. Заголовки — 10
// языков (правило 4г).
type Lang = "en" | "es" | "fr" | "it" | "ru" | "de" | "pt" | "pl" | "tr" | "nl";
const HEAD: Record<Lang, { date: string; company: string; ticker: string; price: string; empty: string }> = {
  en: { date: "Date", company: "Company", ticker: "Ticker", price: "Price", empty: "No records yet — run a price request." },
  es: { date: "Fecha", company: "Empresa", ticker: "Símbolo", price: "Precio", empty: "Aún no hay registros — lanza una consulta de precio." },
  fr: { date: "Date", company: "Entreprise", ticker: "Symbole", price: "Prix", empty: "Aucun enregistrement — lancez une demande de prix." },
  it: { date: "Data", company: "Azienda", ticker: "Simbolo", price: "Prezzo", empty: "Nessun record — avvia una richiesta di prezzo." },
  ru: { date: "Дата", company: "Компания", ticker: "Тикер", price: "Цена", empty: "Записей пока нет — запустите запрос цены." },
  de: { date: "Datum", company: "Firma", ticker: "Kürzel", price: "Preis", empty: "Noch keine Einträge — starte eine Preisabfrage." },
  pt: { date: "Data", company: "Empresa", ticker: "Símbolo", price: "Preço", empty: "Ainda sem registros — faça uma consulta de preço." },
  pl: { date: "Data", company: "Firma", ticker: "Symbol", price: "Cena", empty: "Brak rekordów — uruchom zapytanie o cenę." },
  tr: { date: "Tarih", company: "Şirket", ticker: "Sembol", price: "Fiyat", empty: "Henüz kayıt yok — bir fiyat sorgusu çalıştırın." },
  nl: { date: "Datum", company: "Bedrijf", ticker: "Symbool", price: "Prijs", empty: "Nog geen records — start een prijsopvraging." },
};

function fmtDate(v: unknown): string {
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v ?? "") : d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export default async function DashboardTable({ lang }: { lang: string }) {
  const L = HEAD[(lang as Lang) in HEAD ? (lang as Lang) : "en"];
  const rows = await listRows("history");

  if (rows.length === 0) return <p className="py-2 text-sm text-muted-foreground">{L.empty}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-4 font-medium">{L.date}</th>
            <th className="py-2 pr-4 font-medium">{L.company}</th>
            <th className="py-2 pr-4 font-medium">{L.ticker}</th>
            <th className="py-2 pr-4 font-medium">{L.price}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-b-0">
              <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(r.date)}</td>
              <td className="py-2 pr-4">{String(r.company ?? "")}</td>
              <td className="py-2 pr-4 font-mono text-xs">{String(r.ticker ?? "")}</td>
              <td className="py-2 pr-4 tabular-nums">{typeof r.price === "number" ? `$${r.price.toFixed(2)}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
