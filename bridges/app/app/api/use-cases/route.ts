import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import {
  listCases, useCasesGate, appendCases, writeCase, setStatus, confirmAll, deleteCase,
  migrateLegacy, appendRaw, writeSeed, readSeed, appendTurns, readTurns,
  readQuestions, writeQuestions, resetUseCases, resetPreview, writePagesPlan, deleteProductDocs,
} from "@/lib/use-cases-store";
import { describeProduct } from "@/lib/quiz-brain";
import { isProjectTypeId } from "@/lib/project-types";
import { slotLanguages } from "@/lib/slot-languages";
import {
  addProduct, updateProduct, adoptLegacyProjectType, defaultSurface,
  activeProduct, listProducts, findProduct, giveRootTo, removeProduct,
  DEV_STATUSES, isDevStatus, normalizeSteps, stepsOf, devStatusOf,
} from "@/lib/products-config";
import { ensureDecompositionStep } from "@/lib/dev-steps";

// Кейсы: чтение папки и действия над ней.
//
// Одна дверь на все операции с самими кейсами — они мелкие и всегда об одном и
// том же файле. Разговор с моделью живёт отдельно (`./quiz`), потому что он
// длинный, стримится и может стоить денег.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // 🔒 ПРОДУКТ НАЗЫВАЕТСЯ ЯВНО (партия 5). `?product=p2` решает, чьи кейсы
  // читаются; неизвестный идентификатор уступает первому продукту, а не отдаёт
  // пустой экран. Без продукта в реестре читать нечего — это честное «пусто».
  const product = activeProduct(req.nextUrl.searchParams.get("product"));
  if (!product) {
    return NextResponse.json({
      dir: "", exists: false, cases: [], legacy: false,
      gate: { kind: "missing", total: 0, confirmed: 0 },
      seed: "", turns: [], questions: null, product: null, products: [],
      resetPreview: { seedAnswers: 0, turns: 0, cases: 0, confirmed: 0 },
    });
  }
  const pid = product.id;
  const state = listCases(pid);
  return NextResponse.json({
    ...state, gate: useCasesGate(pid), seed: readSeed(pid), turns: readTurns(pid),
    questions: readQuestions(pid), product, products: listProducts(),
    // Что исчезнет при «начать сначала» — окно подтверждения обязано называть
    // числа, а не «всё»: «удалить всё» без счёта либо не нажимают, либо
    // нажимают вслепую.
    resetPreview: resetPreview(pid),
  });
}

/**
 * Подтверждён кейс — работа началась (владелец 2026-08-17).
 *
 * 🔒 ОЧЕРЕДЬ РОЖДАЕТСЯ ЗДЕСЬ, В МОМЕНТ ПОДТВЕРЖДЕНИЯ, А НЕ КОГДА-НИБУДЬ ПОТОМ.
 * Именно подтверждение превращает описание в заказ; если бы шаг заводил только
 * агент, очередь не существовала бы, пока кто-то его не запустит, — и владелец,
 * закончив самую трудную часть своей работы, открывал бы раздел шагов и видел
 * пустоту. Агент делает то же самое на входе в сессию, и это не дублирование, а
 * два независимых пути к одному состоянию, оба идемпотентные.
 *
 * 🔒 ТОЛЬКО ВПЕРЁД И ТОЛЬКО ИЗ «НЕ НАЧАТ». Продукт, дошедший до приёмки,
 * подтверждает по ходу дела и новые кейсы; откатывать его в «декомпозицию» при
 * каждом таком подтверждении значило бы стирать пройденный путь нажатием, смысл
 * которого совсем в другом.
 *
 * Ничего не делает, пока не подтверждён ни один кейс: разбирать нечего.
 */
function openDevelopment(pid: string): { development?: { step: number; created: boolean } } {
  const confirmed = listCases(pid).cases.filter((c) => c.status === "confirmed").map((c) => c.id);
  if (!confirmed.length) return {};

  const step = ensureDecompositionStep(pid, confirmed);
  if (!step) return {};

  // 🔒 НОМЕР ШАГА ДОПИСЫВАЕТСЯ В ОГЛАВЛЕНИЕ ПРОДУКТА — ЗДЕСЬ ТОЖЕ, А НЕ ТОЛЬКО В
  // MCP (найдено сквозным прогоном 2026-08-17).
  //
  // MCP делает это своим `indexStep()`, панель не делала: шаг рождался, а поле
  // `steps` в `PRODUCTS-CONFIG` оставалось пустым. Оглавление, которое заполняет
  // ОДИН из двух писателей, хуже отсутствующего: агент спрашивает «какие шаги у
  // этого продукта», получает пустоту и заключает, что работы не было.
  //
  // Дефект того же класса, что и всё в этом шаге: два независимых пути к одному
  // состоянию обязаны приводить к ОДИНАКОВОЙ записи, иначе состояние зависит от
  // того, кто успел первым.
  const product = findProduct(pid);
  if (product) {
    const patch: Parameters<typeof updateProduct>[1] = {
      steps: [...stepsOf(product), step.number],
    };
    // Этап двигается только из «не начат»: продукт, дошедший до приёмки,
    // подтверждает по ходу дела и новые кейсы, и откат стирал бы пройденный путь.
    if (devStatusOf(product) === "not-started") patch.devStatus = "decomposition";
    updateProduct(pid, patch);
  }
  return { development: { step: step.number, created: step.created } };
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    op?: string;
    id?: string;
    title?: string;
    summary?: string;
    seed?: string;
    questions?: string[];
    typeId?: string;
    typeTitle?: string;
    /**
     * С каким продуктом работает этот вызов.
     *
     * 🔒 НАЗЫВАЕТСЯ ЯВНО, А НЕ ВЫВОДИТСЯ. Пока продукт был один, «первый в
     * реестре» работал; со вторым то же умолчание молча правит чужие кейсы, и
     * заметит это владелец не сегодня, а когда сломается соседний продукт.
     */
    productId?: string;
    /** Завести НОВЫЙ продукт, а не менять структуру существующего. */
    newProduct?: boolean;
    // `slug` — машинное имя файла кейса, всегда английское (см. `slugify`).
    cases?: { title: string; summary: string; slug?: string }[];
    turns?: { role: "user" | "assistant"; content: string }[];
    note?: string;
    /**
     * Описание продукта на языке владельца (2026-08-16).
     * Пустая строка — законное «убрать описание»; отсутствие поля — «не трогать».
     */
    description?: string;
    /** Состояние разработки продукта — одно из восьми (`DEV_STATUSES`). */
    devStatus?: string;
    /**
     * Номера шагов разработки этого продукта.
     *
     * Три разных намерения различаются полем, а не догадкой: `steps` заменяет
     * список целиком, `addSteps` дописывает, `dropSteps` убирает. Одно поле на
     * все три случая означало бы, что «добавить шаг 12» иногда стирает
     * одиннадцать предыдущих.
     */
    steps?: number[];
    addSteps?: number[];
    dropSteps?: number[];
  } | null;
  if (!body?.op) return NextResponse.json({ error: "op_required" }, { status: 400 });

  // Продукт этого вызова. Операции, создающие продукт, обходятся без него —
  // им его ещё нет; всем остальным он обязателен.
  const product = activeProduct(body.productId);
  const pid = product?.id ?? "";
  const NEEDS_PRODUCT = ["seed", "questions", "reset", "append", "edit", "confirm", "unconfirm", "confirm-all", "delete", "migrate", "dev-progress"];
  if (NEEDS_PRODUCT.includes(body.op) && !pid) {
    return NextResponse.json({ error: "no_product" }, { status: 400 });
  }

  switch (body.op) {
    // Ответы на вводные вопросы. Ложатся и затравкой, и в стенограмму: сырьё
    // пишется ВСЕГДА, иначе первые семь ответов — единственное, что исчезает.
    case "seed": {
      if (!body.seed?.trim()) return NextResponse.json({ error: "seed_required" }, { status: 400 });
      writeSeed(pid, body.seed);
      if (body.turns?.length) {
        appendRaw(pid, body.turns, body.note ?? "вводные вопросы");
        appendTurns(pid, body.turns);
      }
      return NextResponse.json({ ok: true });
    }
    // Выбранная структура проекта. Название приходит с клиента, потому что оно
    // на языке владельца, а словарь панели серверный и в браузер не уезжает;
    // идентификатор при этом проверяется по каталогу — принимать на веру машинную
    // строку значило бы записать в файл проекта «структуру», которой нет.
    case "project-type": {
      if (!isProjectTypeId(body.typeId)) {
        return NextResponse.json({ error: "unknown_project_type" }, { status: 400 });
      }
      const title = body.typeTitle?.trim() || body.typeId;
      // 🔒 ВЫБОР СТРУКТУРЫ ТЕПЕРЬ РОЖДАЕТ ЗАПИСЬ ПРОДУКТА (владелец 2026-08-15).
      //
      // Вчера он ложился в `project-type.json` — один на весь сервер. Это верно
      // ровно до второго продукта: сервер несёт их много, и «структура проекта»
      // без продукта не имеет владельца.
      //
      // Название пока временное — название самой структуры. Своё имя продукту
      // даст модель в тот же миг, когда родятся первые кейсы (партия 3): назвать
      // его сейчас можно только словом, которое человек ещё не произносил.
      adoptLegacyProjectType();
      // 🔒 «ЗАВЕСТИ ВТОРОЙ» И «ПЕРЕДУМАТЬ ПРО ПЕРВЫЙ» — РАЗНЫЕ ДЕЙСТВИЯ, И
      // РАЗЛИЧАЕТ ИХ ФЛАГ, А НЕ ДОГАДКА. Без него второй продукт был бы неотличим
      // от смены структуры первого: тот же вызов, тот же ответ, а результат —
      // либо новый продукт, либо переписанный старый.
      const existing = body.newProduct ? null : activeProduct(body.productId);
      const saved = existing
        ? updateProduct(existing.id, {
            type: body.typeId,
            // Имя переписывается, только пока его ставила машина. Человеческое
            // имя не трогается никогда: владелец назвал продукт сам, и вернуть
            // ему вместо этого название структуры — отменить его работу.
            ...(existing.titleAuto === true ? { title, titleAuto: true } : {}),
            surface: defaultSurface(body.typeId),
          })
        : addProduct({ title, type: body.typeId, titleAuto: true });
      return NextResponse.json({ ok: true, product: saved });
    }
    // Владелец переименовывает продукт. С этого мгновения имя человеческое:
    // машина его больше не трогает никогда (`titleAuto` снимается).
    case "rename-product": {
      if (!pid) return NextResponse.json({ error: "no_product" }, { status: 400 });
      const title = body.title?.trim();
      if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });
      // 🔒 ОПИСАНИЕ ПРАВИТСЯ ЗДЕСЬ ЖЕ, И ЭТО НЕ «ЗАОДНО». Имя и описание — две
      // половины одной карточки, владелец правит их в одном окне; разведи их по
      // двум вызовам, и одна половина сохранится, а вторая нет — состояние,
      // которого форма не показывает.
      //
      // `description` приходит СТРОКОЙ, в том числе пустой: пустая означает
      // «убрать описание», и это законное действие. Отсутствие поля означает
      // «не трогать» — разница между `undefined` и `""` здесь содержательная.
      const patch: Parameters<typeof updateProduct>[1] = { title, titleAuto: false };
      if (typeof body.description === "string") patch.description = body.description;
      return NextResponse.json({ ok: true, product: updateProduct(pid, patch) });
    }
    // 🔒 УДАЛЕНИЕ ПРОДУКТА — ДВА ДЕЙСТВИЯ В СТРОГОМ ПОРЯДКЕ: сначала документы
    // переезжают в архив, потом исчезает запись. Обратный порядок оставил бы при
    // отказе переезда папку без владельца — её никто уже не найдёт в панели.
    //
    // Отказ переезда НЕ убивает запись: лучше продукт, который не удалился и об
    // этом сказал, чем запись, стёртая при неубранных документах.
    case "delete-product": {
      if (!pid) return NextResponse.json({ error: "no_product" }, { status: 400 });
      const victim = findProduct(pid);
      if (!victim) return NextResponse.json({ error: "not_found" }, { status: 404 });

      const docs = deleteProductDocs(pid);
      if (docs.cases > 0 && !docs.archive) {
        return NextResponse.json({ error: "archive_failed" }, { status: 500 });
      }
      const removed = removeProduct(pid);
      if (!removed.ok) return NextResponse.json({ error: "not_found" }, { status: 404 });

      return NextResponse.json({
        ok: true,
        // Куда уехали документы — говорится в ответе и показывается владельцу:
        // «удалено» без адреса архива читается как «стёрто безвозвратно».
        archive: docs.archive,
        cases: docs.cases,
        products: listProducts(),
      });
    }
    // Отдать корень другому продукту: адреса страниц прежнего владельца
    // изменятся, поэтому это отдельное осознанное действие.
    case "give-root": {
      if (!pid) return NextResponse.json({ error: "no_product" }, { status: 400 });
      const result = giveRootTo(pid);
      if (!result.ok) return NextResponse.json({ error: "not_public" }, { status: 400 });
      // Прежний владелец корня называется в ответе: панель обязана сказать
      // владельцу, чьи адреса только что изменились, — это не побочный эффект,
      // о котором узнают потом.
      return NextResponse.json({
        ok: true, movedFrom: result.movedFrom, movedTo: result.movedTo, products: listProducts(),
      });
    }
    // 🔒 СОСТОЯНИЕ РАЗРАБОТКИ И ЕГО ШАГИ — ОДНА ДВЕРЬ (владелец 2026-08-17).
    //
    // Они меняются вместе: разложил кейсы на шаги — записал их номера И перевёл
    // продукт в «декомпозицию»; принял работу — закрыл шаги И поставил
    // «завершён». Две двери означали бы, что одна половина записалась, а вторая
    // нет, и никакой экран этого не показывает.
    //
    // Дверь нужна не панели, а АГЕНТУ: он работает в локальном клоне владельца и
    // панель физически не видит (`bridges/app` лежит вне репозитория
    // пользователя). Без неё «отслеживать статус разработки» означало бы
    // отмечать его руками — то есть не отслеживать.
    case "dev-progress": {
      if (!pid) return NextResponse.json({ error: "no_product" }, { status: 400 });
      const before = findProduct(pid);
      if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

      const patch: Parameters<typeof updateProduct>[1] = {};

      if (body.devStatus !== undefined) {
        // Неизвестное состояние — отказ, а не тихое приведение к ближайшему:
        // приняв опечатку, мы записали бы в конфиг положение, о котором ни
        // панель, ни агент не знают, и узнал бы об этом владелец по пустому
        // ярлыку в карточке.
        if (!isDevStatus(body.devStatus)) {
          return NextResponse.json(
            { error: "unknown_dev_status", allowed: DEV_STATUSES }, { status: 400 },
          );
        }
        patch.devStatus = body.devStatus;
      }

      // Замена списка целиком — только по явному `steps`. Дописывание и удаление
      // считаются от того, что уже записано.
      if (body.steps !== undefined) {
        patch.steps = normalizeSteps(body.steps);
      } else if (body.addSteps || body.dropSteps) {
        const drop = new Set(normalizeSteps(body.dropSteps ?? []));
        patch.steps = normalizeSteps([
          ...stepsOf(before), ...normalizeSteps(body.addSteps ?? []),
        ]).filter((n) => !drop.has(n));
      }

      if (!Object.keys(patch).length) {
        return NextResponse.json({ error: "nothing_to_change" }, { status: 400 });
      }
      return NextResponse.json({ ok: true, product: updateProduct(pid, patch) });
    }
    // Вводные вопросы, утверждённые владельцем. Ложатся файлом в папку продукта:
    // вопрос — половина ответа, и агент должен видеть, о чём спрашивали.
    case "questions": {
      const list = (body.questions ?? []).map((q) => String(q).trim()).filter(Boolean);
      if (!list.length) return NextResponse.json({ error: "questions_required" }, { status: 400 });
      writeQuestions(pid, list);
      return NextResponse.json({ ok: true, questions: list });
    }
    // Начать сначала: вопросы, затравка, лента, стенограмма и кейсы уезжают в
    // архив папки проекта. Кода приложения это не касается вообще.
    case "reset": {
      const stat = resetUseCases(pid);
      return NextResponse.json({ ok: true, ...stat, gate: useCasesGate(pid) });
    }
    case "append": {
      if (!body.cases?.length) return NextResponse.json({ error: "cases_required" }, { status: 400 });
      const ids = appendCases(pid, body.cases);

      // 🔒 ПРОДУКТ ПОЛУЧАЕТ ИМЯ РОВНО ЗДЕСЬ (владелец 2026-08-15).
      //
      // Не при выборе структуры — там он ещё безымянный, и звать его можно только
      // названием структуры («Посадочная страница»), которое человек не
      // произносил. И не отдельной кнопкой: спрашивать «как назвать?» у того, кто
      // только что описал продукт семью ответами, — требовать работу, ответ на
      // которую уже прозвучал.
      //
      // Момент выбран самый поздний из возможных: кейсы уже на диске, значит имя
      // рождается из того, что владелец подтвердил делом.
      //
      // 🔒 ЛУЧШЕЕ УСИЛИЕ, НЕ УСЛОВИЕ. Отказ модели — не повод потерять кейсы:
      // они уже записаны, а продукт останется с прежним именем и получит своё
      // при следующем разборе. Обратный порядок стоил бы владельцу работы.
      if (product?.titleAuto) {
        try {
          // Язык владельца берётся у СЛОТА, а не у панели: описание ложится в
          // конфиг проекта и читается всеми, кто откроет панель, — на каком бы
          // языке её ни открыл тот, кто нажал кнопку сейчас.
          const described = await describeProduct(readSeed(pid), body.cases, slotLanguages().base);
          // 🔒 КАТЕГОРИЯ — НЕ ИМЯ (найдено проверкой живьём 2026-08-15).
          //
          // Первый же настоящий вызов вернул «Интернет-магазин» — то самое слово,
          // которым продукт звался и до модели. Промпт это запрещал, но запрет в
          // промпте не обязателен к исполнению, а сравнение здесь — обязательно.
          //
          // Имя, равное названию структуры, отвергается целиком: продукт остаётся
          // помеченным `titleAuto`, и следующий разбор попробует снова. Принять
          // такое имя значило бы снять пометку и запереть «Интернет-магазин»
          // навсегда — хуже, чем остаться пока безымянным.
          //
          // План страниц при этом СОХРАНЯЕМ: он оказался точным и в том же
          // ответе. Отказ в одном поле не повод выбрасывать другое.
          const named = described?.title
            && described.title.trim().toLowerCase() !== product.title.trim().toLowerCase();

          // 🔒 ОПИСАНИЕ ПИШЕТСЯ, ДАЖЕ ЕСЛИ ИМЯ ОТВЕРГНУТО, и это не небрежность.
          // Отказ по имени означает «модель вернула категорию вместо названия» —
          // про описание это не говорит ничего. Связать их значило бы лишить
          // описания как раз те продукты, что остались безымянными, то есть те,
          // которым карточка нужнее всего.
          //
          // 🔒 ТОЛЬКО В ПУСТОЕ МЕСТО. Уже написанное описание не переписывается
          // никогда — ни своё прежнее, ни тем более правку владельца. Отдельного
          // флага (как `titleAuto` у имени) здесь не нужно: «поле пусто» и есть
          // достаточное условие, а лишний флаг — ещё одно состояние, которое
          // однажды разойдётся с действительностью.
          //
          // Плата названа честно: описание, которое владелец стёр намеренно,
          // вернётся при следующем разборе. Это дешевле обратного — молча
          // затереть текст, который человек писал руками.
          const patch: Parameters<typeof updateProduct>[1] = {};
          if (named && described) { patch.title = described.title; patch.titleAuto = false; }
          if (described?.description && !product.description) {
            patch.description = described.description;
          }
          if (Object.keys(patch).length) updateProduct(product.id, patch);
          if (described?.pages.length) {
            writePagesPlan(pid, described.pages, named ? described.title : product.title);
          }
        } catch { /* модель не ответила — имя подождёт, кейсы важнее */ }
      }

      return NextResponse.json({ ok: true, ids, gate: useCasesGate(pid), product: findProduct(pid) });
    }
    case "edit": {
      if (!body.id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const ok = writeCase(pid, body.id, { title: body.title, summary: body.summary });
      return NextResponse.json({ ok, gate: useCasesGate(pid) });
    }
    case "confirm": {
      if (!body.id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const ok = setStatus(pid, body.id, "confirmed");
      return NextResponse.json({ ok, gate: useCasesGate(pid), ...openDevelopment(pid) });
    }
    case "unconfirm": {
      if (!body.id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const ok = setStatus(pid, body.id, "draft");
      return NextResponse.json({ ok, gate: useCasesGate(pid) });
    }
    case "confirmAll": {
      const n = confirmAll(pid);
      return NextResponse.json({ ok: true, confirmed: n, gate: useCasesGate(pid), ...openDevelopment(pid) });
    }
    case "delete": {
      if (!body.id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const ok = deleteCase(pid, body.id);
      return NextResponse.json({ ok, gate: useCasesGate(pid) });
    }
    case "migrate": {
      const r = migrateLegacy(pid);
      return NextResponse.json({ ...r, gate: useCasesGate(pid) });
    }
    // Стенограмма из клиента: ручной диалог держится на клиенте (сервер сессию
    // не хранит), поэтому сохранить его может только он.
    // Разговор дописывается ПОСЛЕ КАЖДОЙ реплики, а не в конце: владелец вправе
    // закрыть окно на середине, и накопленное обязано пережить это.
    case "raw": {
      if (body.turns?.length) {
        appendRaw(pid, body.turns, body.note);
        appendTurns(pid, body.turns);
      }
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "unknown_op" }, { status: 400 });
  }
}
