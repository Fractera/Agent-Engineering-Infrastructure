import { z } from "zod";

// СХЕМА ЯДРА — форма файла `automation.json`, описанная ровно один раз.
// Лежит рядом с файлом, который проверяет: схема и данные всегда правятся вместе.
// Типы отсюда не пишутся руками — они выводятся схемой.

const TEXT_LIMIT = 200;

// ─── SYSTEM INSTRUCTIONS — the law texts, one file each ─────────────────────────────────────────────
// Each kind of entity has a SYSTEM INSTRUCTION: the short, authoritative text saying what is expected of
// THAT entity. It is what replaces a long document no weak model finishes reading.
//
// WHERE THE TEXT LIVES: `_instructions/<name>.md` — one file per name, and nowhere else. The object in
// the core carries the NAME of its instruction (`systemInstructionName`), never a copy of the text: the
// link is visible right in the object, and costs ONE WORD instead of ~1 800 bytes. Nineteen copies of the
// text would have doubled the core file (~11 700 tokens on every full read); nineteen names cost ~400.
//
// The schema therefore knows only the LIST of lawful names and demands the right one of every object — a
// node carries `nodes`, a tab `tab`, the input group `group.input`. The name cannot be swapped: it is law,
// merely a cheap one. The owner edits the law as plain markdown, with no rebuild and no code change.
export const SYSTEM_INSTRUCTION_NAMES = [
  "passport", // the STARTING instruction: how to work here at all (doors, order of iterations)
  "fracteraPro",
  "graph",
  "nodes", // for ALL nodes, whatever their kind
  "group.input",
  "group.intent", // ЧЕТВЁРТЫЙ СЛОЙ (шаг 311): фронт запроса между входом и серединой
  "group.middle",
  "group.output",
  "kind.input",
  "kind.input-connector",
  // ЗАКОН КАЖДОГО КАНАЛА — по одной инструкции на элемент словаря (шаг 311.4), как у классов фронта.
  "input.control-panel",
  "input.webhook",
  "input.cron",
  "input.public-page",
  "input.telegram-bot",
  "input.user-telegram-chat",
  "input.email",
  "input.custom", // закон МАСШТАБИРОВАНИЯ входа: когда заводится новый канал
  "kind.intent",
  // ЗАКОН КАЖДОГО КЛАССА ЗАПРОСА — по одной инструкции на класс (шаг 311). Имя не выбирается, а выводится
  // из класса: `intent.<class>`, как `kind.<kind>` выводится из вида. Список обязан совпадать со словарём
  // `IntentClassSchema` — расхождение ловится проверкой INTENT_INSTRUCTIONS_COMPLETE ниже.
  "intent.refuse",
  "intent.continuation",
  "intent.self-describe",
  "intent.control",
  "intent.composite",
  "intent.fetch-external",
  "intent.read-own",
  "intent.incomplete",
  "intent.small-talk",
  "intent.record-given",
  "intent.unclaimed",
  "intent.custom", // закон МАСШТАБИРОВАНИЯ: когда модель вправе завести новый класс
  // ПЯТЫЙ СЛОЙ (шаг 314) — закон группы, закон вида и закон каждой ОБЛАСТИ эволюции.
  "group.evolution",
  "kind.evolution",
  "evolution.capability-gap",
  "evolution.behavior",
  "evolution.examples",
  "evolution.voice",
  "evolution.graph",
  "evolution.custom",
  "kind.transform",
  // У СЕРЕДИНЫ НЕТ СЛОВАРЯ (она бесконечна), поэтому нет и значения `custom`. Её аналог открытой двери —
  // закон РОЖДЕНИЯ узла и связи с внешним корпусом паттернов (шаг 310): `middle.custom`.
  "middle.custom",
  "kind.condition-success",
  "kind.condition-failure",
  "kind.output",
  "kind.output-connector",
  "output.toast", // неотключаемый канал исхода (311.8)
  "output.public-page",
  "output.dashboard",
  "output.calendar",
  "output.analytics",
  "output.map",
  "output.email",
  "output.telegram-bot",
  "output.user-telegram-chat",
  "output.vector-memory",
  "output.database",
  "output.storage",
  "output.custom", // закон МАСШТАБИРОВАНИЯ выхода
  "components", // for ALL components
  "tab", // for every tab
  // A TAB WITH A LAW OF ITS OWN gets an ADDITIONAL instruction `tab.<name>`, and the general `tab` law
  // keeps governing it — the object's pinned name stays `tab`, so nothing in the core changes. The extra
  // one exists for tabs whose behaviour cannot be derived from the general law: the calendar is the
  // first (it raises due notices on the schedule's beat and may declare outward integrations).
  "tab.calendar",
  // Закон вкладки записей (шаг 324): минимальный набор полей, минимальный набор колонок и общий интерфейс
  // таблиц — минимальная ширина колонки, страница в 10 строк, ячейка не выше четырёх строк.
  "tab.database",
  // Закон вкладки объектов (шаг 323): что прогон вправе туда положить, правило превью (картинка →
  // миниатюра, иначе контейнер с подписью типа) и правило просмотра (тип → инструмент).
  "tab.storage",
  // Закон вкладки карты (шаг 319): источник объявлен в ядре, выдуманной точки не бывает, гео — только
  // через дверь `api/geo`, второй карты на холсте нет.
  "tab.map",
  // Закон вкладки дашборда (шаг 323): все таблицы данных живут здесь, и в ячейке может работать ЛЮБОЙ
  // рантайм-инструмент папки — объект любого типа рисует и открывает `media-viewer`.
  "tab.dashboard",
  // Закон вкладки векторной памяти (шаг 325): строка — КВИТАНЦИЯ (имя, саммари, trackId, связи), полный
  // текст живёт только внутри поискового индекса; индекс читается вопросом, а не по идентификатору.
  "tab.vector-memory",
  "useCases",
  "history",
  // ЧТО ОСТАВЛЯЕТ ПРОГОН (шаг 311.9а.5): склад сущностей против журнала прогона, саммари против полного
  // текста, единое представление связей. Закон не про объект ЯДРА, а про строки, которые ядро порождает,
  // — поэтому имя есть, а `systemInstructionName` с ним не носит никто.
  "records",
] as const;

export const SystemInstructionNameSchema = z.enum(SYSTEM_INSTRUCTION_NAMES);
export type SystemInstructionName = (typeof SYSTEM_INSTRUCTION_NAMES)[number];

/** The field an object carries: the NAME of its law, pinned to the one that governs this kind of object. */
const instructionName = (name: SystemInstructionName) =>
  z.string().refine((value) => value === name, {
    message: `this object is governed by the instruction "${name}" — the name is law, not a choice`,
  });

// IDENTITY — every entity that can be pointed at carries a CUID, and nothing else identifies it.
// A cuid-style id: a leading letter then lowercase alphanumerics — hyphen-free and never all-digits, so a
// model can echo it without the UUID pitfalls. Human-readable names live in `name`, never in the id: a name
// can be edited, an identity cannot.
export const CuidSchema = z.string().regex(/^c[a-z0-9]{8,}$/, "an id must be a cuid (a leading `c`, then lowercase alphanumerics)");

// PASSPORT — the automation's identity.
// The address is deliberately absent: it is given by where the folder sits, and keeping it here too
// would create a second source of truth.
export const AutomationTypeSchema = z.enum(["stream", "instanced", "chained"]);

// LIFECYCLE — what this automation currently IS:
//   frozen-template — the starting template, born but never made anyone's own;
//   real-project    — a real automation someone is building or running.
// One field rather than two flags (is_frozen_template / is_real_project): two flags can contradict
// each other, one cannot.
export const LifecycleSchema = z.enum(["frozen-template", "real-project"]);

// THE AI THIS AUTOMATION THINKS WITH — which provider and which model.
//
// It lives in the PASSPORT, not in the environment, because it is a property of THIS automation, the
// same way its type and its lifecycle are. The provider's KEY is a project-wide secret and lives in the
// environment like every other credential; the CHOICE of model does not — two automations sharing one
// key may legitimately think with different models.
//
// The model id is a free string on purpose: the catalogue of available models lives in code
// (`_components/ai.ts`) and changes with the world, while the core only records what was chosen. A
// closed enum here would mean a schema edit — and a failed validation of every existing automation —
// every time a provider ships a model.
export const AiProviderSchema = z.enum(["anthropic", "openai"]);

export const AiSchema = z
  .object({
    provider: AiProviderSchema,
    model: z.string().min(1, "a model id is required — the catalogue lives in _components/ai.ts"),
  })
  .strict();

// PARALLEL ROUTING PAGES — the places on the host page where a Fractera Pro automation can be placed.
export const ParallelPageSchema = z.enum([
  "promo",
  "center-header",
  "center",
  "center-footer",
  "faq",
  "left-drawer",
  "right-drawer",
]);

// ROLES — the vocabulary the admin can assign to a user (Admin :3002 -> settings -> users -> edit).
// Three groups: access tiers enforced by the auth substrate, customer-facing roles, staff roles.
//
// ⚠️ The OWNER of this vocabulary is the platform's role model, not this file. Law 0 forbids reaching
// outside the folder, so the list is copied in — a copy that must be re-checked when the platform's
// vocabulary changes. Flagged deliberately rather than hidden.
export const RoleSchema = z.enum([
  // access tiers (enforced)
  "guest",
  "user",
  "architect",
  // customer-facing
  "buyer",
  "vip_user",
  "subscriber_lite",
  "subscriber_standard",
  "subscriber_max",
  // staff / operations
  "manager",
  "senior_manager",
  "support_manager",
  "delivery_manager",
  "finance",
  "content_editor",
  // admin
  "admin",
]);

// FRACTERA PRO — either nothing (`null`, the plain mode) or the Pro mode.
// In Pro mode the owner picks WHERE the automation sits on the host page (parallel routing) and,
// optionally, WHICH roles may reach that page. An empty role list means the page is open to everyone;
// listing roles narrows it down.
export const FracteraProSchema = z
  .object({
    page: ParallelPageSchema.default("center"),
    roles: z.array(RoleSchema).default([]),
  })
  .strict();

// The passport carries `info` too: the owner leaves instructions not only for a single node or component
// but for the automation AS A WHOLE, and that text needs one obvious place to live.
// (InfoSchema is declared below — the passport object is assembled after it.)

// STATE — whether a node or an edge is shown on the diagram.
export const StateSchema = z.enum(["hidden", "visible"]);

// BUILD STATUS — still being built, or built and standing. One vocabulary for nodes and components
// alike: the same fact must never be spelled two different ways.
export const BuildStatusSchema = z.enum(["in-development", "materialized"]);

// INFO — the ONE text that describes a thing being built, in exactly one of two forms:
//   { crudUser }  — the owner's own words, as they arrived (the CRUD prompt);
//   { aiSummary } — the model's summary of what was actually built.
// A union, not two fields: two fields could hold both at once, and then it would be impossible to say
// which of them describes the thing. The build STATUS is a separate field — the two answer different
// questions ("what is this" vs "is it standing yet").
export const InfoSchema = z.union([
  z.object({ crudUser: z.string().min(1, "the owner's prompt cannot be empty") }).strict(),
  z.object({ aiSummary: z.string().min(1, "the summary cannot be empty") }).strict(),
]);

// SHARING — may this automation be published into the public space, or is it for its author alone?
// One field, two honest answers; nothing is public by accident.
export const SharingSchema = z.enum(["private", "public"]);

// UUID — the automation's STABLE GLOBAL identity: a canonical v4 uuid, assigned ONCE at birth and never
// changed. It is deliberately not the same as anything else that identifies a thing here:
//   - NOT the folder address (that changes if the folder is moved or renamed);
//   - NOT an internal `cuid` (those identify a PART — a node, an edge — never the automation as a whole).
// This is the identity by which the automation is ACCUMULATED across the fleet and, in a future step,
// uploaded to Fractera's own automation store (open or closed). Empty only while the automation is the
// untouched frozen template — a real project always carries one (checked in the core law). Optional with a
// default so cores written before this field existed stay valid.
export const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PassportSchema = z
  .object({
    systemInstructionName: instructionName("passport"),
    // the automation's stable global identity — see UUID_FORMAT above
    uuid: z.string().default(""),
    title: z.string().min(1, "the automation must have a title"),
    description: z.string(),
    type: AutomationTypeSchema,
    lifecycle: LifecycleSchema,
    // WHICH AI it thinks with — see AiSchema above. The menu shows it, Settings changes it.
    ai: AiSchema,
    // WHO made it: the id of the user who created this automation. Empty only while the automation is
    // still the untouched frozen template — a real project always has an author (checked in the core law).
    author: z.string(),
    sharing: SharingSchema,
    // Fractera Pro keeps its own instruction ALWAYS, even in the plain mode where there is no config to
    // speak of: an instruction that disappears with the feature could never explain how to turn it on.
    fracteraPro: z
      .object({
        systemInstructionName: instructionName("fracteraPro"),
        config: FracteraProSchema.nullable(),
      })
      .strict(),
    // the owner's instruction for the automation as a whole (or the model's summary of it)
    info: InfoSchema,
    // HOW IT WORKS — the answer to the owner's question "how does this automation work?", written by
    // the model from the WHOLE context and kept as a list of statements rather than one blob: a list
    // can be extended, re-stated line by line and embedded piece by piece. This text is what the
    // vector record is built from, and therefore what makes this automation FINDABLE among hundreds —
    // it is the automation's public account of itself, not a changelog and not a duplicate of `info`
    // (which is the owner's brief). Empty while nothing has been built yet.
    howItWorks: z.array(z.string().min(1, "an empty line says nothing — remove it instead")),
    // ACCESS — WHICH ROLES may reach the REAL automation on the PUBLIC surface (step 309, owner's request).
    // The Projects layer (3003) is architect-only; the public app (3000) is different — it should serve the
    // real automation (not a stub) to holders of the declared roles (e.g. subscribers). Roles from the
    // shared vocabulary (RoleSchema). EMPTY = fully public (the pre-309 default, every existing automation
    // stays valid): the body is open to everyone. Additive with a `[]` default so all prior cores validate.
    access: z.array(RoleSchema).default([]),
    // PUBLIC URL — the automation's own address on the public app (:3000), e.g.
    // `https://<domain>/<lang>/<category>/<slug>` (step 310, owner's request). EVERY automation has one; the
    // agent records it when the automation is created so the assistant can answer «where can I see this?» →
    // «on your page: <url>». Empty until assigned (honest: «the address is not assigned yet»). Additive with
    // a "" default so all prior cores validate.
    publicUrl: z.string().default(""),
  })
  .strict();

// WARNING — the agent → owner message channel. It accompanies EVERY entity that gets built: a node, a
// tab, an entity inside a tab. An empty list means "nothing to say"; a warning means the agent stopped
// and is telling the owner something instead of guessing.
//
// One of its duties is named in the law (`_instructions/passport.md`): when fundamentally different tasks pile
// up inside a single automation, the agent must PROPOSE a group of automations here — never build them
// all into one.
export const WarningSchema = z
  .object({
    cuid: CuidSchema,
    text: z.string().min(1, "a warning without text is not a warning"),
    // THE OWNER'S REPLY to this warning — the one place the answer lives, right next to the question. When
    // the agent pauses on a `needed` capability ("this node must do 123 — find me a tool"), the owner writes
    // the solution they found HERE, and the agent reads it to fill the capability instead of guessing. Empty
    // = not answered yet. Default so every warning written before this field stays valid.
    reply: z.string().default(""),
  })
  .strict();

// AN ENV KEY — a key from the environment that this node or component needs in order to work. The agent
// names the key while it generates the code, and states what it found:
//   present — the key is in the environment and works;
//   missing — the key is not there at all;
//   error   — the key IS there but does not work (expired, mistyped, out of tokens) — and then the
//             comment says WHY, because that is what the agent reads on its next run before deciding.
export const EnvKeyStatusSchema = z.enum(["present", "missing", "error"]);

export const EnvKeySchema = z
  .object({
    name: z.string().regex(/^[A-Z][A-Z0-9_]*$/, "an env key is UPPER_SNAKE_CASE"),
    status: EnvKeyStatusSchema,
    comment: z.string(),
  })
  .strict()
  .superRefine((key, ctx) => {
    if (key.status === "error" && !key.comment.trim()) {
      ctx.addIssue({ code: "custom", path: ["comment"], message: "a key in error must say why — that comment is what the next run reads" });
    }
  });

// Everything that gets BUILT is described the same way: one info text, the build status, the messages to
// the owner, and the env keys it asks for. One vocabulary for nodes and components alike.
const buildRecord = {
  info: InfoSchema,
  status: BuildStatusSchema,
  warnings: z.array(WarningSchema),
  envKeys: z.array(EnvKeySchema),
};

// A NODE FUNCTION — what it does, what it takes, what it gives back. A node carries EXACTLY ONE of them
// (see `function` below): complexity is expressed by the NUMBER OF NODES, never by piling functions into
// one node.
// The three texts are capped: they are a caption for a human and a model, not documentation.
const shortText = (what: string) =>
  z.string().min(1, `${what} is required`).max(TEXT_LIMIT, `${what} must be at most ${TEXT_LIMIT} characters`);

// ─── ИСХОД И ВАЛИДАТОР (шаг 311.8 — требование владельца) ───────────────────────────────────────────
//
// ЗАЧЕМ. Живой прогон 311.7: `fetchExternal` получил от источника 403 и вернул «ничего не нашлось»
// ОБЫЧНЫМ ctx-патчем. Для графа узел отработал успешно — тихое падение логики, невидимое ни сборке, ни
// схеме. Корень назвал владелец: **без валидатора функция ВСЕГДА пропускает выход дальше**, и любой
// провал превращается в успех.
//
// Поэтому у трансформа и у логического узла ДВА обязательных поля:
//   `outcomes`  — перечень исходов, не менее ДВУХ. Исходов бывает много с обеих сторон (владелец:
//                 «выше 80% — успех, остальное — провал»), поэтому это ПЕРЕЧЕНЬ, а не флаг «ок/не ок»;
//   `validator` — имя функции, которая КЛАССИФИЦИРУЕТ результат по этому перечню. Имя ВЫВОДИТСЯ из
//                 имени функции (`fetchExternal` → `fetchExternalValidate`), как имена каналов и
//                 классов выводятся из своих словарей: одно объявление, остальное следует.
//
// Принуждение трёхуровневое, и каждый уровень ловит то, что пропускает предыдущий:
//   1) СХЕМА (здесь) — узел без валидатора или менее чем с двумя исходами невалиден;
//   2) ЗАГРУЗКА (`_lib/nodes/index.ts`) — объявленный, но не зарегистрированный валидатор роняет модуль;
//   3) ДВИЖОК (`_lib/executor.ts`) — результат, который валидатор не отнёс ни к одному объявленному
//      исходу, ВАЛИТ прогон с названной причиной. Тихого пропуска не существует.
export const OutcomeSchema = z
  .object({
    // Имя исхода — машинное, короткое: его пишет движок в контекст и в журнал (`ctx.outcome`).
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, "an outcome name is lowercase latin with dashes"),
    // ПРИ КАКИХ УСЛОВИЯХ этот исход наступает — фраза для человека и модели, а не код.
    when: shortText("the condition of the outcome"),
    // ЧТО исход кладёт в контекст: по этому полю читается самоописание узла (`api/abilities`).
    puts: shortText("what the outcome puts into the context"),
  })
  .strict();

export const NodeFunctionSchema = z
  .object({
    name: z.string().min(1),
    summary: shortText("the function summary"),
    accepts: shortText("what the function accepts"),
    returns: shortText("what the function returns"),
    // Аддитивные поля с дефолтами: ядра, написанные до этого закона, остаются валидными, а требование
    // «не менее двух исходов + валидатор» накладывается ПО ВИДУ узла (см. `nodeOf` ниже).
    outcomes: z.array(OutcomeSchema).default([]),
    validator: z.string().default(""),
  })
  .strict();

/** Имя валидатора выводится из имени функции: `fetchExternal` → `fetchExternalValidate`. Закон, не выбор. */
export const validatorName = (fn: string): string => `${fn}Validate`;

// Виды узлов, которым валидатор ОБЯЗАТЕЛЕН: те, что РЕШАЮТ судьбу потока.
//
// `intent` попал сюда после живой проверки двери самоописания (311.8d): класс фронта решает не меньше
// трансформа — он либо забирает прогон себе, либо пропускает дальше. Без валидатора «забрал» и
// «пропустил» неразличимы в журнале, и понять, почему прогон ушёл не туда, можно только по коду. Двери
// и доставщики валидатора не имеют: их исход определяет канал, а не логика.
export const KINDS_NEEDING_VALIDATOR = ["intent", "transform", "condition-success", "condition-failure"] as const;

// ─── CHANNELS (ioType) ──────────────────────────────────────────────────────────────────────────────
// WHERE the automation's work arrives from, and WHERE its result is delivered. A CLOSED vocabulary: a
// node may carry exactly one of these values and nothing else. `custom` is the one door left open — it
// names an owner-defined channel without letting arbitrary strings into the core.
export const InputChannelSchema = z.enum([
  "control-panel", // a request the owner sends through the Control panel
  "webhook", // an external system calls in over HTTP
  "cron", // a scheduled tick fires it on a timer
  "public-page", // a form or control on the automation's own public page
  "telegram-bot", // a message sent to the automation's own Telegram bot
  "user-telegram-chat", // a message read from the user's own Telegram chat
  "email", // a letter delivered to the automation's own inbound address
  "custom", // any other input source the owner defines
]);
// `hermes` was removed from this vocabulary by the owner (step 293): an automation is not fed by the
// workspace's agent runtime. Its slot in the input quota is taken by `email`, so the count is unchanged.
// This deletion is an EXCEPTION to "a door is never removed, an unused one is hidden" — a channel that
// must not exist at all is a different case from one that exists and is unused.

export const OutputChannelSchema = z.enum([
  // 🔒 ТОСТ — НЕОТКЛЮЧАЕМЫЙ КАНАЛ ИСХОДА (шаг 311.8, требование владельца). До него `condition-failure`
  // имел запрещённый выход: упавший прогон не доходил НИ ДО ОДНОГО выхода, и человек не узнавал ничего.
  // Тост принимает ОБЕ ветки — и успех, и провал — и всегда доступен: у реального проекта он обязан быть
  // видимым (проверяется в законе запуска ниже). Честная граница записана в `output.toast.md`: тост —
  // поверхность СВОЕЙ страницы и журнала; для внешних каналов последнее слово за каналом-источником.
  "toast",
  "public-page", // a page on the automation's own website
  "dashboard", // a row or a table on the dashboard
  "calendar", // an event on the automation's calendar
  "analytics", // a chart in the automation's analytics
  "map", // a marker on the automation's map
  "email", // an email the automation sends out
  "telegram-bot", // a message sent through the automation's own Telegram bot
  "user-telegram-chat", // a message written into the user's own Telegram chat
  "vector-memory", // a fact remembered in the agent vector memory (LightRAG)
  "database", // a record written into the automation's own local database
  "storage", // a file kept in the automation's own local storage
  "custom", // any other delivery destination the owner defines
]);

// ─── СЛОВАРЬ КЛАССОВ ЗАПРОСА (шаг 311) — инвентарь фронта, объявленный ОДИН раз ─────────────────────
// Устроен ровно как словари каналов: класс — это то, на что узел вида `intent` имеет право в своём
// `ioType`. Отсюда же считается квота группы, отсюда же выводится имя инструкции класса
// (`intent.<class>`) и имя его функции (`intent` + PascalCase). Один источник истины: добавить класс =
// добавить значение сюда, и три производных встанут на место сами.
//
// ПОРЯДОК ЗНАЧИМ — это старшинство: первый заявивший побеждает, поэтому узкие классы стоят раньше
// широких (`refuse` первым, `record-given` последним из содержательных, `unclaimed` замыкает).
//
// Разбиение выведено по двум осям, а не собрано списком (полностью — `_instructions/group.intent.md`):
//   ГДЕ ЛЕЖИТ ОТВЕТ: в сообщении · снаружи · в наших складах · и там и там · в паспорте · нигде (запрет);
//   ЧТО С ОБРАЩЕНИЕМ: про устройство автоматизации · продолжение прежнего · неполное · только вежливость.
//
// `custom` — ОТКРЫТАЯ ДВЕРЬ (как `custom` у каналов): в базовую квоту НЕ входит, узла в поставке нет,
// он заводится, когда действительно понадобился. Когда это законно — `_instructions/intent.custom.md`.
export const IntentClassSchema = z.enum([
  "refuse", // ответа быть не должно (секреты сервера)
  "continuation", // вторая половина прежнего запроса: висит вопрос, это ответ на него
  "self-describe", // вопрос о самой автоматизации — ответ в паспорте
  "control", // меняет УСТРОЙСТВО автоматизации, а не её данные
  "composite", // два действия по порядку: добыть снаружи, затем сверить со своим
  "fetch-external", // данных в сообщении нет — добыть из внешнего мира
  "read-own", // вопрос о том, что уже хранится у нас
  "incomplete", // намерение ясно, данных не хватает — задать один уточняющий вопрос
  "small-talk", // вежливость: ответ нужен, действие — нет
  "record-given", // данные уже в сообщении — сохранить (самый широкий содержательный класс)
  "unclaimed", // никто не узнал своё — сказать правду, а не выбрать дефолт
  "custom", // открытая дверь: класс, которого нет в этом списке (см. intent.custom.md)
]);

/** Имя функции класса выводится из самого класса: `self-describe` → `intentSelfDescribe`. Закон, не выбор. */
export const intentFunctionName = (cls: string): string =>
  "intent" + cls.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");

/** Имя инструкции класса — тоже производное: `self-describe` → `intent.self-describe`. */
export const intentInstructionName = (cls: string): string => `intent.${cls}`;

// СТРАХОВКА ОТ РАСХОЖДЕНИЯ: у каждого класса словаря обязана быть зарегистрированная инструкция. Список
// имён инструкций объявлен выше литералом (он общий для всех уровней), поэтому сверяем их здесь — при
// добавлении класса без инструкции модуль падает на загрузке, а не тихо отдаёт пустой закон.
const missingIntentInstructions = IntentClassSchema.options
  .map(intentInstructionName)
  .filter((n) => !(SYSTEM_INSTRUCTION_NAMES as readonly string[]).includes(n));
if (missingIntentInstructions.length) {
  throw new Error(`intent classes without a registered instruction: ${missingIntentInstructions.join(", ")}`);
}

// ─── СЛОВАРЬ ОБЛАСТЕЙ ЭВОЛЮЦИИ (шаг 314) — что автоматизация вправе менять В СЕБЕ ────────────────────
// Пятый слой стоит ПОСЛЕ выхода и работает над САМОЙ АВТОМАТИЗАЦИЕЙ, а не над данными прогона: по
// завершении цикла взаимодействия он извлекает особенности диалога и уточняет конфигурацию — инструкцию
// поведения, примеры, голос. Области отличаются не темой, а ПРАВОМ ЗАПИСИ: что именно узлу позволено
// изменить. Разные права — разные предохранители и разные инструкции, поэтому узел на область.
//
// `graph` (вторая итерация) и `custom` (открытая дверь) в квоту НЕ входят: узел заводится, когда его
// работа построена и доказана. Полное ТЗ — `/code/next-step/314-evolution-layer.spec.md`.
export const EvolutionScopeSchema = z.enum([
  "capability-gap", // ничего не меняет: фиксирует невозможный при нынешнем графе запрос → Warning владельцу
  "behavior", // инструкция поведения ассистента (аккордеон вкладки «Ассистент»)
  "examples", // пары вопрос-ответ (few-shot)
  "voice", // тон, обращение, длина реплик
  "graph", // предложение изменить холст — ТОЛЬКО с одобрения владельца (итерация 2)
  "custom", // открытая дверь
]);

/** Имя функции области выводится из неё самой: `capability-gap` → `evolveCapabilityGap`. Закон, не выбор. */
export const evolutionFunctionName = (scope: string): string =>
  "evolve" + scope.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");

/** Имя инструкции области — тоже производное: `behavior` → `evolution.behavior`. */
export const evolutionInstructionName = (scope: string): string => `evolution.${scope}`;

// Та же страховка, что у классов фронта: область без зарегистрированной инструкции роняет модуль на
// загрузке, а не отдаёт молча пустой закон.
const missingEvolutionInstructions = EvolutionScopeSchema.options
  .map(evolutionInstructionName)
  .filter((n) => !(SYSTEM_INSTRUCTION_NAMES as readonly string[]).includes(n));
if (missingEvolutionInstructions.length) {
  throw new Error(`evolution scopes without a registered instruction: ${missingEvolutionInstructions.join(", ")}`);
}

// ─── ПРОИЗВОДНЫЕ ИМЕНА КАНАЛОВ (шаг 311.4) ──────────────────────────────────────────────────────────
// Тот же закон, что у классов фронта и областей эволюции: канал объявлен ОДИН раз в своём словаре, а имя
// функции и имя инструкции из него ВЫВОДЯТСЯ. До этого канал жил в трёх местах (имя узла, имя функции,
// проза инструкции) — и уже разъехался: `control-panel` обслуживался функцией `receiveRequest`, а
// `dashboard` — функцией `deliverResult`. Обе переименованы, потому что закон без исключений или его нет.
//
// КОННЕКТОРЫ ПОД ЭТОТ ЗАКОН НЕ ПОДПАДАЮТ: их `ioType` называет не свой канал, а язык соседней
// автоматизации, и их работа — передача наружу (`receiveFromExternal` / `handToExternal`), а не приём
// конкретного канала. Проверка ниже применяется только к видам `input` и `output`.
export const inputFunctionName = (channel: string): string =>
  "receive" + channel.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
export const outputFunctionName = (channel: string): string =>
  "deliver" + channel.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");

/** Имена инструкций каналов — тоже производные: `telegram-bot` → `input.telegram-bot` / `output.telegram-bot`. */
export const inputInstructionName = (channel: string): string => `input.${channel}`;
export const outputInstructionName = (channel: string): string => `output.${channel}`;

// Та же страховка, что у классов и областей: канал без зарегистрированной инструкции роняет модуль на
// загрузке, а не отдаёт молча пустой закон.
const missingChannelInstructions = [
  ...InputChannelSchema.options.map(inputInstructionName),
  ...OutputChannelSchema.options.map(outputInstructionName),
].filter((n) => !(SYSTEM_INSTRUCTION_NAMES as readonly string[]).includes(n));
if (missingChannelInstructions.length) {
  throw new Error(`channels without a registered instruction: ${missingChannelInstructions.join(", ")}`);
}

export const NodeKindSchema = z.enum([
  "input-connector",
  "output-connector",
  "input",
  // СЛОЙ НАМЕРЕНИЯ (шаг 311, решение владельца 2026-08-01) — фронт запроса. Из входа в середину приходят
  // запросы РАЗНЫХ типов, которые обязаны порождать разное поведение; в v2 это решение принимал доменный
  // узел внутри середины (`classifyIntent` со словарём одной автоматизации), то есть архитектура не знала
  // ни «понять, чего хотят», ни «сказать человеку». Теперь фронт — это МЕСТО: узел на класс запроса,
  // инвентарь конечный и закрытый (как каналы входа/выхода), проход через слой ОБЯЗАТЕЛЕН.
  "intent",
  "output",
  // ЭВОЛЮЦИЯ (шаг 314) — работа автоматизации над САМОЙ СОБОЙ, после доставки ответа. Терминальный слой:
  // всё, что он производит, он записывает в конфигурацию, а не передаёт дальше.
  "evolution",
  "transform",
  "condition-success",
  "condition-failure",
]);

// A PORT carries TWO facts about itself, never one:
//   state       — how obligatory it is: required | optional | prohibit;
//   connections — WHAT MAY KNOCK ON IT: the kinds of node it is entitled to be wired to. `external` means
//                 a node of ANOTHER automation — that is what a connector exists for.
// A forbidden port is `state: "prohibit"` + `connections: null`, and nothing else: a prohibition has no
// second spelling. The two facts cannot contradict each other — the schema below binds them.
//
// Port names and data types are NOT stored here — what a node takes and gives back is told by its
// functions (`accepts` / `returns`), and the same fact must not live twice.
export const PortStateSchema = z.enum(["required", "optional", "prohibit"]);
export const PortTargetSchema = z.union([NodeKindSchema, z.literal("external")]);

export const PortSchema = z
  .object({
    state: PortStateSchema,
    connections: z.array(PortTargetSchema).min(1, "a port that leads nowhere must be null, not an empty list").nullable(),
  })
  .strict()
  .superRefine((port, ctx) => {
    if (port.state === "prohibit" && port.connections !== null) {
      ctx.addIssue({ code: "custom", path: ["connections"], message: "a prohibited port cannot be wired to anything — it must be null" });
    }
    if (port.state !== "prohibit" && port.connections === null) {
      ctx.addIssue({ code: "custom", path: ["connections"], message: "an allowed port must name what may connect to it" });
    }
  });

// THE CONNECTION TABLE — the law of the graph, stated once. The node's own `in`/`out` must repeat its row
// exactly (the core states the fact; the schema refuses a contradiction), and an edge is lawful when its
// target is named in the source's `out.connections`.
//
//   kind               in                                              out
//   input-connector    optional  external                              required  intent
//   output-connector   required  condition-success | intent            optional  external
//   input              prohibit  —                                     required  intent
//   intent             required  input | input-connector               required  transform | output | output-connector
//   output             required  condition-success | condition-failure | intent   optional  evolution
//   evolution          required  output                                prohibit  —
//   transform          required  intent | transform | condition-success required  transform | condition-success | condition-failure
//   condition-success  required  transform                             required  transform | output | output-connector
//   condition-failure  required  transform                             required  output   ← 311.8: провал не тупик
//
// 🔒 КОНЕЦ ПУТИ ОБЪЯВЛЕН ОКОНЧАТЕЛЬНО (шаг 314). `output.out` перестал быть запретом и ведёт в
// `evolution` — пятый слой, работающий над САМОЙ автоматизацией после того, как ответ уже доставлен.
// `evolution.out` — запрет: слой ТЕРМИНАЛЬНЫЙ, всё произведённое он ЗАПИСЫВАЕТ в конфигурацию, а не
// передаёт дальше. Поэтому шестого слоя не будет: новая способность такого рода — это новая ОБЛАСТЬ
// внутри `EvolutionScopeSchema`, а не новый ряд в этой таблице. Связь `optional`, потому что
// автоматизация без эволюции остаётся законной: слой даёт способность, но не создаёт зависимости
// от модели и ключа.
//
// 🔒 ДВА СЛЕДСТВИЯ ЧЕТВЁРТОГО СЛОЯ (шаг 311) — оба намеренные, оба ломают ядра v2:
//   1. ПРОХОД ОБЯЗАТЕЛЕН. `input`.out и `input-connector`.out ведут ТОЛЬКО в `intent`; ребра
//      «вход → середина» больше НЕ существует. Иначе первая же автоматизация проложит объезд, и слой
//      станет украшением, а не рельсами.
//   2. ФРОНТ ВПРАВЕ НЕ ПУСТИТЬ ЗАПРОС В СЕРЕДИНУ. `intent`.out ведёт и напрямую в выход — потому что
//      классы «самоописание», «недопустимый запрос» и «социальное» середине не нужны вовсе: ответ уже
//      есть в паспорте, либо ответа не должно быть. В v2 такие маршруты были невыразимы
//      (`transform`.in: required), и их приходилось протаскивать контрабандой через срединный узел.
//
// Прежняя асимметрия («input-connector».out назывался `transform`, а `transform`.in его не называл)
// ЗАКРЫТА этим же изменением: оба входных вида ведут в `intent`, а `intent`.in называет оба. Ребро
// по-прежнему проверяется со стороны ИСТОЧНИКА.
type Port = z.infer<typeof PortSchema>;

export const KIND_PORTS: Record<z.infer<typeof NodeKindSchema>, { in: Port; out: Port }> = {
  "input-connector": {
    in: { state: "optional", connections: ["external"] },
    out: { state: "required", connections: ["intent"] },
  },
  "output-connector": {
    // Ветка провала ведёт и сюда (311.8): соседняя автоматизация вправе узнать, что у нас не вышло.
    in: { state: "required", connections: ["condition-success", "condition-failure", "intent"] },
    out: { state: "optional", connections: ["external"] },
  },
  input: {
    in: { state: "prohibit", connections: null },
    out: { state: "required", connections: ["intent"] },
  },
  // ФРОНТ ЗАПРОСА. Вход у него ОБЯЗАТЕЛЕН (узел-класс без входа ничего не судит), выход — тоже: класс,
  // который ничего не решает, не имеет права существовать. Выход ведёт в середину (классы, которым нужна
  // работа над данными) ИЛИ прямо в выход (классы, которым середина не нужна).
  intent: {
    in: { state: "required", connections: ["input", "input-connector"] },
    out: { state: "required", connections: ["transform", "output", "output-connector"] },
  },
  output: {
    in: { state: "required", connections: ["condition-success", "condition-failure", "intent"] },
    out: { state: "optional", connections: ["evolution"] },
  },
  // ПЯТЫЙ СЛОЙ. Вход обязателен (наблюдать нечего без завершённой доставки), выход запрещён — терминал.
  evolution: {
    in: { state: "required", connections: ["output"] },
    out: { state: "prohibit", connections: null },
  },
  transform: {
    in: { state: "required", connections: ["intent", "transform", "condition-success"] },
    out: { state: "required", connections: ["transform", "condition-success", "condition-failure"] },
  },
  "condition-success": {
    // ВЕТКА УСПЕХА ВЕДЁТ И В ВЫХОДНОЙ КОННЕКТОР (2026-07-22). Закон связи проверяется со стороны
    // ИСТОЧНИКА, а `output-connector` объявлял вход «только из condition-success» — и при этом ни один
    // вид не называл его в своих исходящих. Требуемый вход коннектора был невыполним: его нельзя было
    // соединить ни с чем законным, и он навсегда оставался висеть отдельно от графа (владелец увидел
    // это на диаграмме). Односторонняя запись была ошибкой, а не задумкой: коннектор доставляет
    // результат наружу ровно так же, как выходной узел доставляет его внутрь автоматизации.
    in: { state: "required", connections: ["transform"] },
    out: { state: "required", connections: ["transform", "output", "output-connector"] },
  },
  // ПРОВАЛ БОЛЬШЕ НЕ ТУПИК (шаг 311.8). Прежде выход был запрещён — и упавший прогон не доходил ни до
  // одного выхода: человек не узнавал ни того, что было, ни почему. Теперь ветка провала ОБЯЗАНА вести в
  // выход (на практике — в тост), и «провалились молча» перестало быть выразимым состоянием.
  "condition-failure": {
    in: { state: "required", connections: ["transform"] },
    out: { state: "required", connections: ["output"] },
  },
};

// A node's declared port must repeat its row of the table exactly — same state, same connections in the
// same order. The core states the law out loud; it is not allowed to state it differently.
const samePort = (a: Port, b: Port) =>
  a.state === b.state &&
  (a.connections === null || b.connections === null
    ? a.connections === b.connections
    : a.connections.length === b.connections.length && a.connections.every((v, i) => v === b.connections![i]));

// ─── CAPABILITY — how a node's function is FULFILLED when it is NOT our own code ─────────────────────
// A node's function is usually plain native code in `_lib/nodes/`. Sometimes it is not: it reaches into
// the world through an EXTERNAL tool — an MCP server, an agent skill, a third-party API. `capability`
// records that binding. Its ABSENCE (`null`, the default) IS the statement "this is native code": a
// native node carries no binding at all, so `native` is not a value here.
//
// It is ORTHOGONAL to the node's kind: a `transform` that calls a translation MCP carries it, a `transform`
// that only glues two payloads together does not. Most automations never touch this field; the ones that
// do read `tools-docs/external-capabilities.md` first.
//
// It deliberately does NOT repeat what the node already states, so the same fact never lives twice:
//   - the io-contract is `function.accepts` / `function.returns` (what goes in, what comes out);
//   - the credentials it needs are `envKeys` (the key, and whether it is present / missing / in error).
// `capability` adds ONLY the four facts those two do not carry.
export const CapabilityTypeSchema = z.enum(["mcp", "skill", "api"]);

// THE BINDING'S OWN LIFECYCLE — distinct from the build status and from the run history:
//   needed    — the PLATFORM has predicted this node cannot be built with our own code and MUST reach an
//               external tool, but NO tool is chosen yet. The tool is the USER's to supply: the platform
//               writes a warning, pauses, and waits for the owner to reply with the solution they found.
//               While `needed`, `type`/`ref`/`tool` are not known yet — only `reason` is (the prediction).
//   candidate — a tool has been NAMED (by the owner's reply, or later by the catalogue), not yet wired;
//   bound     — the node's function actually calls it (the code is written);
//   proven    — a real run reached it and came back with a real result.
// A binding can be `bound` yet never `proven` (the code calls it but no run has confirmed it works).
// build-status `materialized` says "the code is written"; `proven` says "it worked in a real run" — two
// different questions, so two different fields.
export const CapabilityStatusSchema = z.enum(["needed", "candidate", "bound", "proven"]);

// AN ATTEMPT — one tool the owner tried for this node, kept so the choosing is not thrown away. The owner's
// path is rarely a straight line ("tried tool A, disliked the result, asked for tool B, came back to A"),
// and that path is exactly the signal a future model is trained on: which tool was chosen over which, and
// why. The array is ordered — its order IS the sequence of attempts.
//   outcome — chosen (settled on it), rejected (owner did not like the result), failed (it did not work).
export const CapabilityOutcomeSchema = z.enum(["chosen", "rejected", "failed"]);

export const CapabilityAttemptSchema = z
  .object({
    ref: z.string().min(1, "an attempt names the tool that was tried"),
    tool: z.string().min(1, "an attempt names the exact tool/method that was tried"),
    outcome: CapabilityOutcomeSchema,
    // the owner's requirement/why for this attempt, in short (may be empty, but a reason is the training gold)
    note: z.string().max(TEXT_LIMIT, `an attempt note must be at most ${TEXT_LIMIT} characters`),
  })
  .strict();

export const CapabilitySchema = z
  .object({
    // `type` is unknown while the need is only predicted (`needed`) — the platform knows a tool is required
    // before it knows which KIND. It is required the moment a tool is named (checked below).
    type: CapabilityTypeSchema.nullable(),
    // `reason` — WHY this node needs an external tool ("it must do 123, which our code cannot"). This is the
    // platform's prediction, known from the first moment, so it is required in every status.
    reason: shortText("the reason this node needs an external tool"),
    // `ref` — the id the tool is known by (an MCP server name, a skill id, an API name). Today it is a plain
    // name the owner writes; when the world catalogue (LightRAG) lands, it will be that catalogue's id.
    // `tool` — the exact tool / method / endpoint called on that ref. Both empty while status is `needed`.
    ref: z.string(),
    tool: z.string(),
    status: CapabilityStatusSchema,
    // `fallback` — another ref to try when this one is unavailable; empty string = no fallback.
    fallback: z.string(),
    // the ordered log of tools tried for this node — the choosing kept for training (see above)
    attempts: z.array(CapabilityAttemptSchema),
  })
  .strict()
  .superRefine((cap, ctx) => {
    // Once a tool is named (anything past `needed`), its kind and its ids must be present. While `needed`,
    // they are legitimately blank — the owner has not supplied the tool yet.
    if (cap.status !== "needed") {
      if (cap.type === null) {
        ctx.addIssue({ code: "custom", path: ["type"], message: `a "${cap.status}" capability has a named tool — its type (mcp/skill/api) is required` });
      }
      if (!cap.ref.trim()) {
        ctx.addIssue({ code: "custom", path: ["ref"], message: `a "${cap.status}" capability must name the external tool it binds to` });
      }
      if (!cap.tool.trim()) {
        ctx.addIssue({ code: "custom", path: ["tool"], message: `a "${cap.status}" capability must name the exact tool/method it calls` });
      }
    }
  });

// Fields every node carries, whatever its kind.
const nodeBase = {
  cuid: CuidSchema,
  name: z.string().min(1),
  description: z.string(),
  state: StateSchema,
  // info (one of two forms) + build status + warnings + env keys
  ...buildRecord,
  // ONE function per node — not a list. A node that seems to need two functions is two nodes.
  function: NodeFunctionSchema,
  // HOW the function is fulfilled: `null` = our own native code (the default); an object = an external
  // tool (see CapabilitySchema). Optional with a `null` default so every core written before this field
  // existed stays valid without a rewrite.
  capability: CapabilitySchema.nullable().default(null),
  // WHICH USE CASES this node serves — the cuids of the cases it exists for. This is the "why" that a
  // bare node object lacks: a node summarised "parse date" says nothing about the scenario it served.
  // The federated skill corpus (step 307) reads it to build a node's passport. Additive with a `[]`
  // default so every core written before it stays valid; v1 precedent — a node's `actions` column.
  serves: z.array(CuidSchema).default([]),
  // LINEAGE — ЕДИНСТВЕННАЯ связь узла с ВНЕШНИМ КОРПУСОМ ПАТТЕРНОВ (шаг 310, уточнение доктрины 307).
  // Постоянный id ПАТТЕРНА, по которому узел написан: локальный `cuid` — идентичность ЭТОГО узла,
  // `lineage` — идентичность паттерна по всему флоту, по нему же агрегируется телеметрия.
  //
  // 🔒 ЧЕМ ЭТО ПОЛЕ НЕ ЯВЛЯЕТСЯ. Оно не импорт, не ссылка и не клиент: рантайм автоматизации к корпусу
  // не обращается НИКОГДА (иначе автоматизация клиента начнёт зависеть от нашего сервиса). Корпус —
  // dev-time: строитель спрашивает его, КОГДА ПИШЕТ узел, получает ПАТТЕРН (форму решения), пишет свой
  // код и записывает сюда id паттерна. Копирования чужого файла в этом пути нет — оно тащит чужой
  // контракт папки, чужие имена таблиц и чужие допущения о выходном слое.
  //
  // Пусто = узел написан с нуля; после живого пруфа он сам может стать паттерном корпуса.
  // Закон целиком — `_instructions/middle.custom.md`. Аддитивное поле с дефолтом.
  lineage: z.string().default(""),
  // HOOK PHRASES — this automation's trigger phrases for the `hookGate` skill (step 307.7 group law:
  // several automations share one chat, each self-gates its own phrase). They live ON THE NODE in the
  // core — git carries them to every server, so a redeploy keeps the group working (the run push may
  // still override via ctx.hookPhrases). Meaningful only on the hookGate node; additive `[]` default
  // so every core written before this field stays valid.
  hookPhrases: z.array(z.string().min(1)).default([]),
  // ROLE — необязательная РОЛЬ узла сверх его вида (kind). Пусто (по умолчанию) — обычный узел вида kind.
  // `"conversation"` (шаг 308, решение владельца) — РАЗГОВОРНАЯ ГРАНИЦА: узел, чья работа — говорить с
  // человеком МОДЕЛЬЮ по сценарию поведения (данные вкладки «Ассистент»), а не считать над данными. Так
  // «узел нового типа — разговорный агент» выражен РОЛЬЮ внутри `transform`, БЕЗ разморозки `KIND_PORTS`
  // (порты и виды не меняются). Неотвратимость — через присутствие такого узла в замороженной середине
  // шаблона. Аддитивное поле с дефолтом `""`, все прежние ядра валидны без правки.
  role: z.enum(["", "conversation"]).default(""),
  run: z.enum(["sequential", "parallel"]),
  estDurationMs: z.number().int().positive(),
};

// A node of one kind: its ports must repeat the table's row for that kind, and its channel (`ioType`) is
// the vocabulary its kind is entitled to — the входные kinds pick from the input channels, the выходные
// from the output ones, and a middle node has no channel at all (`null`, never a string).
const nodeOf = (kind: z.infer<typeof NodeKindSchema>, ioType: z.ZodTypeAny) =>
  z
    .object({
      ...nodeBase,
      kind: z.literal(kind),
      ioType,
      in: PortSchema,
      out: PortSchema,
    })
    .strict();

export const NodeSchema = z.discriminatedUnion("kind", [
  nodeOf("input-connector", InputChannelSchema),
  nodeOf("output-connector", OutputChannelSchema),
  nodeOf("input", InputChannelSchema),
  nodeOf("output", OutputChannelSchema),
  // Узел фронта объявляет СВОЙ КЛАСС в `ioType` — так же, как входной объявляет свой канал: `ioType` есть
  // словарь, на который вид имеет право. Отсюда выводятся и его инструкция, и имя его функции.
  nodeOf("intent", IntentClassSchema),
  // Узел эволюции объявляет свою ОБЛАСТЬ в `ioType` — тот же приём: словарь, на который вид имеет право.
  nodeOf("evolution", EvolutionScopeSchema),
  nodeOf("transform", z.null()),
  nodeOf("condition-success", z.null()),
  nodeOf("condition-failure", z.null()),
]);

// ─── NODE GROUPS ────────────────────────────────────────────────────────────────────────────────────
// The nodes are not one flat pile: they live in THREE GROUPS — the way in, the middle, the way out — and
// each group states its own rules RIGHT ABOVE the array they govern. A model editing a group therefore
// reads its law locally, without holding the whole table of kinds in its head, and a rule it ignores does
// not merely go against the documentation — it fails validation.
//
// THE QUOTA HAS TWO LEVELS, because one level counts the wrong thing: "at least two nodes" is satisfied by
// two `input` nodes and no connector at all.
//
//   at the GROUP level — `minKinds`: how many DIFFERENT kinds must be present;
//   at the KIND level  — each kind's own rules, because a connector and an ordinary входной узел do not
//                        live by the same law:
//        deletion — may a node of this kind be removed;
//        addition — may another one be added;
//        minNodes — how many nodes of this kind there must be.
//
// The keys of `kinds` ARE the group's allowed kinds — no second list that could disagree with the first.
export const PermissionSchema = z.enum(["allowed", "forbidden"]);
export const GroupNameSchema = z.enum(["input", "intent", "middle", "output", "evolution"]);

// A kind's own rules, plus the system instruction of that kind — the text a model reads before it touches
// a node of this kind. The instruction is pinned per kind in the group check below (a record cannot vary
// its value schema by key).
export const KindPolicySchema = z
  .object({
    systemInstructionName: SystemInstructionNameSchema,
    deletion: PermissionSchema,
    addition: PermissionSchema,
    minNodes: z.number().int().positive(),
  })
  .strict();

type KindPolicy = { deletion: z.infer<typeof PermissionSchema>; addition: z.infer<typeof PermissionSchema>; minNodes: number };
type GroupPolicy = { minKinds: number; kinds: Partial<Record<z.infer<typeof NodeKindSchema>, KindPolicy>> };

// How many channels an automation is born ready for: EVERY channel of the vocabulary except `custom` —
// that one is the open door, a node for it is made when it is actually needed. Counted FROM the vocabulary
// itself, never typed in as a number: a new channel raises the quota by itself, and the two cannot drift.
const channelCount = (options: readonly string[]) => options.filter((c) => c !== "custom").length;
export const INPUT_CHANNEL_QUOTA = channelCount(InputChannelSchema.options);
export const OUTPUT_CHANNEL_QUOTA = channelCount(OutputChannelSchema.options);

// THE GROUP TABLE — the law, stated once. A group's own declaration must repeat its row word for word.
//
// The numbers are NOT arbitrary:
//   input / output — one node per channel of the vocabulary: the automation is born with the FULL
//                    inventory of its doors, all hidden, and the builder only ever UNHIDES one. That is
//                    what makes an automation's composition predictable before it is read.
//   connectors     — exactly one each: deletion AND addition are both forbidden, so the count can neither
//                    fall below one nor rise above it.
//   middle         — one of each kind at the floor, and the group may grow freely: the middle is where the
//                    automation's real work is decomposed.
// СКОЛЬКО КЛАССОВ ЗАПРОСА НЕСЁТ ФРОНТ. Инвентарь фронта конечен и ЗАКРЫТ (как каналы входа/выхода):
// классы запроса — это перечень ФОРМ обращения человека к системе, а не перечень доменов, поэтому их
// число не растёт от автоматизации к автоматизации. Число здесь = сколько классов РЕАЛЬНО реализовано:
// шаблон отгружается с работающими узлами, no-op-заглушки запрещены (глобальная цель шаблона), поэтому
// класс появляется в ядре ТОЛЬКО вместе со своей рабочей функцией, и эта квота растёт вместе с ним.
// Квота фронта СЧИТАЕТСЯ ИЗ СЛОВАРЯ, а не вписывается числом — иначе добавление класса требует правки в
// двух местах, и они разъедутся (тот же приём, что у каналов). `custom` из счёта исключён: это открытая
// дверь, узел для неё заводится по нужде, а не рождается вместе с автоматизацией.
export const INTENT_CLASS_QUOTA = IntentClassSchema.options.filter((c) => c !== "custom").length;

// Квота эволюции — тоже из словаря. Исключены `custom` (открытая дверь) и `graph`: изменение самого холста
// — вторая итерация, её узел заводится, когда работа построена и доказана, а не заранее (заглушек не бывает).
export const EVOLUTION_SCOPE_QUOTA = EvolutionScopeSchema.options.filter((s) => s !== "custom" && s !== "graph").length;

export const GROUP_POLICY: Record<z.infer<typeof GroupNameSchema>, GroupPolicy> = {
  input: {
    minKinds: 2,
    kinds: {
      input: { deletion: "forbidden", addition: "allowed", minNodes: INPUT_CHANNEL_QUOTA },
      "input-connector": { deletion: "forbidden", addition: "forbidden", minNodes: 1 },
    },
  },
  // ФРОНТ — один вид узлов, фиксированный набор: ни удалить класс, ни добавить новый на месте нельзя.
  // Класс запроса не «настраивается строителем» — он либо есть в законе платформы, либо его нет.
  intent: {
    minKinds: 1,
    kinds: {
      intent: { deletion: "forbidden", addition: "forbidden", minNodes: INTENT_CLASS_QUOTA },
    },
  },
  middle: {
    minKinds: 3,
    kinds: {
      transform: { deletion: "allowed", addition: "allowed", minNodes: 1 },
      "condition-success": { deletion: "allowed", addition: "allowed", minNodes: 1 },
      "condition-failure": { deletion: "allowed", addition: "allowed", minNodes: 1 },
    },
  },
  output: {
    minKinds: 2,
    kinds: {
      output: { deletion: "forbidden", addition: "allowed", minNodes: OUTPUT_CHANNEL_QUOTA },
      "output-connector": { deletion: "forbidden", addition: "forbidden", minNodes: 1 },
    },
  },
  // ПЯТЫЙ СЛОЙ — группа НЕОБЯЗАТЕЛЬНА в ядре (см. NodesSchema ниже): автоматизация без эволюции законна.
  // Но если группа объявлена, её инвентарь закрыт так же, как у фронта.
  evolution: {
    minKinds: 1,
    kinds: {
      evolution: { deletion: "forbidden", addition: "forbidden", minNodes: EVOLUTION_SCOPE_QUOTA },
    },
  },
};

const sameKinds = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

// One group: the minimum number of kinds, the per-kind rules, and the nodes. The rules are checked against
// the table, the nodes against the rules.
const groupOf = (name: z.infer<typeof GroupNameSchema>) =>
  z
    .object({
      systemInstructionName: instructionName(`group.${name}` as SystemInstructionName),
      minKinds: z.number().int().positive(),
      // the keys are node kinds, but the record is deliberately PARTIAL: a group names only its own kinds.
      // (`z.record(NodeKindSchema, …)` would demand every kind of the enum in every group.) The keys are
      // checked against the table below, so nothing arbitrary gets in.
      kinds: z.record(z.string(), KindPolicySchema),
      nodes: z.array(NodeSchema),
    })
    .strict()
    .superRefine((group, ctx) => {
      const law = GROUP_POLICY[name];
      const lawKinds = Object.keys(law.kinds) as z.infer<typeof NodeKindSchema>[];

      if (group.minKinds !== law.minKinds) {
        ctx.addIssue({ code: "custom", path: ["minKinds"], message: `the "${name}" group carries ${law.minKinds} kinds, not ${group.minKinds}` });
      }

      // the declared kinds, and their rules, must repeat the table exactly
      if (!sameKinds(Object.keys(group.kinds), lawKinds)) {
        ctx.addIssue({ code: "custom", path: ["kinds"], message: `the "${name}" group holds exactly: ${lawKinds.join(", ")}` });
      }
      lawKinds.forEach((kind) => {
        const declared = group.kinds[kind];
        const rule = law.kinds[kind]!;
        if (!declared) return; // already reported above
        (["deletion", "addition"] as const).forEach((key) => {
          if (declared[key] !== rule[key]) {
            ctx.addIssue({ code: "custom", path: ["kinds", kind, key], message: `for "${kind}" ${key} is "${rule[key]}"` });
          }
        });
        if (declared.minNodes !== rule.minNodes) {
          ctx.addIssue({ code: "custom", path: ["kinds", kind, "minNodes"], message: `there are never fewer than ${rule.minNodes} "${kind}" node(s)` });
        }
        // each kind names ITS OWN law — `kind.transform` governs transforms and nothing else
        if (declared.systemInstructionName !== `kind.${kind}`) {
          ctx.addIssue({
            code: "custom",
            path: ["kinds", kind, "systemInstructionName"],
            message: `a "${kind}" is governed by the instruction "kind.${kind}" — the name is law, not a choice`,
          });
        }
      });

      group.nodes.forEach((node, i) => {
        if (!lawKinds.includes(node.kind)) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes", i, "kind"],
            message: `a "${node.kind}" cannot live in the "${name}" group — it holds ${lawKinds.join(", ")}`,
          });
        }
      });

      // THE FLOOR and THE CEILING. `deletion: "forbidden"` means the count cannot fall below the floor —
      // an unused door is HIDDEN, never removed. `addition: "forbidden"` means it cannot rise above it
      // either: there is exactly one connector, no more.
      lawKinds.forEach((kind) => {
        const rule = law.kinds[kind]!;
        const count = group.nodes.filter((n) => n.kind === kind).length;
        if (count < rule.minNodes) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes"],
            message: `the "${name}" group carries ${count} "${kind}" node(s) — never fewer than ${rule.minNodes}; an unused one is hidden, not deleted`,
          });
        }
        if (rule.addition === "forbidden" && count > rule.minNodes) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes"],
            message: `a second "${kind}" cannot be added — there is exactly ${rule.minNodes} of it`,
          });
        }
      });

      const present = new Set(group.nodes.map((n) => n.kind)).size;
      if (present < law.minKinds) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes"],
          message: `the "${name}" group shows ${present} kind(s) of node — it must carry at least ${law.minKinds}`,
        });
      }
    });

export const NodesSchema = z
  .object({
    systemInstructionName: instructionName("nodes"),
    // the instruction for ALL nodes, whatever their kind — the per-kind ones live in each group's `kinds`
    groups: z
      .object({
        input: groupOf("input"),
        intent: groupOf("intent"),
        middle: groupOf("middle"),
        output: groupOf("output"),
        // НЕОБЯЗАТЕЛЬНА: закон пятого слоя объявлен, но автоматизация без эволюции остаётся законной —
        // группа появляется в ядре вместе с первым построенным и доказанным узлом области (шаг 314).
        evolution: groupOf("evolution").optional(),
      })
      .strict(),
  })
  .strict();

// Every graph-wide check works on the flat list; this is the ONE place that flattens the groups.
export const allNodes = (nodes: z.infer<typeof NodesSchema>): z.infer<typeof NodeSchema>[] => [
  ...nodes.groups.input.nodes,
  ...nodes.groups.intent.nodes,
  ...nodes.groups.middle.nodes,
  ...nodes.groups.output.nodes,
  ...(nodes.groups.evolution?.nodes ?? []), // пятый слой необязателен — ядро без него законно
];

// AN EDGE — a link between two nodes. It carries its own cuid (an edge is an entity like any other and
// must be addressable), the cuids of its ends, and whether it is shown on the diagram.
export const EdgeSchema = z
  .object({
    cuid: CuidSchema,
    from: CuidSchema,
    to: CuidSchema,
    state: StateSchema,
  })
  .strict();

// THE GRAPH. Beyond the shape of nodes and edges it checks what a single node's schema cannot see:
// unique cuids, both ends of an edge existing, and the direction being lawful for the kind.
export const GraphSchema = z
  .object({
    systemInstructionName: instructionName("graph"),
    nodes: NodesSchema,
    edges: z.array(EdgeSchema),
  })
  .strict()
  .superRefine((graph, ctx) => {
    const nodes = allNodes(graph.nodes);
    const byCuid = new Map<string, z.infer<typeof NodeSchema>>();
    nodes.forEach((node) => {
      if (byCuid.has(node.cuid)) {
        ctx.addIssue({ code: "custom", path: ["nodes"], message: `node "${node.name}" carries a cuid that is declared twice` });
        return;
      }
      byCuid.set(node.cuid, node);

      // A CLASS NODE'S FUNCTION IS NOT NAMED BY HAND. Its class (`ioType`) already says which law it
      // serves, so the function name is DERIVED from it — `self-describe` → `intentSelfDescribe`. Without
      // this the class would live in three places at once (the node name, the function name, the class)
      // and they would drift; with it, the class is stated once and everything else follows (law 2).
      // ВАЛИДАТОР ОБЯЗАТЕЛЕН У ТЕХ, КТО РЕШАЕТ СУДЬБУ ПОТОКА (шаг 311.8). Узел без него всегда пропускает
      // результат дальше — а значит его провал невыразим, и «403» становится успехом.
      if ((KINDS_NEEDING_VALIDATOR as readonly string[]).includes(node.kind)) {
        const expected = validatorName(node.function.name);
        if (!node.function.validator) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes"],
            message: `node "${node.name}" of kind "${node.kind}" must name a validator ("${expected}") — without one its function always lets the result through, and a failure becomes a success`,
          });
        } else if (node.function.validator !== expected) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes"],
            message: `the function "${node.function.name}" is validated by "${expected}", not "${node.function.validator}" — the name is derived from the function, not chosen`,
          });
        }
        if (node.function.outcomes.length < 2) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes"],
            message: `node "${node.name}" declares ${node.function.outcomes.length} outcome(s) — a node that decides has at least TWO, otherwise there is nothing for the validator to tell apart`,
          });
        }
        const seen = new Set<string>();
        for (const o of node.function.outcomes) {
          if (seen.has(o.name)) {
            ctx.addIssue({ code: "custom", path: ["nodes"], message: `node "${node.name}" declares the outcome "${o.name}" twice` });
          }
          seen.add(o.name);
        }
      }

      if (node.kind === "intent" && typeof node.ioType === "string") {
        const expected = intentFunctionName(node.ioType);
        if (node.function.name !== expected) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes"],
            message: `the "${node.ioType}" class is served by the function "${expected}", not "${node.function.name}" — the name is derived from the class, not chosen`,
          });
        }
      }
      // То же для каналов: `telegram-bot` → `receiveTelegramBot` / `deliverTelegramBot`. Коннекторы
      // исключены — их функция передаёт наружу, а не принимает канал.
      if ((node.kind === "input" || node.kind === "output") && typeof node.ioType === "string") {
        const expected = node.kind === "input" ? inputFunctionName(node.ioType) : outputFunctionName(node.ioType);
        if (node.function.name !== expected) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes"],
            message: `the "${node.ioType}" channel is served by the function "${expected}", not "${node.function.name}" — the name is derived from the channel, not chosen`,
          });
        }
      }
      // То же для областей эволюции: `behavior` → `evolveBehavior`.
      if (node.kind === "evolution" && typeof node.ioType === "string") {
        const expected = evolutionFunctionName(node.ioType);
        if (node.function.name !== expected) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes"],
            message: `the "${node.ioType}" evolution scope is served by the function "${expected}", not "${node.function.name}" — the name is derived from the scope, not chosen`,
          });
        }
      }

      // the node must declare its kind's row of the connection table, word for word
      (["in", "out"] as const).forEach((side) => {
        if (!samePort(node[side], KIND_PORTS[node.kind][side])) {
          ctx.addIssue({
            code: "custom",
            path: ["nodes"],
            message: `node "${node.name}" of kind "${node.kind}" must declare ${side}: ${JSON.stringify(KIND_PORTS[node.kind][side])}`,
          });
        }
      });
    });

    // A FUNCTION NAME IS AN ADDRESS. The code of a node's function lives in
    // `_lib/nodes/<kebab-of-the-name>.ts` — one file per function — so two nodes claiming the name
    // would claim the same file. The name is also a public contract other nodes call by, which is why
    // it is never renamed; here it is additionally forced to be unique.
    const seenFunctions = new Map<string, string>();
    nodes.forEach((node) => {
      const owner = seenFunctions.get(node.function.name);
      if (owner) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes"],
          message: `two nodes claim the function "${node.function.name}" ("${owner}" and "${node.name}") — a function name is the address of its file, and there is only one of it`,
        });
        return;
      }
      seenFunctions.set(node.function.name, node.name);
    });

    const seenEdges = new Set<string>();
    graph.edges.forEach((edge, i) => {
      if (seenEdges.has(edge.cuid)) {
        ctx.addIssue({ code: "custom", path: ["edges", i, "cuid"], message: `edge "${edge.cuid}" is declared twice` });
      }
      seenEdges.add(edge.cuid);

      const from = byCuid.get(edge.from);
      const to = byCuid.get(edge.to);

      if (!from) {
        ctx.addIssue({ code: "custom", path: ["edges", i, "from"], message: `node "${edge.from}" does not exist` });
      } else if (from.out.state === "prohibit") {
        ctx.addIssue({
          code: "custom",
          path: ["edges", i, "from"],
          message: `node "${from.name}" of kind "${from.kind}" has no output — an edge out of it is impossible`,
        });
      }

      if (!to) {
        ctx.addIssue({ code: "custom", path: ["edges", i, "to"], message: `node "${edge.to}" does not exist` });
      } else if (to.in.state === "prohibit") {
        ctx.addIssue({
          code: "custom",
          path: ["edges", i, "to"],
          message: `node "${to.name}" of kind "${to.kind}" has no input — an edge into it is impossible`,
        });
      }

      // THE CONNECTION LAW, checked from the SOURCE side (see the asymmetries flagged at the table):
      // the target's kind must be named in the source's outgoing connections.
      if (from && to && from.out.connections && !from.out.connections.includes(to.kind)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", i],
          message:
            `a node of kind "${from.kind}" may only lead into ${from.out.connections.join(" | ")} — ` +
            `"${to.name}" is a "${to.kind}"`,
        });
      }

      if (edge.from === edge.to) {
        ctx.addIssue({ code: "custom", path: ["edges", i], message: "an edge cannot lead a node into itself" });
      }

      // An edge is shown only when BOTH its ends are shown: a line to a node nobody sees is a lie.
      if (edge.state === "visible" && from && to && (from.state === "hidden" || to.state === "hidden")) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", i, "state"],
          message: "an edge cannot be visible while one of its ends is hidden",
        });
      }
    });

    // A REQUIRED port must actually carry an edge — but ONLY for a VISIBLE node. A hidden node is a
    // transparent pipe: its function does not run and it may stand unwired (that is how a frozen template
    // ships, with every node hidden). An OPTIONAL port may always stand unwired — that is exactly what a
    // connector's outward side is for: its counterpart lives in another automation, outside this graph.
    //
    // 🔒 ИСКЛЮЧЕНИЕ НЕ РАСПРОСТРАНЯЕТСЯ НА ЛОГИКУ (шаг 311.8, требование владельца). Скрытая ДВЕРЬ имеет
    // право стоять несвязанной — это отгружаемая форма шаблона. Скрытый ЛОГИЧЕСКИЙ узел такого права не
    // имеет: узел, который ничего не решает и никуда не ведёт, выглядит на холсте живым, а исполняться не
    // будет никогда. Поэтому для `transform` и условий требование ребра действует В ЛЮБОМ СОСТОЯНИИ.
    const decidesFlow = (kind: string) => (KINDS_NEEDING_VALIDATOR as readonly string[]).includes(kind);
    nodes.forEach((node) => {
      if (node.state !== "visible" && !decidesFlow(node.kind)) return;
      const wiredIn = graph.edges.some((e) => e.to === node.cuid);
      const wiredOut = graph.edges.some((e) => e.from === node.cuid);
      if (node.in.state === "required" && !wiredIn) {
        ctx.addIssue({ code: "custom", path: ["nodes"], message: `node "${node.name}" requires an incoming edge and has none` });
      }
      if (node.out.state === "required" && !wiredOut) {
        ctx.addIssue({ code: "custom", path: ["nodes"], message: `node "${node.name}" requires an outgoing edge and has none` });
      }
    });

    // The mandatory set of kinds is no longer stated here: it is the groups' own law (GROUP_POLICY —
    // deletion "forbidden" ⇒ every allowed kind stays present). One law, one place.
  });

// COMPONENTS — which tabs the automation has and what state each one is in.
//
// Presence is ONE field, not two ("present" + "expanded"): two fields can contradict each other
// (absent yet expanded), one cannot.
//   absent    — not present on the page;
//   collapsed — present, folded into an accordion;
//   expanded  — present, open.
// `name` must match a folder name in `_components/` — that is how the router finds the tab's code.
export const PresenceSchema = z.enum(["absent", "collapsed", "expanded"]);

// AN ENTITY INSIDE A TAB — a single calendar inside the calendar tab, a single analytics inside the
// analytics tab. A tab is a kind; an entity is one concrete thing of that kind, and there may be many.
//
// `data` holds the entity's intermediate settings — the enumeration of what will be created for it
// (as a table would hold its column names and their types). Its shape is deliberately OPEN for now:
// it will be pinned down per component kind.
export const EntitySchema = z
  .object({
    cuid: CuidSchema,
    name: z.string().min(1),
    // Human/owner caption for the component object — distinct from `info` (the AI brief). May be empty.
    description: z.string(),
    ...buildRecord,
    data: z.record(z.string(), z.unknown()),
  })
  .strict();

// SINGLETON TABS (owner's law 2026-07-25). Some tabs hold a single thing that CANNOT meaningfully be
// duplicated: one object storage, one vector memory, one app-pages section. Their core carries ONE `entity`
// object, NOT an `entities` array — the model itself forbids a second object (no "add another storage").
// Every other tab (dashboard, calendar, map, control-panel, cron, analytics, database …) carries the
// `entities` ARRAY: it can legitimately hold many.
export const SINGLETON_TABS = ["storage", "vector-memory", "app-pages"] as const;
export const isSingletonTab = (name: string): boolean => (SINGLETON_TABS as readonly string[]).includes(name);

export const TabSchema = z
  .object({
    systemInstructionName: instructionName("tab"),
    name: z.string().min(1),
    // Human/owner caption for the section — distinct from `info` (the AI brief). May be empty.
    description: z.string(),
    presence: PresenceSchema,
    ...buildRecord,
    // EXACTLY ONE of the two, decided by the tab kind and checked below: a singleton tab carries `entity`
    // (one object), a multi tab carries `entities` (an array). Both optional in the object so `.strict()`
    // does not reject the lawful shape; the refinement makes the wrong one an error.
    entities: z.array(EntitySchema).optional(),
    entity: EntitySchema.optional(),
  })
  .strict()
  .superRefine((tab, ctx) => {
    if (isSingletonTab(tab.name)) {
      if (tab.entity === undefined) {
        ctx.addIssue({ code: "custom", path: ["entity"], message: `tab "${tab.name}" is a singleton — it must carry ONE "entity" object` });
      }
      if (tab.entities !== undefined) {
        ctx.addIssue({ code: "custom", path: ["entities"], message: `tab "${tab.name}" is a singleton — it carries a single "entity", never an "entities" array` });
      }
      return;
    }
    // A multi tab: the array is mandatory, a lone `entity` is forbidden, and cuids must be unique.
    if (tab.entity !== undefined) {
      ctx.addIssue({ code: "custom", path: ["entity"], message: `tab "${tab.name}" carries an "entities" array, not a single "entity"` });
    }
    if (tab.entities === undefined) {
      ctx.addIssue({ code: "custom", path: ["entities"], message: `tab "${tab.name}" must carry an "entities" array` });
      return;
    }
    const seen = new Set<string>();
    tab.entities.forEach((entity, i) => {
      if (seen.has(entity.cuid)) {
        ctx.addIssue({ code: "custom", path: ["entities", i, "cuid"], message: `entity "${entity.cuid}" is declared twice` });
      }
      seen.add(entity.cuid);
    });
  });

export const ComponentsSchema = z
  .object({
    systemInstructionName: instructionName("components"),
    tabs: z.array(TabSchema),
  })
  .strict();

// USE CASES — the FOURTH object of the core, and the one an automation is actually defined by. A case is
// the owner's scenario in his own words; the set of cases must be enough, on its own, to build the
// automation. `number` is what the owner refers to out loud ("in case 02, change …"); `status` walks the
// case from a fresh idea to something in use.
export const UseCaseStatusSchema = z.enum(["new", "in-development", "in-use"]);

export const UseCaseSchema = z
  .object({
    cuid: CuidSchema,
    number: z.number().int().positive(),
    // TITLE — a short name for the case (v1 parity, step 298). The use-cases panel shows it next to the
    // number; `text` stays the full description. Two fields, exactly as the owner's panel expects them.
    title: z.string().min(1, "a case needs a short title"),
    text: z.string().min(1, "a case without text is not a case"),
    status: UseCaseStatusSchema,
  })
  .strict();

// The use cases as a WHOLE carry their own warnings — the place where the agent reports a CONFLICT: two
// cases contradicting each other so plainly that building is impossible. Such a conflict belongs to no
// single case (each one is fine on its own), so it has nowhere else to live.
export const UseCasesSchema = z
  .object({
    systemInstructionName: instructionName("useCases"),
    warnings: z.array(WarningSchema),
    cases: z.array(UseCaseSchema),
    // REVIEW SIGNATURE (step 298, review gate) — the signature of the case set the owner LAST CONFIRMED.
    // Empty = never reviewed. Any add/edit/delete changes the current set's signature, so it no longer
    // matches and the gate asks the owner to read and confirm again (step 231's rule, now derived from the
    // core instead of a v1 server flag). Optional with a default so older cores stay valid.
    reviewedSignature: z.string().default(""),
  })
  .strict()
  .superRefine((useCases, ctx) => {
    const seenCuid = new Set<string>();
    const seenNumber = new Set<number>();
    useCases.cases.forEach((useCase, i) => {
      if (seenCuid.has(useCase.cuid)) {
        ctx.addIssue({ code: "custom", path: ["cases", i, "cuid"], message: `case "${useCase.cuid}" is declared twice` });
      }
      seenCuid.add(useCase.cuid);
      if (seenNumber.has(useCase.number)) {
        ctx.addIssue({ code: "custom", path: ["cases", i, "number"], message: `case number ${useCase.number} is used twice — the owner refers to cases by number` });
      }
      seenNumber.add(useCase.number);
    });
  });

// ─── HISTORY — the fifth object of the core ─────────────────────────────────────────────────────────
// What has been done to this automation, version by version. A version is one round of work: when it
// happened, HOW MUCH was touched (the plain count of nodes and components created, updated or deleted),
// and a short account of what changed. The summary is capped: it is a note for a human and a model, not a
// changelog to hide a wall of text in.
const SUMMARY_LIMIT = 500;
const DATE_FORMAT = /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/; // dd-mm-yyyy hh:mm:ss

export const VersionSchema = z
  .object({
    cuid: CuidSchema,
    number: z.number().int().positive(),
    createdAt: z.string().regex(DATE_FORMAT, "the date is dd-mm-yyyy hh:mm:ss"),
    objectsTouched: z.number().int().nonnegative(),
    summary: z.string().min(1, "a version without an account of it is not a version").max(SUMMARY_LIMIT, `the summary must be at most ${SUMMARY_LIMIT} characters`),
  })
  .strict();

export const HistorySchema = z
  .object({
    systemInstructionName: instructionName("history"),
    versions: z.array(VersionSchema),
  })
  .strict()
  .superRefine((history, ctx) => {
    const seenCuid = new Set<string>();
    const seenNumber = new Set<number>();
    history.versions.forEach((version, i) => {
      if (seenCuid.has(version.cuid)) {
        ctx.addIssue({ code: "custom", path: ["versions", i, "cuid"], message: `version "${version.cuid}" is declared twice` });
      }
      seenCuid.add(version.cuid);
      if (seenNumber.has(version.number)) {
        ctx.addIssue({ code: "custom", path: ["versions", i, "number"], message: `version number ${version.number} is used twice` });
      }
      seenNumber.add(version.number);
    });
  });

// THE CORE as a whole — five objects, plus the laws that bind them.
//
// THE LIFECYCLE LAW. `lifecycle` lives in the passport and NOWHERE else (one fact, one place), and it
// governs the whole graph:
//   frozen-template — the template as it is born: EVERY node is hidden, nothing runs, the interface reads
//                     this state to keep its controls locked;
//   real-project    — after the first development iteration: the automation has at least one visible node
//                     and at least one use case, because a real project is defined by its cases.
export const AutomationSchema = z
  .object({
    passport: PassportSchema,
    graph: GraphSchema,
    components: ComponentsSchema,
    useCases: UseCasesSchema,
    history: HistorySchema,
  })
  .strict()
  .superRefine((automation, ctx) => {
    const { lifecycle } = automation.passport;
    const nodes = allNodes(automation.graph.nodes);
    const visible = nodes.filter((n) => n.state === "visible");

    if (lifecycle === "frozen-template" && visible.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["graph", "nodes"],
        message: `a frozen template shows nothing: ${visible.length} node(s) are visible while lifecycle is "frozen-template"`,
      });
    }
    if (lifecycle === "real-project" && nodes.length > 0 && visible.length === 0) {
      ctx.addIssue({ code: "custom", path: ["graph", "nodes"], message: "a real project must have at least one visible node" });
    }
    // A WAY IN AND A WAY OUT (owner, 2026-07-22). "At least one visible node" is not enough: an automation
    // whose visible nodes are all middle ones can be neither triggered nor read — it is born dead. So the
    // moment the template becomes a real project, at least one door on EACH side must be open.
    //
    // This is the machine half of the launch law. Its human half lives in the system instructions
    // (`passport.md` §6.1, `group.input.md`, `group.output.md`): the agent REVEALS the channels the owner
    // named in the use cases, and falls back to control-panel in / dashboard out when he named none.
    // The instruction tells the agent what to do; this law makes forgetting it impossible.
    //
    // A connector counts as a door: a chained automation legitimately receives from — or hands to — a
    // neighbour instead of a channel of its own.
    // 🔒 ТОСТ ВСЕГДА ОТКРЫТ (шаг 311.8). Прочие выходы строитель прячет по своему усмотрению; тост —
    // нет: он единственный, кто доносит до человека ИСХОД прогона, включая провал. Автоматизация, где
    // тост спрятан, умеет молча падать — а именно это состояние закон и убирает.
    if (lifecycle === "real-project" && nodes.length > 0) {
      const toast = automation.graph.nodes.groups.output.nodes.find((n) => n.ioType === "toast");
      if (!toast) {
        ctx.addIssue({ code: "custom", path: ["graph", "nodes", "groups", "output"], message: "the toast output is missing — it is the one channel that always carries the run's outcome, including a failure" });
      } else if (toast.state !== "visible") {
        ctx.addIssue({ code: "custom", path: ["graph", "nodes", "groups", "output"], message: "the toast output cannot be hidden: an automation that can fail silently is exactly what this law removes" });
      }
    }

    if (lifecycle === "real-project" && nodes.length > 0) {
      for (const side of ["input", "output"] as const) {
        const open = automation.graph.nodes.groups[side].nodes.filter((n) => n.state === "visible");
        if (open.length === 0) {
          ctx.addIssue({
            code: "custom",
            path: ["graph", "nodes", "groups", side],
            message:
              `a real project needs at least one visible ${side} — otherwise it can never ` +
              `${side === "input" ? "be triggered" : "deliver a result"}. Reveal the ${side} channel the owner asked ` +
              `for in the use cases, or the default one (${side === "input" ? "control-panel" : "dashboard"}).`,
          });
        }
      }
    }
    if (lifecycle === "real-project" && automation.useCases.cases.length === 0) {
      ctx.addIssue({ code: "custom", path: ["useCases", "cases"], message: "a real project is defined by its use cases — there must be at least one" });
    }
    // 🔒 У ЗАМОРОЖЕННОГО ШАБЛОНА КЕЙСОВ БЫТЬ НЕ МОЖЕТ (шаг 315, решение владельца 2026-08-02).
    // Кейс несёт ОТЛИЧИТЕЛЬНОЕ — предметную область и сценарий КОНКРЕТНОГО владельца. У шаблона владельца
    // ещё нет, назначения тоже: клон рождается с пустым набором, и именно пустота открывает Quiz. Кейс,
    // уехавший в шаблон, приезжает к каждому клиенту как чужой сценарий — ровно так шаблон и оброс
    // осадком Telegram Notes. Симметрично закону выше: реальному проекту кейс обязателен, шаблону запрещён.
    if (lifecycle === "frozen-template" && automation.useCases.cases.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["useCases", "cases"],
        message: `a frozen template carries NO use cases: it has no owner and no purpose yet — ${automation.useCases.cases.length} case(s) declared. A case is the distinctive scenario of ONE owner; shipping it in the template hands every client somebody else's scenario`,
      });
    }
    // A real project was made by somebody; the untouched template was made by nobody yet.
    if (lifecycle === "real-project" && !automation.passport.author.trim()) {
      ctx.addIssue({ code: "custom", path: ["passport", "author"], message: "a real project must name its author — the id of the user who created it" });
    }
    // A real project has a stable global identity; the untouched template has none until it is born.
    if (lifecycle === "real-project" && !UUID_FORMAT.test(automation.passport.uuid)) {
      ctx.addIssue({ code: "custom", path: ["passport", "uuid"], message: "a real project must carry a valid v4 uuid — its stable global identity for accumulation" });
    }
  });

// Editor types — inferred from the schemas, never written by hand.
export type Cuid = z.infer<typeof CuidSchema>;
export type AutomationType = z.infer<typeof AutomationTypeSchema>;
export type Lifecycle = z.infer<typeof LifecycleSchema>;
export type ParallelPage = z.infer<typeof ParallelPageSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type FracteraPro = z.infer<typeof FracteraProSchema>;
export type Passport = z.infer<typeof PassportSchema>;
export type State = z.infer<typeof StateSchema>;
export type Info = z.infer<typeof InfoSchema>;
export type InputChannel = z.infer<typeof InputChannelSchema>;
export type OutputChannel = z.infer<typeof OutputChannelSchema>;
export type PortStateType = z.infer<typeof PortStateSchema>;
export type PortTarget = z.infer<typeof PortTargetSchema>;
export type NodePort = z.infer<typeof PortSchema>;
export type NodeKind = z.infer<typeof NodeKindSchema>;
export type NodeFunction = z.infer<typeof NodeFunctionSchema>;
export type CapabilityType = z.infer<typeof CapabilityTypeSchema>;
export type CapabilityStatus = z.infer<typeof CapabilityStatusSchema>;
export type CapabilityOutcome = z.infer<typeof CapabilityOutcomeSchema>;
export type CapabilityAttempt = z.infer<typeof CapabilityAttemptSchema>;
export type Capability = z.infer<typeof CapabilitySchema>;
export type Node = z.infer<typeof NodeSchema>;
export type Edge = z.infer<typeof EdgeSchema>;
export type Permission = z.infer<typeof PermissionSchema>;
export type KindPolicyType = z.infer<typeof KindPolicySchema>;
export type GroupName = z.infer<typeof GroupNameSchema>;
export type Nodes = z.infer<typeof NodesSchema>;
export type NodeGroup = Nodes["groups"]["input"];
export type Graph = z.infer<typeof GraphSchema>;
export type Presence = z.infer<typeof PresenceSchema>;
export type BuildStatus = z.infer<typeof BuildStatusSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type Tab = z.infer<typeof TabSchema>;

// THE ENTITY READER — uniform access to a tab's entities regardless of its kind: a multi tab returns its
// `entities` array; a singleton tab returns its lone `entity` wrapped in a one-element array; neither set
// returns []. Every reader goes through this, so the array/object split stays invisible to consumers, and
// a writer that mutates the returned entity in place gets the SAME reference (for a singleton, `tab.entity`
// itself). One place holds the fallback — nowhere else repeats `tab.entities ?? [tab.entity]`.
export function entitiesOf(tab: Tab): Entity[] {
  return tab.entities ?? (tab.entity ? [tab.entity] : []);
}
export type Components = z.infer<typeof ComponentsSchema>;
export type Warning = z.infer<typeof WarningSchema>;
export type EnvKeyStatus = z.infer<typeof EnvKeyStatusSchema>;
export type EnvKey = z.infer<typeof EnvKeySchema>;
export type UseCaseStatus = z.infer<typeof UseCaseStatusSchema>;
export type UseCase = z.infer<typeof UseCaseSchema>;
export type UseCases = z.infer<typeof UseCasesSchema>;
export type Sharing = z.infer<typeof SharingSchema>;
export type Version = z.infer<typeof VersionSchema>;
export type History = z.infer<typeof HistorySchema>;
export type Automation = z.infer<typeof AutomationSchema>;
