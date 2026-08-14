// Пользовательские кейсы — гейт разработки и Quiz, который его проходит.
//
// ПОЧЕМУ ЭТА СТРАНИЦА УСТРОЕНА НЕ КАК ОСТАЛЬНЫЕ ДОКУМЕНТЫ. У других есть редактор
// и просьба «напишите». Здесь просьба «опишите, зачем нужен продукт» — худший
// первый экран из возможных: он требует работы до того, как дал ценность. Поэтому
// вместо пустого поля стоит разговор: семь вводных вопросов, затем Quiz.
//
// ЧЕТЫРЕ СОСТОЯНИЯ, и страница показывает ровно одно:
//   0. вопросы не утверждены → экран правки САМИХ вопросов (владелец 2026-08-14);
//   1. вопросы есть, затравки нет → вводный опрос по ним, дальше пройти нельзя;
//   2. затравка есть, кейсов нет → приглашение в Quiz;
//   3. кейсы есть → доска: оранжевые ждут подтверждения, зелёные подтверждены.
//
// 🔒 ЭКРАН 0 ПОЯВИЛСЯ ПОТОМУ, ЧТО ВОПРОС — ПОЛОВИНА ОТВЕТА. Семь вводных вопросов
// были зашиты в словарь и задавались одинаково интернет-магазину и клинике;
// неверный вопрос уводит человека описывать не тот продукт, который у него в
// голове, и это выясняется только на кейсах, когда переписывать надо всё.
//
// 🔒 «НАЧАТЬ СНАЧАЛА» ВИДНА НА ВСЕХ ЭКРАНАХ, где уже есть что сбрасывать. Без неё
// проскочивший опрос наспех оставался в своём мусоре навсегда: затравка писалась
// один раз и не удалялась ничем, а лента разговора уходит в модель на каждый
// вызов — новые хорошие ответы тонули в старых плохих.
//
// Динамическая: и кейсы, и состояние гейта — живые.

import Link from "next/link";
import { AlertTriangle, CheckCircle2, FolderOpen } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import {
  listCases, useCasesGate, readSeed, readQuestions, resetPreview,
  USE_CASES_DIR, CASES_SUBDIR, RAW_SUBDIR,
} from "@/lib/use-cases-store";
import { readInstructionSet } from "@/lib/instruction-set";
import { DocCommands } from "../_components/doc-commands";
import { DocPopup } from "../_components/doc-popup.client";
import { IntroSetup } from "./_components/intro-setup.client";
import { ResetQuiz } from "./_components/reset-quiz.client";
import { IntroQuestions } from "./_components/intro-questions.client";
import { QuizLauncher } from "./_components/quiz-launcher.client";
import { CasesBoard } from "./_components/cases-board.client";
import { MigrateLegacy } from "./_components/migrate-legacy.client";

export const dynamic = "force-dynamic";

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

export default async function UseCasesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const u = s.useCases;
  const page = s.pages["doc-use-cases"];

  const { cases, legacy } = listCases();
  const gate = useCasesGate();
  const seed = readSeed();
  // Утверждённые вопросы проекта. Их нет — владелец ещё не смотрел список, и
  // первым экраном идёт правка вопросов, а не ответы на чужие.
  const questions = readQuestions();
  const set = readInstructionSet();
  const o = s.docsOverview;

  // Есть ли вообще что сбрасывать. Кнопка «начать сначала» без единого ответа —
  // это предложение отменить то, чего нет.
  const counts = resetPreview();
  const somethingToReset = Boolean(questions) || counts.seedAnswers > 0 || counts.turns > 0 || counts.cases > 0;

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
    // Причины отказа — по одной на беду: ключ, деньги, частота, модель, связь,
    // пустой разговор, неудачное сохранение.
    errKeyRejected: u.errKeyRejected, errQuota: u.errQuota, errRateLimit: u.errRateLimit,
    errModelMissing: u.errModelMissing, errUpstream: u.errUpstream,
    errNoCases: u.errNoCases, errSaveFailed: u.errSaveFailed,
  };

  return (
    <PageShell lang={lang} slug="doc-use-cases" s={s} title={page.title} hint={page.hint}>
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

      {/* «Начать сначала» стоит НАД экраном, а не под ним: человек, попавший в
          плохой опрос, ищет выход сразу, а не после того, как пролистает всё, что
          его не устраивает. Показывается на любом экране, где есть что убирать. */}
      {somethingToReset && (
        <div className="mt-3 flex justify-end">
          <ResetQuiz labels={resetLabels} counts={counts} />
        </div>
      )}

      {/* 🔒 ЭКРАН 0 ТОЛЬКО ДО ПЕРВОГО ОТВЕТА. Проект, где затравка уже написана,
          на правку вопросов не откатывается: спрашивать «какие вопросы задать»
          у того, кто на них ответил, — значит отменять его работу видом экрана.
          Захочет переспросить заново — для этого есть «Начать сначала». */}
      {!questions && !seed ? (
        // Экран 0 — правка самих вопросов, до единого ответа.
        <div className="mt-2">
          <IntroSetup
            suggested={u.introQuestions}
            lang={lang}
            labels={{
              lead: u.setupLead, hint: u.setupHint, add: u.setupAdd, removeOne: u.setupRemove,
              restore: u.setupRestore, restored: u.setupRestored, start: u.setupStart,
              saving: u.saving, failed: u.failed, atLeastOne: u.setupAtLeastOne,
              placeholder: u.setupPlaceholder, voiceFor: u.setupVoice, voiceClose: u.setupVoiceClose,
              count: u.setupCount,
            }}
          />
        </div>
      ) : !seed ? (
        <div className="mt-3">
          <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">{u.introLead}</p>
          <IntroQuestions
            // Список владельца, если он его утвердил; иначе предложенный — так
            // проект, начатый до появления экрана вопросов, не остаётся без них.
            questions={questions ?? u.introQuestions}
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

      {/* Команды кейсов: добавить, найти, изменить — прямо здесь, чтобы их не
          искали на карте. */}
      <div className="mt-3 rounded-lg border border-border p-3">
        <DocCommands
          docKey="doc-use-cases"
          lang={lang}
          commands={set.commands}
          labels={{
            caption: o.commandCaption, helpTitle: o.commandHelp,
            edit: o.commandEdit, save: o.commandSave, saving: o.commandSaving,
            cancel: o.commandCancel, saved: o.commandSaved, failed: s.docs.failed,
            phrasePlaceholder: o.commandPlaceholder, anchorNote: o.commandAnchorNote,
            verbs: { activate: o.verbActivate, add: o.verbAdd, find: o.verbFind, edit: o.verbEdit },
          }}
        />
      </div>

      {/* 🔒 УСТРОЙСТВО — В ОКНЕ, А НЕ НА СТРАНИЦЕ (владелец 2026-08-14).
          Человек приходит сюда отвечать на вопросы, а не читать про этапы. Но,
          не понимая ЗАЧЕМ отвечать, он отвечает наспех — и получает кейсы, из
          которых нечего строить. Окно держит страницу короткой, а объяснение
          даёт целиком и в одно нажатие. Разметку строит СЕРВЕР и передаёт
          готовым деревом: словарь в браузер не уезжает. */}
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
              ].map((x) => (
                <li key={x.t} className="rounded-md border border-border p-2.5">
                  <p className="font-semibold">{x.t}</p>
                  <p className="mt-1 text-muted-foreground">{x.b}</p>
                  {/* «На выходе» отделено намеренно: этап без названного плода
                      читается как обязанность, а не как шаг к чему-то. */}
                  <p className="mt-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                    <span className="uppercase tracking-wide">{u.flowOutLabel}:</span> {x.o}
                  </p>
                </li>
              ))}
            </ol>

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
          {USE_CASES_DIR}/{CASES_SUBDIR}/ · {USE_CASES_DIR}/{RAW_SUBDIR}/
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
