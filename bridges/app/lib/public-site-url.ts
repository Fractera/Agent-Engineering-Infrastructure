import Database from "better-sqlite3";
import { readServerIp } from "@/lib/server-ip";
import { isSecureMode } from "@/lib/secure-mode";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

// АДРЕС САМОГО САЙТА, КАКИМ ЕГО ВИДИТ ПОСТОРОННИЙ (28-28, 2026-08-28).
//
// 🔒 ЗАЧЕМ ОТДЕЛЬНО ОТ `publicDataUrl()`. Тот отвечает про слой данных и всегда
// про порт `3300`; здесь нужен адрес гостевого приложения — то, что человек
// откроет в браузере и сравнит с `localhost:3000`. Функция одна на оба вопроса
// молча начала бы отдавать адрес данных там, где ждут сайт.
//
// 🔒 ИСТИНА О РЕЖИМЕ — В ОКРУЖЕНИИ, А НЕ В БАЗЕ. `domain_status` становится
// `active`, когда ВЫПУЩЕН СЕРТИФИКАТ, — задолго до перехода в защищённый режим.
// Спрашивать базу значит однажды пообещать человеку `https://`, пока сервер
// работает по IP. Поэтому режим берётся у `isSecureMode()`, а база отвечает
// только на вопрос «как называется домен».
export type PublicSite =
  | { mode: "domain"; url: string; host: string }
  | { mode: "ip"; url: string; host: string }
  | { mode: "unknown"; url: null; host: null };

export function publicSiteUrl(): PublicSite {
  if (isSecureMode()) {
    try {
      const db = new Database(APP_DB, { readonly: true });
      const row = db
        .prepare("SELECT custom_domain FROM site_settings WHERE id = 1")
        .get() as { custom_domain?: string | null } | undefined;
      db.close();
      if (row?.custom_domain) {
        return { mode: "domain", url: `https://${row.custom_domain}`, host: row.custom_domain };
      }
    } catch {
      // Таблицы ещё нет — сервер не проходил визард домена. Падать нельзя:
      // ответ нужен странице шага, а не наоборот.
    }
  }

  const ip = readServerIp();
  if (ip) return { mode: "ip", url: `http://${ip}:3000`, host: `${ip}:3000` };

  // 🔒 ТРЕТИЙ ИСХОД НАЗВАН ЯВНО. Без него страница подставила бы пустую строку в
  // предложение «ваш сайт живёт по адресу …», и человек прочитал бы обрубок как
  // поломку. Не знаем — так и говорим.
  return { mode: "unknown", url: null, host: null };
}
