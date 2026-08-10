// Раздел «Личный домен» (шаг 501, Ф2, партия 9).
//
// 🔒 САМАЯ ОПАСНАЯ СТРАНИЦА ПАНЕЛИ: она переключает сервер на HTTPS и при ошибке
// запирает владельца снаружи. Поэтому здесь ВЕРНЫЙ ПОРТ поведения старого
// визарда, а не улучшение, и ни один маршрут домена не тронут.
//
// Что даёт серверный рендер — и почему это здесь важнее, чем где-либо:
//   • состояние (домен, режим, срок сертификата, шаг) читается СВЕЖИМ на каждой
//     загрузке, а не из возможно устаревшего состояния браузера;
//   • таблица записей DNS — справочная, её переписывают в панель регистратора, —
//     приезжает готовым HTML и остаётся читаемой даже если интерактивная часть
//     не оживёт;
//   • начальное состояние приходит в островок пропсом, поэтому нет мига
//     «загружаю» на странице, где мигание читается как «что-то сломалось».
//
// Динамическая: и режим, и срок сертификата — живые.

import { Globe } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { readDomainState } from "./_lib/domain";
import { DnsRecords } from "./_components/dns-records";
import { DomainEntry } from "./_components/domain-entry.client";
import { DomainActions } from "./_components/domain-actions.client";

export const dynamic = "force-dynamic";

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

// Незнакомый код языка не имеет права уронить самую опасную страницу панели:
// падаем на ISO-запись, она однозначна в любой стране.
function formatDate(iso: string, lang: string): string {
  try {
    return new Date(iso).toLocaleDateString(lang, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export default async function DomainPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const t = s.domain;

  const result = await readDomainState();

  if (!result.ok) {
    return (
      <PageShell lang={lang} slug="domain" s={s} title={s.pages.domain.title} hint={s.pages.domain.hint}>
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{t.unavailable}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{result.reason}</p>
        </div>
      </PageShell>
    );
  }

  const state = result.state;
  const secure = state.step4.complete;
  // Дата — ЯЗЫКОМ СТРАНИЦЫ и месяцем СЛОВОМ (исправлено 2026-08-11).
  // Было `toLocaleDateString()` без языка: формат брался у сервера, то есть
  // американский, и «5 ноября 2026» показывалось как `11/5/2026`. По-русски это
  // читается как 11 мая — то есть как уже просроченный сертификат. Цифровой
  // формат даты нельзя показывать на панели, которая живёт на 82 языках: одна и
  // та же строка означает в них разные дни.
  const certExpires = state.step2.certExpiresAt ? formatDate(state.step2.certExpiresAt, lang) : null;

  return (
    <PageShell lang={lang} slug="domain" s={s} title={s.pages.domain.title} hint={s.pages.domain.hint}>
      {!state.domain ? (
        <DomainEntry
          labels={{
            intro: t.entryIntro, label: t.entryLabel, placeholder: "aifa.dev",
            invalid: t.entryInvalid, cloudflareWarning: t.cloudflareWarning,
            save: t.entrySave, saving: t.entrySaving, saved: t.entrySaved, failed: t.failed,
          }}
        />
      ) : (
        <>
          {/* Полоса состояния — серверная, поэтому правда видна без JS. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border px-3 py-2 text-[11px]">
            <span className="flex items-center gap-1.5">
              <Globe size={12} className="text-muted-foreground" />
              <span className="font-mono text-foreground">{state.domain}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t.modeLabel}</span>
              <span className={secure ? "text-green-600 dark:text-green-400" : "text-orange-500"}>
                {secure ? t.modeSecure : t.modeIp}
              </span>
            </span>
            {certExpires && (
              <span className="text-muted-foreground">
                {t.certLabel}: <span className="text-foreground">{certExpires}</span>
                {/* Сертификат уже есть, а режим ещё «обычный HTTP» — это ПРАВДА,
                    но рядом она читается как противоречие, и владелец на ней
                    споткнулся. Говорим прямо, почему одно не отменяет другого:
                    сертификат выпускается на шаге 2, а включается на шаге 4. */}
                {!secure && <span className="ml-1.5 text-muted-foreground/70">({t.certNotLive})</span>}
              </span>
            )}
            {state.serverIp && (
              <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">{state.serverIp}</span>
            )}
          </div>

          {/* Записи DNS — серверные: их читают и переписывают, JS для этого не нужен. */}
          <div className="mt-3">
            <DnsRecords
              serverIp={state.serverIp}
              labels={{
                intro: t.dnsIntro, type: t.dnsType, name: t.dnsName, value: t.dnsValue,
                notes: t.dnsNotes,
              }}
            />
          </div>

          <div className="mt-3">
            <DomainActions
              domain={state.domain}
              initialState={state}
              labels={{
                step: t.step, done: t.done,
                s1: t.s1, s2: t.s2, s3: t.s3, s4: t.s4, s5: t.s5,
                checkDns: t.checkDns, recheckDns: t.recheckDns, checkingDns: t.checkingDns,
                dnsAllOk: t.dnsAllOk, dnsStillMissing: t.dnsStillMissing, dnsNotPropagated: t.dnsNotPropagated,
                missingOrWrong: t.missingOrWrong, changeDomain: t.changeDomain, resetting: t.resetting,
                changeConfirm: t.changeConfirm,
                trustQuestion: t.trustQuestion, trustBody: t.trustBody, trustProof: t.trustProof,
                autoLabel: t.autoLabel, autoHint: t.autoHint, autoTitle: t.autoTitle, autoNote: t.autoNote,
                currentCert: t.currentCert, inCert: t.inCert, missingInCert: t.missingInCert,
                issue: t.issue, reissue: t.reissue, issuing: t.issuing, refreshStatus: t.refreshStatus,
                issueStarted: t.issueStarted, issueDone: t.issueDone, issueFailed: t.issueFailed,
                issueSlow: t.issueSlow, lastFailed: t.lastFailed, lastFailedHint: t.lastFailedHint,
                uploadTitle: t.uploadTitle, uploadHint: t.uploadHint,
                fullchain: t.fullchain, privkey: t.privkey,
                install: t.install, installing: t.installing, installStarted: t.installStarted,
                bothRequired: t.bothRequired,
                healthIntro: t.healthIntro, runCheck: t.runCheck, checking: t.checking,
                healthAllOk: t.healthAllOk, healthOkOptional: t.healthOkOptional,
                healthFailing: t.healthFailing, optional: t.optional,
                activateWarning: t.activateWarning, activateBullets: t.activateBullets,
                activate: t.activate, activating: t.activating,
                activateConfirm: t.activateConfirm, activateStarted: t.activateStarted,
                liveIntro: t.liveIntro, certAuto: t.certAuto, certUpload: t.certUpload,
                expires: t.expires, renewNote: t.renewNote,
                openSite: t.openSite, reissueSoon: t.reissueSoon, comingSoon: t.comingSoon,
                emailIntro: t.emailIntro, emailButton: t.emailButton, emailSending: t.emailSending,
                emailSent: t.emailSent,
                rollbackIntro: t.rollbackIntro, rollback: t.rollback,
                rollbackConfirm: t.rollbackConfirm, switchingBack: t.switchingBack,
                failed: t.failed,
              }}
            />
          </div>
        </>
      )}

      <HelpDetails label={t.helpLabel}>
        <p><strong>{t.helpWhatTitle}</strong> {t.helpWhat}</p>
        <p><strong>{t.helpDnsTitle}</strong> {t.helpDns}</p>
        <p><strong>{t.helpSafetyTitle}</strong> {t.helpSafety}</p>
        <p><strong>{t.helpBackTitle}</strong> {t.helpBack}</p>
      </HelpDetails>

      <p className="mt-2 text-[10px] text-muted-foreground/70">{fill(t.footnote, { domain: state.domain ?? "" })}</p>
    </PageShell>
  );
}
