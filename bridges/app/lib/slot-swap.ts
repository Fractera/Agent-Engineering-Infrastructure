import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

// Замена содержимого гостевого слота чужим проектом и возврат стартового шаблона
// (шаг 25-7, поток B мастера запуска).
//
// 🔒 СНАЧАЛА ДОНОР, ПОТОМ РАЗРУШЕНИЕ. Порядок здесь — главное свойство файла.
// Наивная реализация сносит слот и делает `git clone` на его место; опечатка в
// адресе, приватный репозиторий или упавшая сеть оставляют человека **без
// проекта и без замены**. Поэтому: проверяем адрес, клонируем в СОСЕДНЮЮ
// временную папку, и только когда клон лежит целиком — меняем местами.
// Не получилось на любом шаге до обмена — слот не тронут вовсе.
//
// 🔒 КОРЕНЬ ПРИХОДИТ ПАРАМЕТРОМ, А НЕ БЕРЁТСЯ ИЗ КОНСТАНТЫ. Это делает функцию
// проверяемой на временной папке — без сервера, без риска и без слова
// архитектора. Разрушающая работа, которую нельзя прогнать в тесте, не
// проверяется никогда.
//
// 🔒 СБОРКУ ЭТОТ ФАЙЛ НЕ ДЕЛАЕТ. Она — `runBuild()` из `app/api/deploy/route.ts`,
// со своим замком, журналом, откатом и проверкой здоровья. Вторая сборка рядом
// с первой означала бы две очереди на один слот.

/** Куда возвращаться, если в `app-slot.json` пусто. Названо вслух, а не спрятано. */
export const DEFAULT_STARTER_REPO = "https://github.com/Fractera/fractera-next-starter.git";

const SLOT_MANIFEST = process.env.APP_SLOT_MANIFEST ?? "/opt/fractera/app-slot.json";

export type SwapResult =
  | { ok: true; repoUrl: string; head: string; detached: boolean }
  | { ok: false; reason: string; touched: false };

/** Итог отвязки. `head` — короткий хэш единственного, базового коммита. */
export type DetachResult =
  | { ok: true; head: string }
  | { ok: false; reason: string };

/**
 * Чем закрывается проект, у которого своего `.gitignore` нет. Список дословно
 * повторяет `lib/bootstrap.sh` и `api/config/git-push`: третья редакция того же
 * перечня разошлась бы с двумя первыми, и разошлась бы молча.
 */
const GITIGNORE_BASELINE = [
  "node_modules/", ".next/", "out/", ".env.local", ".env*.local", "storage/",
  "data/*.sqlite", "data/*.sqlite-shm", "data/*.sqlite-wal",
] as const;

/**
 * Машинное, что не принадлежит проекту человека, — прячется локально, а не в его
 * `.gitignore`: тот файл принадлежит репозиторию гостя, и править его мы не вправе.
 *
 * Первые две строки взяты у `api/config/git-push`. Две последние добавлены здесь,
 * и вот чем они оплачены (замер 35-2 на временной папке).
 *
 * ✗ 🔒 `git add -A` ПОДЧИНЯЕТСЯ `.gitignore` ДОНОРА, А ДОНОР — ЧУЖОЙ ПРОЕКТ.
 * Стартер закрывает `.env.local` своим `.gitignore`, и на пути A это молчало.
 * Но донор пишет не Fractera: у проекта с `.gitignore` из одной строки базовый
 * коммит забрал `.env.local` целиком — с `REMOTE_DATA_KEY` внутри, — и первая же
 * отправка опубликовала бы ключ слоя данных в репозитории человека.
 * Измерено: `git show HEAD:.env.local` печатал ключ дословно.
 *
 * 🔒 Лечится ИСКЛЮЧЕНИЕМ, а не дописыванием в чужой `.gitignore`, и работает оно
 * потому, что после `git init` не отслеживается ещё ничего: исключение успевает
 * раньше первого `add`. Тот же довод, по которому `.env.local` переживает замену:
 * он принадлежит МАШИНЕ, а не проекту.
 */
const LOCAL_EXCLUDES = [
  "/.gitkeep", "/.next.last-good/", "/.env.local", "/.env*.local",
] as const;

function git(args: string[], cwd?: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 32 * 1024 * 1024,
  }).toString();
}

/**
 * Git ВНУТРИ слота — всегда через это, и никогда напрямую.
 *
 * ✗ 🔒 ОПЛАЧЕНО ЗАМЕРОМ 35-2 НА ЖИВОМ СЕРВЕРЕ. `/opt/fractera/app` принадлежит
 * `UNKNOWN:UNKNOWN` — UID, которого на машине нет: слот приезжает распаковкой, и
 * владелец файлов не совпадает ни с кем. Git такой каталог считает чужим и
 * отказывает: «fatal: detected dubious ownership in repository». Панель ходит
 * туда от root и ловит ошибку молча — поэтому дверь `adopt` годами отдавала
 * пустой `slotRemote`, и выглядело это как «remote не настроен», а не как отказ.
 *
 * 🔒 Отвязке это стоило бы всего: `.git` донора снесён, `git add` отказал —
 * и слот остался бы ВООБЩЕ без репозитория. Локальный прогон такого не ловит:
 * там папку создаёт тот же пользователь, что запускает тест.
 *
 * Исключение даётся ТОЧНЫМ путём, а не `*`: право «доверять любому каталогу»
 * стоит дороже, чем оно здесь нужно.
 */
function gitIn(root: string, args: string[]): string {
  return git(["-c", `safe.directory=${root}`, "-C", root, ...args]);
}

/** Адрес со встроенным токеном — только для команды, никогда в ответ и никогда в лог. */
function authUrl(repoUrl: string, token: string): string {
  if (!token) return repoUrl;
  return repoUrl.replace(/^https:\/\//, `https://x-access-token:${token}@`);
}

function scrub(text: string, token: string): string {
  return token ? text.split(token).join("***") : text;
}

/**
 * Откуда родился нынешний слот. Панель этого не знала до 25-7: ни `app-slot.json`,
 * ни `FRACTERA_APP_REPO_URL` в коде не встречались, и «вернуть как было» было
 * некуда. Пусто или нечитаемо — берём названную константу, а не гадаем.
 */
export function starterRepoUrl(): string {
  try {
    const raw = fs.readFileSync(SLOT_MANIFEST, "utf8");
    const url = (JSON.parse(raw) as { repoUrl?: unknown }).repoUrl;
    if (typeof url === "string" && url.trim()) return url.trim();
  } catch { /* манифеста нет — это нормально на свежем сервере */ }
  return DEFAULT_STARTER_REPO;
}

/**
 * Что переживает замену. Признак один: **принадлежит МАШИНЕ, а не проекту**.
 *
 * `.env.local` — ключи слоя данных и адрес сервера; чужой проект их не привозит,
 * а без них не поднимется ни он, ни откат к шаблону.
 *
 * ✗ 🔒 `.next.last-good` ДОБАВЛЕН 35-9, И ЭТО ОПЛАЧЕНО ЖИВЫМ ИНЦИДЕНТОМ. Это
 * копия последней РАБОЧЕЙ сборки этого сервера — единственное, к чему можно
 * откатиться, когда новая сборка упала. Она сносилась той же заменой, после
 * которой чаще всего и нужна: владелец подключил донора, сборка отказала, и в
 * логе стояло «no previous good build stored — the artifact stays broken».
 * Защита была выключена ровно тем действием, при котором она нужна.
 *
 * 🔒 `node_modules` СЮДА НЕ ВХОДИТ, И ЭТО РЕШЕНИЕ, А НЕ НЕДОСМОТР. Зависимости
 * принадлежат ПРОЕКТУ: у донора свой `package.json`, и оставить пакеты
 * предыдущего проекта значило бы собрать новый на чужих библиотеках. Их ставят
 * заново — см. `installFirst` в `api/deploy`.
 */
const DEFAULT_KEEP: readonly string[] = [".env.local", ".next.last-good"];

/** Всё содержимое папки, кроме того, что принадлежит машине. */
function wipeContents(root: string, keep: readonly string[]): void {
  for (const name of fs.readdirSync(root)) {
    if (keep.includes(name)) continue;
    fs.rmSync(path.join(root, name), { recursive: true, force: true });
  }
}

/**
 * Заменить содержимое `root` содержимым репозитория `repoUrl`.
 *
 * 🔒 `.env.local` ПЕРЕЖИВАЕТ ЗАМЕНУ. В нём ключи слоя данных, адрес сервера и
 * отметки мастера; чужой проект их не привозит, а без них не поднимется ни он,
 * ни откат к шаблону. Файл принадлежит МАШИНЕ, а не проекту в репозитории.
 */
export function replaceSlotContents(
  repoUrl: string,
  root: string,
  opts: { token?: string; keep?: readonly string[]; detach?: boolean } = {},
): SwapResult {
  const token = opts.token ?? "";
  const keep = opts.keep ?? DEFAULT_KEEP;
  // 🔒 ОТВЯЗКА ВКЛЮЧЕНА ПО УМОЛЧАНИЮ, А НЕ ПО ПРОСЬБЕ ВЫЗЫВАЮЩЕГО. Оставить в
  // слоте чужой `.git` — дефект в любом из случаев: и для донора, и для
  // возврата стартового шаблона. Выключатель существует ровно затем, чтобы
  // отвязку можно было прогнать отдельно от замены.
  const detach = opts.detach ?? true;

  if (!repoUrl.trim()) return { ok: false, reason: "repo_not_set", touched: false };
  if (!fs.existsSync(root)) return { ok: false, reason: "slot_missing", touched: false };

  // 1. Донор отвечает? Пока нет — не трогаем ничего.
  try {
    git(["ls-remote", authUrl(repoUrl, token), "HEAD"]);
  } catch (e) {
    const raw = scrub(e instanceof Error ? e.message : String(e), token);
    if (/not found|does not exist/i.test(raw)) return { ok: false, reason: "repo_not_found", touched: false };
    if (/Authentication failed|could not read Username/i.test(raw)) {
      return { ok: false, reason: "auth_failed", touched: false };
    }
    return { ok: false, reason: "network", touched: false };
  }

  // 2. Клонируем РЯДОМ. Соседняя папка, а не подпапка: подпапку пришлось бы
  //    исключать из сноса, и однажды её бы не исключили.
  const staging = path.join(path.dirname(root), `.slot-staging-${Date.now()}`);
  fs.rmSync(staging, { recursive: true, force: true });
  try {
    git(["clone", "--depth", "1", authUrl(repoUrl, token), staging]);
  } catch (e) {
    fs.rmSync(staging, { recursive: true, force: true });
    return { ok: false, reason: scrub(e instanceof Error ? e.message : String(e), token).slice(0, 300), touched: false };
  }

  // 3. Клон на руках — только теперь меняем. Точка невозврата ровно здесь.
  const head = (() => {
    try { return git(["rev-parse", "--short", "HEAD"], staging).trim(); } catch { return "unknown"; }
  })();

  try {
    wipeContents(root, keep);
    for (const name of fs.readdirSync(staging)) {
      fs.renameSync(path.join(staging, name), path.join(root, name));
    }
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }

  // 4. Слот наполнен — и прямо сейчас он несёт `.git` донора. Отвязываем ДО
  //    того, как к нему успеет обратиться сборка или отправка. Неудача отвязки
  //    замену не отменяет: файлы на месте, проект соберётся, — поэтому она едет
  //    отдельным полем ответа, а не превращает удачную замену в отказ.
  const detached = detach ? detachSlotHistory(root).ok : false;

  // ✗ 🔒 БЕЗ ОТВЯЗКИ REMOTE ХРАНИТ ТОКЕН ОТКРЫТЫМ ТЕКСТОМ, И ЭТО НАДО СТЕРЕТЬ
  // (75-3). Клон идёт по адресу со встроенным ключом (`authUrl`), и git
  // запоминает ИМЕННО ЕГО в `.git/config`. Пока отвязка сносила `.git` целиком,
  // последствий не было. С моделью форка remote обязан уцелеть — значит уцелел бы
  // и токен: в файле, который читают панель, агент на машине человека и всякий,
  // кто получит доступ к серверу. Он пережил бы и смену пароля, и отзыв доступа.
  //
  // 🔒 ПЕРЕПИСЫВАЕМ НА ЧИСТЫЙ АДРЕС, А НЕ УДАЛЯЕМ REMOTE. Связь с репозиторием
  // человека — это то, ради чего отвязка и выключена; ключ подставляется заново
  // на каждую операцию, которой он нужен.
  if (!detach && token) {
    try { gitIn(root, ["remote", "set-url", "origin", repoUrl]); } catch { /* remote нет — нечего чистить */ }
  }

  // 🔒 ИСКЛЮЧЕНИЯ ПИШУТСЯ ВСЕГДА, А НЕ ТОЛЬКО ПРИ ОТВЯЗКЕ. Машинные артефакты
  // этого сервера обязаны быть невидимы для проекта человека независимо от того,
  // рвём мы историю или храним. ✗ оплачено сборкой, упавшей на собственном CSS.
  if (!detach) writeLocalExcludes(root);

  return { ok: true, repoUrl, head, detached };
}

/**
 * Записать локальные исключения в `.git/info/exclude`.
 *
 * ✗ 🔒 ЭТО ЖИЛО ВНУТРИ ОТВЯЗКИ И ПОТОМУ ИСЧЕЗЛО ВМЕСТЕ С НЕЙ (75-3). Цепочка из
 * трёх моих правок, каждая верная по отдельности:
 *   35-2 — исключения написаны ВНУТРИ `detachSlotHistory()`;
 *   35-9 — `.next.last-good` начинает переживать замену;
 *   75-3 — отвязка выключается для форка → исключения больше не пишутся.
 * Итог: папка со СКОМПИЛИРОВАННЫМ CSS оказалась внутри проекта и не скрыта, а
 * Tailwind ищет исходники по всему проекту, уважая правила игнорирования.
 * Сборка падала на `CssSyntaxError: Missed semicolon` в собственном же выводе.
 * ✓ Измерено: убрать папку из проекта — сборка `RC=0`; вернуть — падает снова.
 *
 * 🔒 ИСКЛЮЧЕНИЯ ГОВОРЯТ О МАШИНЕ, А НЕ ОБ ИСТОРИИ, И ПОТОМУ ЖИВУТ ОТДЕЛЬНО.
 * `.gitkeep` — способ ai-workspace хранить пустой слот; `.next.last-good` — копия
 * последней рабочей сборки ЭТОГО сервера. Ни то, ни другое не зависит от того,
 * рвём мы историю или нет, — значит и вызов не имеет права от этого зависеть.
 *
 * 🔒 ПИШЕТСЯ В `.git/info/exclude`, А НЕ В `.gitignore`: последний принадлежит
 * репозиторию человека и уедет в его форк.
 */
function writeLocalExcludes(root: string): void {
  const excludeFile = path.join(root, ".git", "info", "exclude");
  if (!fs.existsSync(path.dirname(excludeFile))) return;
  const current = fs.existsSync(excludeFile) ? fs.readFileSync(excludeFile, "utf8") : "";
  // 🔒 Перевод строки берётся кодовой точкой, а не литералом: этот файл правится
  // скриптами, и экранирование обратного слэша в них уже дважды съедалось молча.
  const NL = String.fromCharCode(10);
  const already = current.split(NL).map((l) => l.trim());
  const missing = LOCAL_EXCLUDES.filter((w) => !already.includes(w));
  if (!missing.length) return;
  const lead = !current || current.endsWith(NL) ? "" : NL;
  fs.appendFileSync(excludeFile, lead + missing.join(NL) + NL, "utf8");
}

/**
 * Отвязать содержимое `root` от репозитория, из которого оно приехало: снести
 * чужой `.git` и завести свой — один корневой коммит с нынешним деревом.
 *
 * 🔒 ЗАЧЕМ ЭТО ВООБЩЕ НУЖНО — ДВЕ ПРИЧИНЫ, И ВТОРАЯ ЖЁСТЧЕ ПЕРВОЙ.
 * 1. `replaceSlotContents()` переносит в слот ВЕСЬ клон донора, включая `.git`.
 *    Слот после подключения несёт remote чужого проекта: первая же отправка
 *    ушла бы в чужой репозиторий или упала бы по правам.
 * 2. Клон мелкий (`--depth 1`), а мелкий репозиторий ОТПРАВИТЬ НЕЛЬЗЯ: git шлёт
 *    тонкий пакет от усечённого родителя, и удалённый отвечает «did not receive
 *    expected object … index-pack failed». Чужая история здесь мертвее груза.
 *
 * 🔒 ПРИЁМ НЕ ИЗОБРЕТЁН, А ПЕРЕНЕСЁН ИЗ `lib/bootstrap.sh` (L1, строки 383-397),
 * где ровно это делается со слотом, клонированным из стартера: «detached from
 * starter history». Второй способ делать одно и то же разошёлся бы с первым.
 * Родственный, но ДРУГОЙ случай — `api/config/git-push`: там репозиторий уже
 * подключён, remote обязан уцелеть, и лечение идёт через `checkout --orphan`.
 * Здесь remote уцелеть не должен, поэтому чистый лист.
 *
 * 🔒 ЛИЧНОСТЬ КОММИТЕРА ИДЁТ ФЛАГАМИ. У процесса панели нет ни `user.email`, ни
 * `user.name`, и коммит без них падает — сервер молча остался бы с деревом без
 * единого коммита.
 *
 * 🔒 ПОСЛЕ ОТВЯЗКИ СЛОТ ВЫГЛЯДИТ КАК СВЕЖИЙ СЕРВЕР: свой репозиторий, один
 * коммит, ноль remote. `api/config/project-state` такое состояние уже читает и
 * отвечает `connected: false` — «папка с репозиторием ещё не связь».
 */
export function detachSlotHistory(root: string, opts: { message?: string } = {}): DetachResult {
  if (!fs.existsSync(root)) return { ok: false, reason: "slot_missing" };

  try {
    // `.gitignore` донора уважаем: он принадлежит его проекту. Свой пишем только
    // если своего у проекта нет вовсе — иначе первый же коммит унесёт в историю
    // `node_modules` и сборку.
    const gitignore = path.join(root, ".gitignore");
    if (!fs.existsSync(gitignore)) {
      fs.writeFileSync(gitignore, GITIGNORE_BASELINE.join("\n") + "\n", "utf8");
    }

    fs.rmSync(path.join(root, ".git"), { recursive: true, force: true });
    gitIn(root, ["init", "-q"]);
    // `symbolic-ref`, а не `branch -M`: ветку переименовывать не в чем, пока нет
    // ни одного коммита. Тот же порядок, что в `bootstrap.sh`.
    gitIn(root, ["symbolic-ref", "HEAD", "refs/heads/main"]);

    // Две машинные вещи, которые не принадлежат проекту человека и потому не
    // едут в его `.gitignore`: `.gitkeep` — способ ai-workspace хранить пустой
    // слот в СВОЕЙ истории; `.next.last-good` — копия последней хорошей сборки
    // ЭТОГО сервера. Перечень взят у `api/config/git-push`, а не сочинён.
    writeLocalExcludes(root);

    gitIn(root, ["add", "-A"]);
    gitIn(root, [
      "-c", "user.email=admin@fractera.ai",
      "-c", "user.name=Fractera Admin",
      "commit", "-q", "-m", opts.message ?? "Fractera slot: project baseline",
    ]);
  } catch (e) {
    // Файлы проекта на месте — упала только история. Говорим об этом прямо:
    // «отвязка не удалась» и «проекта нет» — разные беды, и лечатся по-разному.
    return { ok: false, reason: (e instanceof Error ? e.message : String(e)).slice(0, 300) };
  }

  const head = (() => {
    try { return gitIn(root, ["rev-parse", "--short", "HEAD"]).trim(); } catch { return "unknown"; }
  })();

  return { ok: true, head };
}

/** Вернуть в слот стартовый шаблон Fractera. Тот же путь, другой адрес. */
export function restoreStarter(root: string, opts: { token?: string } = {}): SwapResult {
  return replaceSlotContents(starterRepoUrl(), root, opts);
}
