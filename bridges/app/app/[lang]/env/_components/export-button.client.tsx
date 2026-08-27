"use client";

// Кнопка выгрузки окружения — оранжевая и пульсирующая (шаг 25-5).
//
// 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА ДОСЛОВНО (2026-08-26): «голубая кнопка незаметна
// пользователем… сделать на голубом фоне оранжевую пульсирующую кнопку, которая
// после нажатия становится голубой… когда вернётся на эту страницу, пусть она
// снова будет пульсирующая оранжевая». Мастер запуска отправляет человека сюда
// одним шагом из тринадцати — если он кнопку не найдёт, шаг не пройден, а причина
// невидима.
//
// 🔒 СОСТОЯНИЕ ЖИВЁТ В `sessionStorage`, А НЕ В ОТМЕТКЕ НА СЕРВЕРЕ. Владелец сказал
// «до следующего перехода на эту страницу» — это про сеанс просмотра, а не про
// вечный факт. Серверная отметка сделала бы кнопку голубой навсегда после первого
// нажатия, то есть ровно наоборот сказанному.
//
// 🔒 ЭТО ПО-ПРЕЖНЕМУ ССЫЛКА НА СКАЧИВАНИЕ (`<a download>`), а не `fetch`. Выгрузка
// работает без JS, и терять это ради анимации нельзя: островок красит и запоминает,
// но не встаёт на пути файла.
//
// 🔒 `sessionStorage` МОЖЕТ БРОСИТЬ. Приватное окно, запрет данных сайта, снимок
// превью — любой доступ падает исключением. Оба обращения обёрнуты, и при отказе
// кнопка просто остаётся оранжевой: это её нормальный, а не сломанный вид.

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

const SEEN = "fractera:env-export-used";

export function ExportButton(
  { labels }: { labels: { action: string; title: string } },
) {
  // Оранжевая по умолчанию: до ответа хранилища человек видит заметное, а не серое.
  const [used, setUsed] = useState(false);

  useEffect(() => {
    try { setUsed(sessionStorage.getItem(SEEN) === "1"); } catch { /* хранилище закрыто */ }
  }, []);

  function remember() {
    setUsed(true);
    try { sessionStorage.setItem(SEEN, "1"); } catch { /* хранилище закрыто */ }
  }

  return (
    <a
      href="/api/config/env-export"
      download=".env.local"
      title={labels.title}
      onClick={remember}
      className={
        "inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-[12px] font-medium transition-colors " +
        (used
          ? "border border-blue-500/40 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-300"
          : "launch-pulse bg-orange-600 text-white hover:bg-orange-500")
      }
    >
      <Download size={13} />
      <span className="font-mono">{labels.action}</span>
    </a>
  );
}
