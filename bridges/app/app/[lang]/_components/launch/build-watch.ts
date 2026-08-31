// ОЖИДАНИЕ СБОРКИ: ОДИН ПРИЁМ НА ВСЮ ПАНЕЛЬ (35-3, 2026-08-31).
//
// 🔒 ЭТО НЕ НОВЫЙ КОД, А ВЫНЕСЕННЫЙ. Ровно так ждёт сборку подвал панели
// (`_components/footer-actions.client.tsx`, кнопка развёртывания) — и там же он
// был написан единственный раз. Второму месту, которому понадобилось то же
// ожидание, полагалось бы либо переписать его рядом, либо взять готовое. Второй
// экземпляр разошёлся бы с первым на первой правке — например, когда изменится
// набор конечных состояний, — и разошёлся бы молча: оба продолжали бы работать,
// просто по-разному.
//
// 🔒 ПОЧЕМУ ОПРОС, А НЕ ОТВЕТ. Сборка — отдельная задача на сервере со своим
// замком и журналом; дверь возвращает НОМЕР ЗАДАНИЯ и не ждёт её конца. Ждать
// ответа было бы ожиданием минут в открытом соединении.
//
// 🔒 ГЛАВНАЯ ТОНКОСТЬ — ЧУЖОЙ ИТОГ. Журнал опережающей записи ОДИН на все
// прогоны. Пока в нём стоит чужой номер, там лежит итог ПРОШЛОЙ сборки, и
// принять его за свой значит объявить успех чужой работы. Поэтому ждём, пока
// запись станет нашей, и только потом читаем состояние.
//
// 🔒 СТРАХОВКА ОТ ВЕЧНОГО ОЖИДАНИЯ ОБЯЗАТЕЛЬНА. Если запись так и не обновится,
// опрос без предела крутился бы, пока открыта вкладка, а человек ждал бы того,
// чего не будет.

/** Конечные состояния сборки. Всё остальное означает «ещё идёт». */
const FINAL = ["COMPLETED", "FAILED", "HEALTH_FAILED"] as const;

export type BuildOutcome = {
  ok: boolean;
  /** Состояние из журнала, или `timeout`, если ждать перестали. */
  status: string;
  /** Журнал сборки одной строкой. Пусто — журнала не нашлось. */
  log: string;
};

export type BuildWatchOptions = {
  /** Как часто спрашивать. По умолчанию — как в подвале панели. */
  everyMs?: number;
  /** Сколько ждать до отказа. По умолчанию — как в подвале панели. */
  timeoutMs?: number;
  /** Подменяется в проверке; в браузере — обычный `fetch`. */
  fetchImpl?: typeof fetch;
};

/**
 * Дождаться конца сборки с номером `jobId`.
 *
 * Возвращает итог; исключений не бросает — оборванная сеть означает «спросим
 * ещё раз», а не отказ: сборка от этого не останавливается.
 */
export function watchBuild(
  jobId: string,
  onDone: (outcome: BuildOutcome) => void,
  opts: BuildWatchOptions = {},
): () => void {
  const everyMs = opts.everyMs ?? 3000;
  const timeoutMs = opts.timeoutMs ?? 20 * 60 * 1000;
  const doFetch = opts.fetchImpl ?? fetch;

  const startedAt = Date.now();
  let stopped = false;

  const timer = setInterval(tick, everyMs);
  const stop = () => { if (!stopped) { stopped = true; clearInterval(timer); } };

  async function tick() {
    if (stopped) return;
    try {
      const s = (await doFetch(`/api/deploy/status?jobId=${encodeURIComponent(jobId)}`, {
        cache: "no-store",
        credentials: "include",
      }).then((x) => x.json())) as {
        status?: string;
        log?: unknown;
        wal?: { jobId?: unknown };
        error?: unknown;
      };

      // Запись ещё не наша — значит, это итог чужой сборки. Ждём.
      const mine = !s.wal?.jobId || String(s.wal.jobId) === jobId;
      const status = String(s.status ?? "");
      const done = mine && (FINAL as readonly string[]).includes(status);

      if (!done) {
        if (Date.now() - startedAt > timeoutMs) {
          stop();
          onDone({ ok: false, status: "timeout", log: "" });
        }
        return;
      }

      stop();
      const log = Array.isArray(s.log) ? s.log.join("\n") : String(s.log ?? "");
      onDone({
        ok: status === "COMPLETED",
        status,
        log: log || String(s.error ?? status),
      });
    } catch {
      /* сеть моргнула — опрос продолжается, сборка от этого не остановилась */
    }
  }

  return stop;
}
