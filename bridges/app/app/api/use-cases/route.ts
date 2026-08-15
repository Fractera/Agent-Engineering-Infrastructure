import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import {
  listCases, useCasesGate, appendCases, writeCase, setStatus, confirmAll, deleteCase,
  migrateLegacy, appendRaw, writeSeed, readSeed, appendTurns, readTurns,
  readQuestions, writeQuestions, resetUseCases, resetPreview, writePagesPlan,
} from "@/lib/use-cases-store";
import { describeProduct } from "@/lib/quiz-brain";
import { isProjectTypeId } from "@/lib/project-types";
import {
  addProduct, updateProduct, currentProduct, adoptLegacyProjectType, defaultSurface,
} from "@/lib/products-config";

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
  const state = listCases();
  return NextResponse.json({
    ...state, gate: useCasesGate(), seed: readSeed(), turns: readTurns(),
    questions: readQuestions(), product: currentProduct(),
    // Что исчезнет при «начать сначала» — окно подтверждения обязано называть
    // числа, а не «всё»: «удалить всё» без счёта либо не нажимают, либо
    // нажимают вслепую.
    resetPreview: resetPreview(),
  });
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
    // `slug` — машинное имя файла кейса, всегда английское (см. `slugify`).
    cases?: { title: string; summary: string; slug?: string }[];
    turns?: { role: "user" | "assistant"; content: string }[];
    note?: string;
  } | null;
  if (!body?.op) return NextResponse.json({ error: "op_required" }, { status: 400 });

  switch (body.op) {
    // Ответы на вводные вопросы. Ложатся и затравкой, и в стенограмму: сырьё
    // пишется ВСЕГДА, иначе первые семь ответов — единственное, что исчезает.
    case "seed": {
      if (!body.seed?.trim()) return NextResponse.json({ error: "seed_required" }, { status: 400 });
      writeSeed(body.seed);
      if (body.turns?.length) {
        appendRaw(body.turns, body.note ?? "вводные вопросы");
        appendTurns(body.turns);
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
      const existing = currentProduct();
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
    // Вводные вопросы, утверждённые владельцем. Ложатся файлом в папку проекта:
    // вопрос — половина ответа, и агент должен видеть, о чём спрашивали.
    case "questions": {
      const list = (body.questions ?? []).map((q) => String(q).trim()).filter(Boolean);
      if (!list.length) return NextResponse.json({ error: "questions_required" }, { status: 400 });
      writeQuestions(list);
      return NextResponse.json({ ok: true, questions: list });
    }
    // Начать сначала: вопросы, затравка, лента, стенограмма и кейсы уезжают в
    // архив папки проекта. Кода приложения это не касается вообще.
    case "reset": {
      const stat = resetUseCases();
      return NextResponse.json({ ok: true, ...stat, gate: useCasesGate() });
    }
    case "append": {
      if (!body.cases?.length) return NextResponse.json({ error: "cases_required" }, { status: 400 });
      const ids = appendCases(body.cases);

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
      const product = currentProduct();
      if (product?.titleAuto) {
        try {
          const described = await describeProduct(readSeed(), body.cases);
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
          if (described && named) {
            updateProduct(product.id, { title: described.title, titleAuto: false });
          }
          if (described?.pages.length) {
            writePagesPlan(described.pages, named ? described.title : product.title);
          }
        } catch { /* модель не ответила — имя подождёт, кейсы важнее */ }
      }

      return NextResponse.json({ ok: true, ids, gate: useCasesGate(), product: currentProduct() });
    }
    case "edit": {
      if (!body.id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const ok = writeCase(body.id, { title: body.title, summary: body.summary });
      return NextResponse.json({ ok, gate: useCasesGate() });
    }
    case "confirm": {
      if (!body.id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const ok = setStatus(body.id, "confirmed");
      return NextResponse.json({ ok, gate: useCasesGate() });
    }
    case "unconfirm": {
      if (!body.id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const ok = setStatus(body.id, "draft");
      return NextResponse.json({ ok, gate: useCasesGate() });
    }
    case "confirmAll": {
      const n = confirmAll();
      return NextResponse.json({ ok: true, confirmed: n, gate: useCasesGate() });
    }
    case "delete": {
      if (!body.id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const ok = deleteCase(body.id);
      return NextResponse.json({ ok, gate: useCasesGate() });
    }
    case "migrate": {
      const r = migrateLegacy();
      return NextResponse.json({ ...r, gate: useCasesGate() });
    }
    // Стенограмма из клиента: ручной диалог держится на клиенте (сервер сессию
    // не хранит), поэтому сохранить его может только он.
    // Разговор дописывается ПОСЛЕ КАЖДОЙ реплики, а не в конце: владелец вправе
    // закрыть окно на середине, и накопленное обязано пережить это.
    case "raw": {
      if (body.turns?.length) {
        appendRaw(body.turns, body.note);
        appendTurns(body.turns);
      }
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "unknown_op" }, { status: 400 });
  }
}
