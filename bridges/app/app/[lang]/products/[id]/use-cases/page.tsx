// Пользовательские кейсы продукта — гейт разработки и Quiz, который его проходит.
//
// 🔒 ПЕРЕЕХАЛО СЮДА 2026-08-18 из `doc-use-cases`. Там эта работа лежала среди
// документов и выбирала продукт строкой запроса `?product=p2`. Теперь продукт —
// сегмент адреса, а страница принадлежит ему, а не общему документу.
//
// ЧЕТЫРЕ СОСТОЯНИЯ, и страница показывает ровно одно:
//   0. вопросы не утверждены → экран правки САМИХ вопросов;
//   1. вопросы есть, затравки нет → вводный опрос по ним, дальше пройти нельзя;
//   2. затравка есть, кейсов нет → приглашение в Quiz;
//   3. кейсы есть → доска: оранжевые ждут подтверждения, зелёные подтверждены.
//
// 🔒 ЭКРАН 0 СУЩЕСТВУЕТ ПОТОМУ, ЧТО ВОПРОС — ПОЛОВИНА ОТВЕТА. Семь вводных
// вопросов были зашиты в словарь и задавались одинаково магазину и клинике;
// неверный вопрос уводит человека описывать не тот продукт, и это выясняется
// только на кейсах, когда переписывать надо всё.
//
// Динамическая: и кейсы, и состояние гейта — живые.

import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, FolderOpen } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../../../_components/page-shell";
import { HelpDetails } from "../../../_components/help-details";
import { DocPopup } from "../../../_components/doc-popup.client";
import {
  listCases, useCasesGate, readSeed, readQuestions, resetPreview,
  useCasesPaths, migrateLegacyLayout,
} from "@/lib/use-cases-store";
import { PROJECT_TYPES, isProjectTypeId } from "@/lib/project-types";
import { findProduct } from "@/lib/products-config";
import { ProjectTypePicker } from "../../_components/project-type-picker.client";
import { ResetQuiz } from "../../_components/reset-quiz.client";
import { IntroSetup } from "../../_components/intro-setup.client";
import { IntroQuestions } from "../../_components/intro-questions.client";
import { QuizLauncher } from "../../_components/quiz-launcher.client";
import { CasesBoard } from "../../_components/cases-board.client";
import { MigrateLegacy } from "../../_components/migrate-legacy.client";

export const dynamic = "force-dynamic";

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

export default async function ProductUseCasesPage(
  { params }: { params: Promise<{ lang: string; id: string }> },
) {
  const { lang, id } = await params;
  const s = getAdminStrings(lang);
  const u = s.useCases;
  const p = s.projectPicker;

  const product = findProduct(id);
  if (!product) notFound();

  const pid = product.id;
  // Кейсы, написанные до появления продуктов, переезжают в папку продукта.
  migrateLegacyLayout(pid);
  const paths = useCasesPaths(pid);

  const { cases, legacy } = listCases(pid);
  const gate = useCasesGate(pid);
  const seed = readSeed(pid);
  // Утверждённые вопросы продукта. Их нет — владелец ещё не смотрел список, и
  // первым экраном идёт правка вопросов, а не ответы на чужие.
  const questions = readQuestions(pid);

  // 🔒 СТРУКТУРА ПРОДУКТА РЕШАЕТ, КАКИЕ СЕМЬ ВОПРОСОВ ПОКАЗАТЬ. Карточки
  // собираются ЗДЕСЬ, на сервере, и уезжают в островок пропсами: словарь панели —
  // 82 языка, ему в браузере не место.
  const chosenCard = isProjectTypeId(product.type) ? s.projectTypes[product.type] : null;
  const typeCards = PROJECT_TYPES.map((tid) => ({ id: tid, ...s.projectTypes[tid] }));
  const pickerLabels = {
    lead: p.lead, hint: p.hint,
    dialogExamples: p.dialogExamples, dialogSignals: p.dialogSignals, dialogQuestions: p.dialogQuestions,
    choose: p.choose, cancel: p.cancel, saving: p.saving,
    chosen: p.chosen, change: p.change, chosenHint: p.chosenHint,
    started: p.started,
    failed: u.failed,
  };

  // Есть ли вообще что сбрасывать. Кнопка «начать сначала» без единого ответа —
  // это предложение отменить то, чего нет.
  const counts = resetPreview(pid);
  const somethingToReset = Boolean(questions) || counts.seedAnswers > 0 || counts.turns > 0 || counts.cases > 0;

  // На каком этапе человек СЕЙЧАС — окно «как рождаются кейсы» подсвечивает его.
  // Считается по состоянию файлов проекта, а не по виду страницы. Ноль означает
  // «все четыре пройдены».
  const stage = !questions && !seed ? 1
    : !seed ? 2
    : cases.length === 0 ? 3
    : gate.kind !== "ready" ? 4
    : 0;

  const resetLabels = {
    action: u.resetAction, title: u.resetTitle, body: u.resetBody, counts: u.resetCounts,
    safeDev: u.resetSafeDev, archive: u.resetArchive, cancel: u.resetCancel,
    confirm: u.resetConfirm, working: u.resetWorking, done: u.resetDone, failed: u.failed,
  };

  const quizLabels = {
    title: u.quizTitle, close: u.close, modelBanner: u.modelBanner,
    designer: u.designer, placeholder: u.quizPlaceholder, answer: u.answer,
    auto: u.auto, autoAgain: u.autoAgain, autoWriting: u.autoWriting, autoPaused: u.autoPaused,
    autoAssumption: u.autoAssumption, autoAccepted: u.autoAccepted,
    pause: u.pause, keepText: u.keepText,
    create: u.create, creating: u.creating, or: u.or,
    ready: u.ready, hint: u.quizHint,
    added: u.added, failed: u.failed, noKey: u.noKey, noSeed: u.noSeed,
    scrollDown: u.scrollDown,
    errKeyRejected: u.errKeyRejected, errQuota: u.errQuota, errRateLimit: u.errRateLimit,
    errModelMissing: u.errModelMissing, errUpstream: u.errUpstream,
    errNoCases: u.errNoCases, errSaveFailed: u.errSaveFailed,
  };

  return (
    <PageShell
      lang={lang}
      slug="products"
      s={s}
      params={{ product: product.title, tab: u.tabCases }}
      title={`${u.tabCases} — ${product.title}`}
      hint={s.pages["products"].hint}
    >
      {/* Состояние гейта — первым, потому что это ответ на вопрос «можно ли уже
          начинать»; он же снимает или оставляет тревогу в меню. */}
      {gate.kind === "ready" ? (
        <p className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
          {fill(u.gateReady, { total: String(gate.total) })}
        </p>
      ) : (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {gate.kind === "missing"
            ? u.gateMissing
            : fill(u.gateUnconfirmed, { confirmed: String(gate.confirmed), total: String(gate.total) })}
        </p>
      )}

      {/* Проект прежнего формата: одиночный файл. Не игнорируем и не удаляем —
          предлагаем перенести, решение за человеком. */}
      {legacy && (
        <div className="mt-2">
          <MigrateLegacy labels={{ hint: u.legacyHint, action: u.legacyAction, done: u.legacyDone, failed: u.failed }} />
        </div>
      )}

      {/* «Начать сначала» стоит НАД экраном: человек, попавший в плохой опрос,
          ищет выход сразу, а не после того, как пролистает всё. */}
      {somethingToReset && (
        <div className="mt-3 flex justify-end">
          <ResetQuiz labels={resetLabels} counts={counts} />
        </div>
      )}

      {/* 🔒 ЭКРАН 0 ТОЛЬКО ДО ПЕРВОГО ОТВЕТА. Проект, где затравка уже написана,
          на правку вопросов не откатывается: спрашивать «какие вопросы задать» у
          того, кто на них ответил, — значит отменять его работу видом экрана. */}
      {!questions && !seed ? (
        <div className="mt-2">
          <ProjectTypePicker
            types={typeCards}
            chosen={chosenCard ? { id: product.type, title: chosenCard.title } : null}
            labels={pickerLabels}
          />

          {chosenCard && (
            <div className="mt-3">
              <IntroSetup
                // 🔒 КЛЮЧ ОБЯЗАТЕЛЕН: смена структуры не размонтирует редактор, и
                // без ключа на экране остались бы вопросы прежней структуры, а в
                // записи продукта — новая. Расходятся они молча до перезагрузки.
                key={`${pid}:${product.type}`}
                suggested={chosenCard.questions}
                lang={lang}
                labels={{
                  lead: u.setupLead, hint: u.setupHint, skip: u.setupSkip, add: u.setupAdd, removeOne: u.setupRemove,
                  restore: u.setupRestore, restored: u.setupRestored, start: u.setupStart,
                  saving: u.saving, failed: u.failed, atLeastOne: u.setupAtLeastOne,
                  placeholder: u.setupPlaceholder, voiceFor: u.setupVoice, voiceClose: u.setupVoiceClose,
                  count: u.setupCount,
                  more: u.setupMore, moreHint: u.setupMoreHint, fewer: u.setupFewer,
                }}
              />
            </div>
          )}
        </div>
      ) : !seed ? (
        <div className="mt-3">
          <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">{u.introLead}</p>
          <IntroQuestions
            // 🔒 ТОТ ЖЕ КЛЮЧ И ПО ТОЙ ЖЕ ПРИЧИНЕ: ответы засеваются массивом по
            // числу вопросов при монтировании; сменился список — ответы молча
            // встали бы не к тем вопросам, и видно это только по готовым кейсам.
            key={`${pid}:${(questions ?? chosenCard?.questions ?? u.introQuestions).join("|")}`}
            questions={questions ?? chosenCard?.questions ?? u.introQuestions}
            lang={lang}
            labels={{
              progress: u.introProgress, placeholder: u.introPlaceholder,
              next: u.next, back: u.back, finish: u.introFinish, saving: u.saving,
              saved: u.introSaved, failed: u.failed, tooShort: u.introTooShort,
              voiceHint: u.voiceHint,
            }}
          />
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <QuizLauncher lang={lang} label={cases.length ? u.quizMore : u.quizStart} labels={quizLabels} />
            <span className="text-[10px] text-muted-foreground">{cases.length ? u.quizMoreHint : u.quizStartHint}</span>
          </div>

          {cases.length > 0 && (
            <div className="mt-3">
              <CasesBoard
                cases={cases}
                lang={lang}
                // Имя продукта уезжает в островок пропсом: им владелец назовёт
                // работу вслух, когда позовёт агента, — а словарь панели
                // серверный и в браузер не попадает.
                product={product.title}
                nextSteps={{
                  title: u.nextTitle, stepCreated: u.nextStepCreated,
                  whereTitle: u.nextWhereTitle, steps: u.nextSteps,
                  sayTitle: u.nextSayTitle, sayProduct: u.nextSayProduct, sayStep: u.nextSayStep,
                  copied: u.nextCopied, toGithub: u.nextToGithub, toEnv: u.nextToEnv,
                  close: u.close,
                }}
                labels={{
                  draft: u.draft, confirmed: u.confirmed,
                  confirm: u.confirm, unconfirm: u.unconfirm,
                  confirmAll: u.confirmAll, confirmedAll: u.confirmedAll,
                  edit: u.edit, save: u.save, saving: u.saving, cancel: u.cancel,
                  remove: u.remove, removeConfirm: u.removeConfirm,
                  remarkTitle: u.remarkTitle, remarkPlaceholder: u.remarkPlaceholder,
                  rewrite: u.rewrite, rewriting: u.rewriting,
                  failed: u.failed, savedCase: u.savedCase, noKey: u.noKey,
                  titleLabel: u.titleLabel, summaryLabel: u.summaryLabel,
                  errKeyRejected: u.errKeyRejected, errQuota: u.errQuota,
                  errRateLimit: u.errRateLimit, errModelMissing: u.errModelMissing,
                  errUpstream: u.errUpstream,
                }}
              />
            </div>
          )}
        </>
      )}

      {/* 🔒 УСТРОЙСТВО — В ОКНЕ, А НЕ НА СТРАНИЦЕ. Человек приходит сюда отвечать
          на вопросы, а не читать про этапы. Но, не понимая ЗАЧЕМ отвечать, он
          отвечает наспех — и получает кейсы, из которых нечего строить. Разметку
          строит СЕРВЕР: словарь в браузер не уезжает. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DocPopup label={u.flowDocLabel} title={u.flowDocTitle}>
          <div className="space-y-3 text-[11px] leading-relaxed text-foreground">
            <p className="text-muted-foreground">{u.flowLead}</p>

            <ol className="space-y-2.5">
              {[
                { t: u.flowStep1Title, b: u.flowStep1, o: u.flowStep1Out },
                { t: u.flowStep2Title, b: u.flowStep2, o: u.flowStep2Out },
                { t: u.flowStep3Title, b: u.flowStep3, o: u.flowStep3Out },
                { t: u.flowStep4Title, b: u.flowStep4, o: u.flowStep4Out },
              ].map((x, i) => {
                // «Вы здесь» превращает инструкцию в карту: этап считает СЕРВЕР по
                // состоянию файлов проекта, а не по виду страницы.
                const here = stage === i + 1;
                return (
                  <li key={x.t} className={`rounded-md border p-2.5 ${here ? "border-primary bg-primary/5" : "border-border"}`}>
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {x.t}
                      {here && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-primary-foreground">
                          {u.flowYouAreHere}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-muted-foreground">{x.b}</p>
                    <p className="mt-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                      <span className="uppercase tracking-wide">{u.flowOutLabel}:</span> {x.o}
                    </p>
                  </li>
                );
              })}
            </ol>

            {stage === 0 && (
              <p className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5 text-emerald-700 dark:text-emerald-300">
                {u.flowAllDone}
              </p>
            )}

            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-200">
              <strong>{u.flowQualityTitle}</strong> {u.flowQuality}
            </p>

            <p><strong>{u.flowBoundaryTitle}</strong> {u.flowBoundary}</p>
            <p><strong>{u.flowAfterTitle}</strong> {u.flowAfter}</p>
            <p className="text-muted-foreground"><strong className="text-foreground">{u.flowWhereTitle}</strong> {u.flowWhere}</p>
          </div>
        </DocPopup>

        <p className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <FolderOpen size={11} />
          {paths.cases} · {paths.raw}
        </p>
      </div>

      <HelpDetails label={u.helpLabel}>
        <p><strong>{u.helpWhyTitle}</strong> {u.helpWhy}</p>
        <p><strong>{u.helpRawTitle}</strong> {u.helpRaw}</p>
        <p><strong>{u.helpConfirmTitle}</strong> {u.helpConfirm}</p>
        <p>
          <strong>{u.helpModelTitle}</strong> {u.helpModel}{" "}
          <Link href={adminHref(lang, "openai")} className="underline">{s.pages.openai.title}</Link>
        </p>
      </HelpDetails>
    </PageShell>
  );
}
