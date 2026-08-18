// Страница продукта — всё, чем продукт является, на одном экране (2026-08-18).
//
// 🔒 ПЕРЕПИСАНА ЦЕЛИКОМ по приговору владельца: прежний экран показывал четыре
// строки записи и три ссылки, а вопросы, ответы, разговор Quiz, кейсы, шаги и
// страницы продукта — всё, что лежит в досье, — не показывал вовсе. Отдельной
// вкладки кейсов больше нет: продукт не делится на страницы, он один.
//
// 🔒 СВЁРНУТЫЕ СЕКЦИИ, А НЕ ПРОСТЫНЯ. Открытыми стоят только шапка и полоса фаз —
// ответ на вопрос «где мы». Остальное человек раскрывает сам, и каждый заголовок
// несёт счётчик: закрытая секция обязана отвечать, есть ли внутри что-нибудь.
//
// 🔒 ОПРОС И QUIZ ОДНОРАЗОВЫЕ (владелец 2026-08-18). Ответив на вопросы и пройдя
// разговор, владелец закрывает обе двери: снова открыть их можно только «Начать
// сначала», и та сперва складывает всё в архив. Новый кейс дописывается руками —
// кнопкой в секции кейсов. Причина в том, что вопросы и разговор — фундамент: их
// правка задним числом делает уже подтверждённые кейсы ответом не на то, что
// спрашивали.
//
// Динамическая: досье живое, и его меняют островки этой же страницы.

import { notFound } from "next/navigation";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../../_components/page-shell";
import { readProduct, readQuiz, productFiles, productPaths } from "@/lib/product-store";
import { PROJECT_TYPES, isProjectTypeId } from "@/lib/project-types";
import { DESCRIPTION_MAX } from "@/lib/products-config";
import { H1, H2, P, Muted, Small, Mono, Section } from "../_components/type";
import { PhaseBar, phaseTone } from "./_components/phase-bar";
import { StepsTable } from "./_components/steps-table";
import { PagesTree, pagesTreeOf } from "./_components/pages-tree";
import { ProductActions } from "../_components/product-actions.client";
import { ProductCardActions } from "../_components/product-card-actions.client";
import { IntakeEditor } from "../_components/intake-editor.client";
import { AddCase } from "../_components/add-case.client";
import { CasesBoard } from "../_components/cases-board.client";
import { QuizLauncher } from "../_components/quiz-launcher.client";
import { ResetQuiz } from "../_components/reset-quiz.client";
import { IntroSetup } from "../_components/intro-setup.client";
import { IntroQuestions } from "../_components/intro-questions.client";
import { ProjectTypePicker } from "../_components/project-type-picker.client";

export const dynamic = "force-dynamic";

const BADGE = {
  sky: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
} as const;

export default async function ProductPage(
  { params }: { params: Promise<{ lang: string; id: string }> },
) {
  const { lang, id } = await params;
  const s = getAdminStrings(lang);
  const u = s.useCases;
  const p = s.projectPicker;
  const t = s.productPage;

  const product = readProduct(id);
  if (!product) notFound();

  const files = productFiles(product.id);
  const roots = productPaths(product);
  const quiz = readQuiz(product.id);
  const confirmed = product.cases.filter((c) => c.confirmed).length;
  const doneSteps = product.steps.filter((x) => x.status === "done").length;
  const openWork = product.steps.some((x) => x.kind === "work" && x.status !== "done" && x.status !== "cancelled");

  // Двери опроса и Quiz: открыты, пока фундамент не заложен. Закрылись — об этом
  // сказано словами, а кнопки просто нет: серая кнопка с подсказкой «нельзя»
  // заставляет человека спорить с интерфейсом.
  const intakeOpen = product.intake.questions.length === 0 || !product.intake.seed;
  const quizOpen = Boolean(product.intake.seed) && product.cases.length === 0;

  const chosen = isProjectTypeId(product.type) ? s.projectTypes[product.type] : null;
  const typeCards = PROJECT_TYPES.map((tid) => ({ id: tid, ...s.projectTypes[tid] }));
  const pickerLabels = {
    lead: p.lead, hint: p.hint,
    dialogExamples: p.dialogExamples, dialogSignals: p.dialogSignals, dialogQuestions: p.dialogQuestions,
    choose: p.choose, cancel: p.cancel, saving: p.saving,
    chosen: p.chosen, change: p.change, chosenHint: p.chosenHint, started: p.started, failed: u.failed,
  };

  return (
    <PageShell
      lang={lang}
      slug="products"
      s={s}
      params={{ product: product.title }}
      title={product.title}
      hint={t.phases[product.phase].label}
    >
      {/* ── ШАПКА ─────────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <H1>{product.title}</H1>
            <p className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${BADGE[phaseTone(product.phase, product.stage)]}`}>
                {t.phases[product.phase].label} · {t.stages[product.stage]}
              </span>
              <Small>{chosen?.title ?? product.type}</Small>
              <Mono>{product.route || "—"}</Mono>
              <Small>{product.published ? t.publishedYes : t.publishedNo}</Small>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <ProductActions
              productId={product.id}
              published={product.published}
              // В анализ переводят, когда работа закрыта: предлагать это посреди
              // незакрытых шагов значит предлагать изучать незаконченное.
              canAnalyse={product.phase !== "analysis" && !openWork && product.cases.length > 0}
              labels={{
                publish: t.publish, unpublish: t.unpublish,
                publishedYes: t.publishedYes, publishedNo: t.publishedNo,
                toAnalysis: t.toAnalysis, phaseMoved: t.phaseMoved, phaseFailed: t.phaseFailed,
                saving: t.saving, failed: t.failed,
              }}
            />
            <ProductCardActions
              productId={product.id}
              title={product.title}
              description={product.description ?? ""}
              casesCount={product.cases.length}
              descriptionMax={DESCRIPTION_MAX}
              labels={{
                editTitle: p.editTitle, editAction: p.editAction, editName: p.editName,
                editNameHint: p.editNameHint, editDesc: p.editDesc, editDescHint: p.editDescHint,
                editSave: p.editSave, editCancel: p.editCancel, editSaved: p.editSaved,
                editFailed: p.editFailed, editNameRequired: p.editNameRequired,
                delAction: p.delAction, delTitle: p.delTitle, delDanger: p.delDanger,
                delGoes: p.delGoes, delStays: p.delStays, delConfirm: p.delConfirm,
                delWorking: p.delWorking, delDone: p.delDone, delFailed: p.delFailed,
                delArchive: p.delArchive,
              }}
            />
          </div>
        </div>

        {product.description && <P className="mt-3">{product.description}</P>}
      </div>

      {/* ── ПОЛОСА ФАЗ ────────────────────────────────────────────────────── */}
      <div className="mt-3 rounded-lg border border-border bg-card px-4 py-4">
        <PhaseBar product={product} ui={{ phases: t.phases, stages: t.stages }} />
      </div>

      {/* ── ОПРОС: пока открыт — сам опрос, потом просмотр и правка ответов ── */}
      <Section
        title={t.sectionIntake}
        hint={t.sectionIntakeHint}
        count={product.intake.questions.length ? `${product.intake.questions.length}` : ""}
        open={intakeOpen}
      >
        {product.intake.questions.length === 0 ? (
          <>
            <Muted className="mb-3">{t.intakeEmpty}</Muted>
            <ProjectTypePicker
              types={typeCards}
              chosen={chosen ? { id: product.type, title: chosen.title } : null}
              labels={pickerLabels}
            />
            {chosen && (
              <div className="mt-3">
                <IntroSetup
                  key={`${product.id}:${product.type}`}
                  suggested={chosen.questions}
                  lang={lang}
                  labels={{
                    lead: u.setupLead, hint: u.setupHint, skip: u.setupSkip, add: u.setupAdd,
                    removeOne: u.setupRemove, restore: u.setupRestore, restored: u.setupRestored,
                    start: u.setupStart, saving: u.saving, failed: u.failed,
                    atLeastOne: u.setupAtLeastOne, placeholder: u.setupPlaceholder,
                    voiceFor: u.setupVoice, voiceClose: u.setupVoiceClose, count: u.setupCount,
                    more: u.setupMore, moreHint: u.setupMoreHint, fewer: u.setupFewer,
                  }}
                />
              </div>
            )}
          </>
        ) : !product.intake.seed ? (
          <IntroQuestions
            key={`${product.id}:${product.intake.questions.join("|")}`}
            questions={product.intake.questions}
            lang={lang}
            labels={{
              progress: u.introProgress, placeholder: u.introPlaceholder,
              next: u.next, back: u.back, finish: u.introFinish, saving: u.saving,
              saved: u.introSaved, failed: u.failed, tooShort: u.introTooShort, voiceHint: u.voiceHint,
            }}
          />
        ) : (
          <>
            <ol className="space-y-2.5">
              {product.intake.questions.map((question, i) => (
                <li key={`${i}-${question.slice(0, 24)}`}>
                  <P><span className="mr-1.5 text-[11px] text-muted-foreground">{i + 1}.</span>{question}</P>
                  <Muted className="mt-0.5 border-l-2 border-border pl-2.5">
                    {product.intake.answers[i]?.trim() || t.intakeNoAnswer}
                  </Muted>
                </li>
              ))}
            </ol>
            <p className="mt-3 flex flex-wrap items-center gap-2">
              <IntakeEditor
                productId={product.id}
                questions={product.intake.questions}
                answers={product.intake.answers}
                labels={{
                  action: t.intakeEdit, title: t.sectionIntake,
                  question: t.intakeQuestion, answer: t.intakeAnswer,
                  save: p.editSave, cancel: p.editCancel, saved: p.editSaved,
                  saving: t.saving, failed: t.failed,
                }}
              />
              <Small>{t.intakeClosed}</Small>
            </p>
          </>
        )}
      </Section>

      {/* ── QUIZ ──────────────────────────────────────────────────────────── */}
      <Section
        title={t.sectionQuiz}
        hint={t.sectionQuizHint}
        count={quiz.length ? `${quiz.length} ${t.quizTurns}` : ""}
        open={quizOpen}
      >
        {quizOpen && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <QuizLauncher
              lang={lang}
              label={u.quizStart}
              labels={{
                title: u.quizTitle, close: u.close, modelBanner: u.modelBanner,
                designer: u.designer, placeholder: u.quizPlaceholder, answer: u.answer,
                auto: u.auto, autoAgain: u.autoAgain, autoWriting: u.autoWriting,
                autoPaused: u.autoPaused, autoAssumption: u.autoAssumption, autoAccepted: u.autoAccepted,
                pause: u.pause, keepText: u.keepText, create: u.create, creating: u.creating, or: u.or,
                ready: u.ready, hint: u.quizHint, added: u.added, failed: u.failed,
                noKey: u.noKey, noSeed: u.noSeed, scrollDown: u.scrollDown,
                errKeyRejected: u.errKeyRejected, errQuota: u.errQuota, errRateLimit: u.errRateLimit,
                errModelMissing: u.errModelMissing, errUpstream: u.errUpstream,
                errNoCases: u.errNoCases, errSaveFailed: u.errSaveFailed,
              }}
            />
            <Small>{u.quizStartHint}</Small>
          </div>
        )}

        {quiz.length === 0 ? <Muted>{t.quizEmpty}</Muted> : (
          <>
            {!quizOpen && <Small className="mb-2 block">{t.quizClosed}</Small>}
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {quiz.map((turn, i) => (
                <div key={i} className={turn.role === "user" ? "" : "border-l-2 border-primary/40 pl-2.5"}>
                  <Small>{turn.role === "user" ? u.answer : u.designer}</Small>
                  <P className="whitespace-pre-wrap">{turn.content}</P>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ── КЕЙСЫ ─────────────────────────────────────────────────────────── */}
      <Section
        title={t.sectionCases}
        hint={t.sectionCasesHint}
        count={product.cases.length ? `${product.cases.length} · ${confirmed}` : ""}
        open={product.cases.length > 0}
      >
        {product.cases.length === 0 ? <Muted className="mb-3">{t.casesEmpty}</Muted> : (
          <CasesBoard
            cases={product.cases.map((c) => ({
              id: c.slug, title: c.title, summary: c.summary,
              status: c.confirmed ? "confirmed" : "draft", confirmedAt: c.confirmedAt,
            }))}
            lang={lang}
            product={product.title}
            nextSteps={{
              title: u.nextTitle, stepCreated: u.nextStepCreated,
              whereTitle: u.nextWhereTitle, steps: u.nextSteps,
              sayTitle: u.nextSayTitle, sayProduct: u.nextSayProduct, sayStep: u.nextSayStep,
              copied: u.nextCopied, toGithub: u.nextToGithub, toEnv: u.nextToEnv, close: u.close,
            }}
            labels={{
              draft: u.draft, confirmed: u.confirmed, confirm: u.confirm, unconfirm: u.unconfirm,
              confirmAll: u.confirmAll, confirmedAll: u.confirmedAll,
              edit: u.edit, save: u.save, saving: u.saving, cancel: u.cancel,
              remove: u.remove, removeConfirm: u.removeConfirm,
              remarkTitle: u.remarkTitle, remarkPlaceholder: u.remarkPlaceholder,
              rewrite: u.rewrite, rewriting: u.rewriting,
              failed: u.failed, savedCase: u.savedCase, noKey: u.noKey,
              titleLabel: u.titleLabel, summaryLabel: u.summaryLabel,
              errKeyRejected: u.errKeyRejected, errQuota: u.errQuota, errRateLimit: u.errRateLimit,
              errModelMissing: u.errModelMissing, errUpstream: u.errUpstream,
            }}
          />
        )}

        {/* Ручное добавление доступно ВСЕГДА — в этом и смысл: двери опроса и Quiz
            закрыты, а продукт живёт, и седьмой сценарий выясняется через неделю. */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AddCase
            productId={product.id}
            labels={{
              action: t.addCase, title: t.addCaseTitle, hint: t.addCaseHint,
              name: t.addCaseName, summary: t.addCaseSummary,
              save: t.addCaseSave, cancel: t.addCaseCancel, saved: t.addCaseSaved,
              saving: t.saving, failed: t.failed,
            }}
          />
          <ResetQuiz
            labels={{
              action: u.resetAction, title: u.resetTitle, body: u.resetBody, counts: u.resetCounts,
              safeDev: u.resetSafeDev, archive: u.resetArchive, cancel: u.resetCancel,
              confirm: u.resetConfirm, working: u.resetWorking, done: u.resetDone, failed: u.failed,
            }}
            counts={{
              seedAnswers: product.intake.answers.filter(Boolean).length,
              turns: quiz.length,
              cases: product.cases.length,
              confirmed,
            }}
          />
        </div>
      </Section>

      {/* ── ШАГИ ──────────────────────────────────────────────────────────── */}
      <Section
        title={t.sectionSteps}
        hint={t.sectionStepsHint}
        count={product.steps.length ? `${product.steps.length} · ${doneSteps}` : ""}
      >
        <StepsTable
          product={product}
          ui={{
            empty: t.stepsEmpty, number: t.stepNumber, title: t.stepTitle, status: t.stepStatus,
            importance: t.stepImportance, cases: t.stepCases, plan: t.stepPlan, result: t.stepResult,
            saved: t.stepSaved, failed: t.failed, statuses: t.stepStatuses,
          }}
        />
      </Section>

      {/* ── ДЕРЕВО СТРАНИЦ ────────────────────────────────────────────────── */}
      <Section
        title={t.sectionPages}
        hint={t.sectionPagesHint}
        count={(() => { const n = pagesTreeOf(product); return n.length ? `${n.length}` : ""; })()}
      >
        <PagesTree
          product={product}
          nodes={pagesTreeOf(product)}
          ui={{
            empty: t.pagesEmpty, built: t.pageBuilt, planned: t.pagePlanned, extra: t.pageExtra,
            purpose: t.pagePurpose, steps: t.pageSteps, pagesRoot: t.rootPages,
            cases: t.pageCases, noCases: t.pageNoCases,
          }}
        />
      </Section>

      {/* ── ФАЙЛЫ, КОРНИ И ШАГИ, КОТОРЫМИ ЭТО ПОСТРОЕНО ───────────────────── */}
      <Section title={t.sectionRoots} hint={t.sectionRootsHint}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          {[
            [t.rootDossier, files.dossier],
            [t.rootQuiz, files.quiz],
            [t.rootPages, roots.pages],
            [t.rootLogic, roots.lib],
            [t.rootTables, `${roots.tablePrefix}*`],
          ].map(([label, value]) => (
            <div key={label} className="col-span-2 grid grid-cols-[auto_1fr] gap-x-4">
              <dt className="text-[13px] text-muted-foreground">{label}</dt>
              <dd><Mono className="break-all">{value}</Mono></dd>
            </div>
          ))}
        </dl>

        {/* 🔒 ЧЕМ ЭТО ПОСТРОЕНО — ЧАСТЬ ОТВЕТА «ГДЕ ЖИВЁТ ПРОДУКТ». Файлы говорят,
            куда смотреть; шаги — почему там оказалось именно это. Список короткий:
            номер и имя, без планов и результатов, — те раскрываются в своей секции.

            🔒 ИМЯ ШАГА — ЧИСЛО, ТИРЕ И ШЕСТЬ-ВОСЕМЬ СЛОВ (владелец 2026-08-18).
            Короче — имя не говорит, что сделано («правка», «фикс»); длиннее — его
            перестают читать целиком и узнают шаг по номеру, то есть имя перестаёт
            работать. Слов именно столько, сколько нужно назвать действие и предмет:
            «12 — build minimal course skeleton with lesson list». */}
        {product.steps.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 text-[13px] font-medium text-foreground">{t.rootStepsTitle}</p>
            <ul className="space-y-1">
              {[...product.steps].sort((a, b) => a.number - b.number).map((step) => (
                <li key={step.number} className="flex flex-wrap items-baseline gap-x-2">
                  <Mono className="shrink-0">{step.number} —</Mono>
                  <span className="text-[13px] leading-snug text-foreground">{step.title}</span>
                  <Small>{t.stepStatuses[step.status] ?? step.status}</Small>
                </li>
              ))}
            </ul>
            <p className="mt-2"><Small>{t.rootStepsNaming}</Small></p>
          </div>
        )}
      </Section>
    </PageShell>
  );
}
