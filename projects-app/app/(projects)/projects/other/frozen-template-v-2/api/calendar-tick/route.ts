import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { authorize } from "@/lib/nodes";
import { deliverDue } from "../../_lib/components/calendar/deliver";

// ДВЕРЬ РАЗВОЗКИ ПО НАСТУПЛЕНИЮ — её зовёт планировщик сервера раз в период (объявление в `cron.json`
// этой папки). Она НЕ исполняет граф автоматизации: исполнение живёт только в `api/run`. Здесь —
// серверный двойник браузерного сторожа: найти наступившие записи и отправить то, что у них включено.
//
// ЗАЧЕМ ОНА ЕСТЬ, если уведомление уже показывает сторож: закрытая вкладка не отправляет писем.
// Уведомление на экране вправе зависеть от того, смотрит ли кто-то на страницу; доставка наружу — нет.
//
// КТО МОЖЕТ ВОЙТИ: общий `authorize` — либо сессия владельца (ручной прогон «проверить сейчас»), либо
// секрет пропуска агента, который планировщик присылает заголовком `x-fractera-agent-gate`. Без него в
// защищённом режиме дверь ответит отказом, и развозка будет молча не работать — это уже случалось.
//
// ОТВЕТ — ОТЧЁТ, А НЕ «ок». Планировщик пишет его в журнал прогонов, и по нему видно, сколько записей
// наступило, что ушло, что упало и по какой причине. Пустой отчёт — законный результат: значит, не
// наступило ничего.
export const runtime = "nodejs";

/** Секрет пропуска нужен, чтобы толкнуть СОСЕДНЮЮ автоматизацию: её дверь тоже под охраной. */
async function gateSecret(): Promise<string | undefined> {
  try {
    const path = join(process.cwd(), "app", "(projects)", "projects", "project-config", "agent-gate-secret");
    const s = (await readFile(path, "utf8")).trim();
    return s || undefined;
  } catch {
    return undefined; // нет секрета — доставка в соседнюю автоматизацию честно упадёт и попадёт в отчёт
  }
}

async function tick(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Origin передаётся из запроса: папка не имеет права знать ни порт, ни домен сервера (закон 0).
  const report = await deliverDue({ origin: req.nextUrl.origin, gate: await gateSecret() });

  // resultTitle — то, что планировщик покажет в таблице результатов одной строкой.
  const resultTitle = `due ${report.due} · sent ${report.sent.length} · failed ${report.failed.length}`;
  return NextResponse.json({ ok: report.failed.length === 0, resultTitle, ...report });
}

export const POST = tick;
export const GET = tick; // тем же адресом удобно проверить руками из браузера владельца
