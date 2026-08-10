// Пользовательские кейсы — гейт разработки и Quiz, который его проходит.
//
// ПОЧЕМУ ЭТА СТРАНИЦА УСТРОЕНА НЕ КАК ОСТАЛЬНЫЕ ДОКУМЕНТЫ. У других есть редактор
// и просьба «напишите». Здесь просьба «опишите, зачем нужен продукт» — худший
// первый экран из возможных: он требует работы до того, как дал ценность. Поэтому
// вместо пустого поля стоит разговор: семь вводных вопросов, затем Quiz.
//
// ТРИ СОСТОЯНИЯ, и страница показывает ровно одно:
//   1. затравки нет  → вводные вопросы, дальше пройти нельзя;
//   2. затравка есть, кейсов нет → приглашение в Quiz;
//   3. кейсы есть → доска: оранжевые ждут подтверждения, зелёные подтверждены.
//
// Динамическая: и кейсы, и состояние гейта — живые.

import Link from "next/link";
import { AlertTriangle, CheckCircle2, FolderOpen } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { listCases, useCasesGate, readSeed, USE_CASES_DIR, CASES_SUBDIR, RAW_SUBDIR } from "@/lib/use-cases-store";
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

  const quizLabels = {
    title: u.quizTitle, close: u.close, modelBanner: u.modelBanner,
    designer: u.designer, placeholder: u.quizPlaceholder, answer: u.answer,
    auto: u.auto, autoWriting: u.autoWriting, autoPaused: u.autoPaused,
    pause: u.pause, keepText: u.keepText,
    create: u.create, creating: u.creating,
    ready: u.ready, hint: u.quizHint,
    added: u.added, failed: u.failed, noKey: u.noKey, noSeed: u.noSeed,
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

      {!seed ? (
        <div className="mt-3">
          <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">{u.introLead}</p>
          <IntroQuestions
            questions={u.introQuestions}
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
                }}
              />
            </div>
          )}
        </>
      )}

      <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
        <FolderOpen size={11} />
        {USE_CASES_DIR}/{CASES_SUBDIR}/ · {USE_CASES_DIR}/{RAW_SUBDIR}/
      </p>

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
