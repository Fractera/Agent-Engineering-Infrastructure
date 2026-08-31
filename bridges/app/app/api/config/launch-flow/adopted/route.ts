import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { resolve } from "path";
import { execFileSync } from "child_process";
import { requireAuth } from "@/lib/require-auth";
import { setFlowAdopted, flowAdoptedAt, flowValue } from "@/lib/launch-flow";
import { getValue } from "@/lib/dev-tools-marks";
import { ADOPT_URL_KEY } from "@/app/api/config/launch/adopt/route";

// ЗАКРЫТИЕ ШАГА «ДОНОР ПОДКЛЮЧЁН» — МАШИНОЙ, А НЕ ЧЕЛОВЕКОМ (35-3, 2026-08-31).
//
// 🔒 ПРАВДА ШАГА ЖИВЁТ ТАМ ЖЕ, ГДЕ САМА СПОСОБНОСТЬ. Дверь не верит браузеру на
// слово «сборка прошла» — она смотрит на слот сама. У панели есть глаза на
// собственный слот, значит отговорки «спросить неоткуда» здесь нет, а отметка,
// поставленная по слову клиента, поздравляла бы человека с тем, чего он не делал.
// ✗ Ровно этим оплачен шаг 25: шаг «ключ» заимствовал чужую отметку и загорался
// зелёным при отсутствии ключа.
//
// 🔒 ПЯТЬ ПРИЗНАКОВ, И КАЖДЫЙ ОТВЕЧАЕТ ЗА СВОЮ ЧАСТЬ УТВЕРЖДЕНИЯ:
//   1. адрес донора сохранён                  — человек этот путь действительно шёл;
//   2. замена ЗАПИСАЛА ЭТОТ ЖЕ адрес          — она состоялась, и именно с ним;
//   3. слот является репозиторием             — замена не оборвалась на полпути;
//   4. у него НЕТ remote                      — отвязка 35-2 состоялась;
//   5. в слоте есть `.next`                   — сборка на новом содержимом прошла.
// Убрать любой — и отметка начнёт утверждать больше, чем проверено.
//
// ✗ 🔒 ВТОРОЙ ПРИЗНАК ПОЯВИЛСЯ НЕ СРАЗУ, И БЕЗ НЕГО ДВЕРЬ ЛГАЛА БЫ. Сначала их
// было четыре — и все четыре сходятся у СТАРТОВОГО слота сразу после рождения
// сервера: `bootstrap.sh` оставляет его точно таким же — свой репозиторий, ноль
// remote, собранный. Человеку, который всего лишь сохранил адрес донора и не
// нажимал замену, шаг загорелся бы зелёным. Ровно тот дефект, которым оплачен
// шаг 25, и поймать его удалось только тем, что признаки были продуманы ДО
// замера: «а чем этот слот отличается от стартового?».
//
// 🔒 ОТЛИЧАЕТ ИХ ЗАПИСЬ, КОТОРУЮ ДЕЛАЕТ САМА ЗАМЕНА. `USER_ADOPT_REPO_URL`
// ставит дверь `launch/adopt` и только после удачного обмена. Это не слово
// браузера и не намерение человека, а след действия — и совпадение его с
// адресом донора говорит, что заменили именно тем, чем собирались.
//
// 🔒 ОТКАЗ НАЗЫВАЕТ, КАКОЙ ИМЕННО ПРИЗНАК НЕ СОШЁЛСЯ. «Не получилось» — сообщение
// о состоянии программы; человеку нужно следующее действие, а нам — возможность
// отличить «сборка ещё идёт» от «отвязка не сработала».
//
// 🔒 `409`, А НЕ `400`. Запрос сформулирован правильно, но состояние сервера ему
// противоречит — тот же ответ и по той же причине, что у машинного шага первого
// пути.

const SLOT_DIR = process.env.APP_DIR ?? resolve(process.cwd(), "../../app");

/**
 * 🔒 `safe.directory` ОБЯЗАТЕЛЕН. Слот принадлежит несуществующему UID, и без
 * исключения git отказывает «dubious ownership» — а отказ здесь ловится и
 * выглядит как честный ответ «remote нет». Тогда третий признак сошёлся бы
 * ВСЕГДА, и отметка вставала бы у неотвязанного слота. ✗ измерено в 35-2.
 */
function git(args: string[]): string {
  try {
    return execFileSync("git", ["-c", `safe.directory=${SLOT_DIR}`, "-C", SLOT_DIR, ...args], {
      encoding: "utf8",
      timeout: 10_000,
    }).toString().trim();
  } catch {
    return "";
  }
}

type Check = { ok: true } | { ok: false; reason: string };

function slotIsAdopted(): Check {
  const donor = flowValue("fork-url");
  if (donor === "") return { ok: false, reason: "no-donor-url" };
  if (getValue(ADOPT_URL_KEY).trim() !== donor) return { ok: false, reason: "not-replaced" };
  if (git(["rev-parse", "--is-inside-work-tree"]) !== "true") return { ok: false, reason: "slot-not-a-repo" };
  // ✗ 🔒 ПРИЗНАК ПЕРЕВЁРНУТ 75-3, И ЭТО НЕ ОПЕЧАТКА. Здесь стояло «remote обязан
  // быть ПУСТ»: слот приезжал от чужого донора и отвязывался. С моделью форка
  // всё наоборот — remote обязан БЫТЬ и указывать на форк человека. Не поправив
  // эту строку, мы получили бы шаг, который невозможно закрыть в принципе.
  const remote = git(["remote", "get-url", "origin"]).replace(/x-access-token:[^@]*@/, "");
  if (remote === "") return { ok: false, reason: "still-detached" };
  if (remote.replace(/.git$/, "") !== donor.replace(/.git$/, "")) {
    return { ok: false, reason: "wrong-remote" };
  }
  if (!fs.existsSync(resolve(SLOT_DIR, ".next"))) return { ok: false, reason: "not-built" };
  return { ok: true };
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const verdict = slotIsAdopted();
  if (!verdict.ok) {
    // 🔒 Отметка не просто не ставится — она СНИМАЕТСЯ, если стояла. Состояние,
    // которое перестало быть правдой, обязано перестать светиться зелёным.
    setFlowAdopted(false);
    return NextResponse.json({ ok: false, reason: verdict.reason }, { status: 409 });
  }

  setFlowAdopted(true);
  return NextResponse.json({ ok: true, at: flowAdoptedAt() });
}

// Чем шаг закрыт прямо сейчас — тот же вопрос, заданный без записи.
export async function GET(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const verdict = slotIsAdopted();
  return NextResponse.json({
    adopted: flowAdoptedAt() !== "",
    at: flowAdoptedAt(),
    truth: verdict.ok ? "ok" : verdict.reason,
  });
}
