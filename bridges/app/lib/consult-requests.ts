// Запросы на консультацию — замер спроса (владелец 2026-08-14).
//
// 🔒 ЗАЧЕМ ЭТО ВООБЩЕ ПИШЕТСЯ НА СЕРВЕР. Кнопка заведена «для тестирования
// спроса»: названия инструментов ничего не говорят человеку, и вопрос в том,
// многие ли просят помощь. Спрос считается по НАЖАТИЯМ, а не по дошедшим
// письмам — письмо человек может не отправить, передумать в почтовом клиенте
// или писать с другого адреса, и тогда самый интересный сигнал («здесь людям
// нужна помощь») пропадёт вместе с ним.
//
// 🔒 ПОЧЕМУ ФАЙЛ, А НЕ БАЗА. Строка в файле переживает пересборку, читается
// глазами и уезжает вместе с сервером владельца. Таблицу ради счётчика заводить
// незачем; понадобится сводка — она соберётся из этих строк.
//
// ЛИЧНЫХ ДАННЫХ ЗДЕСЬ НЕТ. Пишется откуда пришёл запрос и когда. Обратный адрес
// живёт в самом письме, которое отправляет человек своей почтой, и на сервер не
// попадает — записывать чужую почту, о которой не просили, мы не будем.

import fs from "fs";
import path from "path";

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
const DIR = "SUPPORT";
const FILE = "consult-requests.jsonl";

export type ConsultRequest = {
  at: string;
  /** Откуда позвали — адрес страницы панели. */
  page: string;
  /** О чём именно: сегодня один повод, инструменты разработки. */
  topic: string;
};

export function recordConsult(req: Omit<ConsultRequest, "at">): void {
  const dir = path.join(APP_DIR, DIR);
  fs.mkdirSync(dir, { recursive: true });
  const line = JSON.stringify({ at: new Date().toISOString(), ...req }) + "\n";
  fs.appendFileSync(path.join(dir, FILE), line, "utf-8");
}

/** Сколько раз просили помощь — число, ради которого кнопка и заведена. */
export function consultCount(topic?: string): number {
  try {
    const raw = fs.readFileSync(path.join(APP_DIR, DIR, FILE), "utf-8");
    return raw.split("\n").filter((l) => {
      if (!l.trim()) return false;
      if (!topic) return true;
      try { return (JSON.parse(l) as ConsultRequest).topic === topic; } catch { return false; }
    }).length;
  } catch {
    return 0;
  }
}
