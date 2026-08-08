"use client";

// Действия по личному домену (шаг 501, Ф2, партия 9). Островок, и он неизбежен:
// проверка DNS, выпуск сертификата с обратным отсчётом, сквозная проверка HTTPS,
// переключение режима и возврат назад — всё это последовательность действий над
// сервером с ожиданием ответа.
//
// 🔒 ЭТО САМАЯ ОПАСНАЯ ПОВЕРХНОСТЬ ПАНЕЛИ: она переключает сервер на HTTPS и при
// ошибке запирает владельца снаружи. Поэтому здесь ВЕРНЫЙ ПОРТ поведения старого
// визарда, а не улучшение: те же подтверждения, те же задержки, те же переходы.
// Ни один маршрут домена не тронут — переносится интерфейс, не проверенная в бою
// цепочка.
//
// Что сохранено дословно и почему:
//   • блокировка кнопки выпуска на 120 секунд с видимым отсчётом — двойное
//     нажатие запускало certbot дважды;
//   • 10 секунд до перехода после включения — активация делает `pm2 reload all`
//     через ~0,8 с после ответа, и ранний переход попадал на 502 или на старый
//     интерфейс (шаг 93);
//   • письмо со списком адресов отправляется и отдельной кнопкой: автоматическое
//     после активации умеет молча не дойти;
//   • необязательный узел, который не отвечает, — оранжевое предупреждение, а не
//     красный отказ: активацию он не блокирует.
//
// Начальное состояние приходит ПРОПСОМ с сервера — поэтому нет мига «загружаю» и
// нет второго источника правды о состоянии.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle, XCircle, Loader2, ChevronDown, ChevronRight, AlertTriangle,
  Globe, Shield, Upload, Sparkles, Rocket, ExternalLink, RefreshCw, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WizardState } from "../_lib/domain";

type HealthResult = {
  host: string; dnsOk: boolean; resolved: string[];
  httpsStatus: number | null; certValid: boolean; error: string | null; optional?: boolean;
};

export type DomainLabels = {
  step: string; done: string;
  s1: string; s2: string; s3: string; s4: string; s5: string;
  checkDns: string; recheckDns: string; checkingDns: string;
  dnsAllOk: string; dnsStillMissing: string; dnsNotPropagated: string;
  missingOrWrong: string; changeDomain: string; resetting: string; changeConfirm: string;
  trustQuestion: string; trustBody: string; trustProof: string;
  autoLabel: string; autoHint: string; autoTitle: string; autoNote: string;
  currentCert: string; inCert: string; missingInCert: string;
  issue: string; reissue: string; issuing: string; refreshStatus: string;
  issueStarted: string; issueDone: string; issueFailed: string; issueSlow: string;
  lastFailed: string; lastFailedHint: string;
  uploadTitle: string; uploadHint: string; fullchain: string; privkey: string;
  install: string; installing: string; installStarted: string; bothRequired: string;
  healthIntro: string; runCheck: string; checking: string;
  healthAllOk: string; healthOkOptional: string; healthFailing: string; optional: string;
  activateWarning: string; activateBullets: string[];
  activate: string; activating: string; activateConfirm: string; activateStarted: string;
  liveIntro: string; certAuto: string; certUpload: string; expires: string; renewNote: string;
  openSite: string; reissueSoon: string; comingSoon: string;
  emailIntro: string; emailButton: string; emailSending: string; emailSent: string;
  rollbackIntro: string; rollback: string; rollbackConfirm: string; switchingBack: string;
  failed: string;
};

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

export function DomainActions(
  { domain, initialState, labels }: { domain: string; initialState: WizardState; labels: DomainLabels },
) {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(initialState);
  const [openStep, setOpenStep] = useState<1 | 2 | 3 | 4 | 5 | null>(initialState.currentStep ?? 1);

  const [useAuto, setUseAuto] = useState(initialState.step2.certSource !== "upload");
  const [issuing, setIssuing] = useState(false);
  const [issueCountdown, setIssueCountdown] = useState(0);
  const timers = useRef<{ tick?: ReturnType<typeof setInterval>; poll?: ReturnType<typeof setInterval> }>({});
  const [showTrust, setShowTrust] = useState(false);
  const [pem, setPem] = useState("");
  const [key, setKey] = useState("");
  const [uploading, setUploading] = useState(false);

  const [healthRun, setHealthRun] = useState<{ allOk: boolean; results: HealthResult[] } | null>(null);
  const [healthChecking, setHealthChecking] = useState(false);

  const [activating, setActivating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [checkingDns, setCheckingDns] = useState(false);
  const [changing, setChanging] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<WizardState | null> => {
    try {
      const r = await fetch("/api/config/domain/wizard-state", { cache: "no-store" });
      const d = (await r.json()) as WizardState;
      setState(d);
      if (d.step2?.certSource) setUseAuto(d.step2.certSource !== "upload");
      return d;
    } catch {
      toast.error(labels.failed);
      return null;
    }
  }, [labels.failed]);

  function stopTimers() {
    if (timers.current.tick) clearInterval(timers.current.tick);
    if (timers.current.poll) clearInterval(timers.current.poll);
    timers.current = {};
  }
  useEffect(() => () => stopTimers(), []);

  async function runDnsCheck() {
    setCheckingDns(true);
    try {
      // Читаем ВОЗВРАЩЁННОЕ состояние, а не замыкание: оно устарело до перерисовки.
      const d = await refresh();
      if (!d) return;
      if (d.step1.complete) toast.success(labels.dnsAllOk);
      else {
        const missing = d.step1.missingHosts ?? [];
        toast.warning(missing.length ? fill(labels.dnsStillMissing, { hosts: missing.join(", ") }) : labels.dnsNotPropagated);
      }
    } finally {
      setCheckingDns(false);
    }
  }

  async function changeDomain() {
    if (!confirm(fill(labels.changeConfirm, { domain }))) return;
    setChanging(true);
    try {
      const r = await fetch("/api/config/domain", { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) { toast.error(String(d.error ?? labels.failed)); return; }
      router.refresh();
    } catch {
      toast.error(labels.failed);
    } finally {
      setChanging(false);
    }
  }

  async function issueAutoCert() {
    if (issuing || issueCountdown > 0) return;
    setIssuing(true);
    try {
      const r = await fetch("/api/config/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const d = await r.json();
      if (d.error) { toast.error(String(d.error)); setIssuing(false); return; }
      toast.success(labels.issueStarted);

      const TOTAL = 120;
      setIssueCountdown(TOTAL);
      const start = Date.now();
      stopTimers();
      timers.current.tick = setInterval(() => {
        const left = Math.max(0, TOTAL - Math.floor((Date.now() - start) / 1000));
        setIssueCountdown(left);
        if (left <= 0 && timers.current.tick) { clearInterval(timers.current.tick); timers.current.tick = undefined; }
      }, 1000);
      timers.current.poll = setInterval(async () => {
        const fresh = await refresh();
        const timedOut = Date.now() - start > 180_000;
        if (fresh?.step2?.complete) { stopTimers(); setIssueCountdown(0); setIssuing(false); toast.success(labels.issueDone); }
        else if (fresh?.step2?.status === "error") { stopTimers(); setIssueCountdown(0); setIssuing(false); toast.error(labels.issueFailed); }
        else if (timedOut) { stopTimers(); setIssueCountdown(0); setIssuing(false); toast.warning(labels.issueSlow); }
      }, 5000);
    } catch {
      toast.error(labels.failed);
      stopTimers(); setIssueCountdown(0); setIssuing(false);
    }
  }

  async function uploadCert() {
    if (!pem.trim() || !key.trim()) { toast.error(labels.bothRequired); return; }
    setUploading(true);
    try {
      const r = await fetch("/api/config/domain", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, fullchainPem: pem.trim(), privateKeyPem: key.trim() }),
      });
      const d = await r.json();
      if (d.error) { toast.error(String(d.error)); return; }
      toast.success(labels.installStarted);
      setPem(""); setKey("");
      setTimeout(refresh, 3000);
    } catch {
      toast.error(labels.failed);
    } finally {
      setUploading(false);
    }
  }

  async function runHealthCheck() {
    setHealthChecking(true);
    try {
      const r = await fetch("/api/config/domain/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const d = await r.json();
      if (d.error) { toast.error(String(d.error)); return; }
      setHealthRun({ allOk: d.allOk, results: d.results });
      const optionalDown: string[] = d.optionalDown ?? [];
      if (d.allOk) {
        toast.success(optionalDown.length
          ? fill(labels.healthOkOptional, { hosts: optionalDown.join(", ") })
          : labels.healthAllOk);
      } else {
        toast.warning(labels.healthFailing);
      }
    } catch {
      toast.error(labels.failed);
    } finally {
      setHealthChecking(false);
    }
  }

  async function activate() {
    if (!confirm(fill(labels.activateConfirm, { domain }))) return;
    setActivating(true);
    try {
      const r = await fetch("/api/config/domain/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const d = await r.json();
      if (d.error) { toast.error(String(d.error)); return; }
      // Письмо ещё и по рабочему IP-пути: собственное уведомление маршрута
      // активации умеет упасть на устаревшем токене. Не блокирует переход.
      fetch("/api/config/domain/send-email", { method: "POST" }).catch(() => {});
      toast.success(labels.activateStarted);
      // 10 секунд, а не меньше: активация перезапускает все процессы, и ранний
      // переход попадал на 502 или на старый интерфейс (шаг 93).
      setTimeout(() => { window.location.href = d.redirectTo; }, 10000);
    } catch {
      toast.error(labels.failed);
    } finally {
      setActivating(false);
    }
  }

  async function deactivate() {
    if (!confirm(fill(labels.rollbackConfirm, { domain }))) return;
    setDeactivating(true);
    try {
      const r = await fetch("/api/config/domain/deactivate", { method: "POST" });
      const d = await r.json();
      if (d.error) { toast.error(String(d.error)); return; }
      toast.success(labels.switchingBack);
      setTimeout(() => {
        window.location.href = state.serverIp ? `http://${state.serverIp}:3002` : "/";
      }, 6000);
    } catch {
      toast.error(labels.failed);
    } finally {
      setDeactivating(false);
    }
  }

  async function sendEmail() {
    setEmailSending(true); setEmailError(null);
    try {
      const r = await fetch("/api/config/domain/send-email", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) { setEmailError(String(d.error ?? `HTTP ${r.status}`)); return; }
      setEmailSent(String(d.recipient ?? ""));
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : labels.failed);
    } finally {
      setEmailSending(false);
    }
  }

  function Step(
    { n, title, enabled, complete, icon, children }:
    { n: 1 | 2 | 3 | 4 | 5; title: string; enabled: boolean; complete: boolean; icon: React.ReactNode; children: React.ReactNode },
  ) {
    const open = openStep === n;
    return (
      <div className={`rounded-md border ${complete ? "border-green-500/40 bg-green-500/5" : enabled ? "border-border" : "border-border opacity-50"}`}>
        <button
          type="button"
          onClick={() => enabled && setOpenStep((c) => (c === n ? null : n))}
          disabled={!enabled}
          className={`flex w-full items-center gap-2 px-3 py-2.5 text-[11px] font-medium transition-colors ${enabled ? "text-foreground hover:bg-muted" : "cursor-not-allowed text-muted-foreground"}`}
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {complete ? <CheckCircle size={12} className="text-green-500" /> : icon}
          <span className="flex-1 text-left">{fill(labels.step, { n: String(n) })} — {title}</span>
          {complete && <span className="text-[10px] font-medium text-green-500">{labels.done}</span>}
        </button>
        {open && enabled && <div className="space-y-3 border-t border-border bg-muted/30 px-3 py-3">{children}</div>}
      </div>
    );
  }

  const certExpires = state.step2.certExpiresAt
    ? new Date(state.step2.certExpiresAt).toLocaleDateString()
    : null;

  return (
    <div className="space-y-3">
      {/* Шаг 1 — проверка DNS. Сама таблица записей отрисована СЕРВЕРОМ выше:
          она справочная, её читают и переписывают, и без JS она обязана быть. */}
      <Step n={1} title={labels.s1} enabled complete={state.step1.complete} icon={<Globe size={12} />}>
        {(state.step1.missingHosts?.length ?? 0) > 0 && !state.step1.complete && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[10px] text-amber-700 dark:text-amber-300">
            <span className="mb-1.5 block font-medium">{labels.missingOrWrong}</span>
            <div className="flex flex-wrap gap-1">
              {state.step1.missingHosts!.map((h) => (
                <code key={h} className="break-all rounded bg-muted px-1">{h}</code>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={runDnsCheck} disabled={checkingDns} className="text-[11px]">
            {checkingDns && <Loader2 size={11} className="animate-spin" />}
            {checkingDns ? labels.checkingDns : state.step1.complete ? labels.recheckDns : labels.checkDns}
          </Button>
          {!state.step4.complete && (
            <Button variant="outline" size="sm" onClick={changeDomain} disabled={changing || checkingDns} className="text-[11px]">
              {changing && <Loader2 size={11} className="animate-spin" />}
              {changing ? labels.resetting : labels.changeDomain}
            </Button>
          )}
        </div>
      </Step>

      {/* Шаг 2 — сертификат */}
      <Step n={2} title={labels.s2} enabled={state.step1.complete} complete={state.step2.complete} icon={<Shield size={12} />}>
        <details className="rounded-md border border-border bg-muted/30" open={showTrust}>
          <summary
            onClick={(e) => { e.preventDefault(); setShowTrust((v) => !v); }}
            className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-2 text-[11px] font-medium text-foreground hover:bg-muted [&::-webkit-details-marker]:hidden"
          >
            <ShieldCheck size={12} className="shrink-0 text-primary" />
            <span className="flex-1 text-left">{labels.trustQuestion}</span>
            {showTrust ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </summary>
          <div className="space-y-2 border-t border-border px-3 pt-1 pb-3 text-[10px] leading-relaxed text-muted-foreground">
            <p>{labels.trustBody}</p>
            <p className="flex items-start gap-1.5 text-foreground">
              <ShieldCheck size={12} className="mt-0.5 shrink-0 text-green-500" />
              <span>{labels.trustProof}</span>
            </p>
          </div>
        </details>

        <label className="flex cursor-pointer select-none items-start gap-2 text-[11px]">
          <input type="checkbox" checked={useAuto} onChange={(e) => setUseAuto(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
          <span className="text-foreground">
            {labels.autoLabel}
            <br />
            <span className="text-[10px] text-muted-foreground">{labels.autoHint}</span>
          </span>
        </label>

        <div className={`space-y-2 rounded-md border p-3 ${useAuto ? "border-border" : "border-border opacity-40 pointer-events-none"}`}>
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
            <Sparkles size={11} className="text-amber-500" /> {labels.autoTitle}
          </p>
          <p className="text-[10px] leading-relaxed text-muted-foreground">{labels.autoNote}</p>
          {state.step2.certExists && state.step2.certSource === "auto" && (
            <p className="text-[10px] text-muted-foreground">
              {fill(labels.currentCert, { count: String(state.step2.certSans?.length ?? 0) })}
              {certExpires && <> · {fill(labels.expires, { date: certExpires })}</>}
            </p>
          )}
          {(state.step2.hosts?.length ?? 0) > 0 && (
            <div className="space-y-1 rounded-md border border-border bg-background p-2 font-mono text-[10px]">
              {state.step2.hosts!.map((h) => (
                <div key={h.host} className="flex items-center gap-2">
                  {h.covered ? <CheckCircle size={11} className="shrink-0 text-green-500" /> : <XCircle size={11} className="shrink-0 text-destructive" />}
                  <span className="flex-1 break-all text-foreground">{h.host}</span>
                  <span className={h.covered ? "text-green-500" : "text-destructive"}>
                    {h.covered ? labels.inCert : labels.missingInCert}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={issueAutoCert} disabled={!useAuto || issuing || issueCountdown > 0} className="text-[11px]">
              {(issuing || issueCountdown > 0) && <Loader2 size={11} className="animate-spin" />}
              {issuing || issueCountdown > 0
                ? `${labels.issuing} ${issueCountdown > 0 ? `${issueCountdown}s` : ""}`
                : state.step2.complete ? labels.reissue : labels.issue}
            </Button>
            <button type="button" onClick={() => refresh()} disabled={issuing || issueCountdown > 0}
              className="text-[10px] text-muted-foreground underline hover:text-foreground disabled:opacity-40">
              {labels.refreshStatus}
            </button>
          </div>
          {state.step2.status === "error" && state.step2.error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-[10px] leading-relaxed text-destructive">
              <p className="flex items-center gap-1.5 font-medium"><XCircle size={11} /> {labels.lastFailed}</p>
              <p className="mt-1 max-h-32 overflow-y-auto font-mono break-all whitespace-pre-wrap">{state.step2.error}</p>
              <p className="mt-1 text-muted-foreground">{labels.lastFailedHint}</p>
            </div>
          )}
        </div>

        <div className={`space-y-2 rounded-md border p-3 ${!useAuto ? "border-border" : "border-border opacity-40 pointer-events-none"}`}>
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground"><Upload size={11} /> {labels.uploadTitle}</p>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {fill(labels.uploadHint, { domain })}
          </p>
          <div>
            <label className="text-[10px] text-foreground">{labels.fullchain}</label>
            <textarea value={pem} onChange={(e) => setPem(e.target.value)} disabled={useAuto}
              placeholder="-----BEGIN CERTIFICATE-----&#10;…&#10;-----END CERTIFICATE-----"
              className="h-20 w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-foreground">{labels.privkey}</label>
            <textarea value={key} onChange={(e) => setKey(e.target.value)} disabled={useAuto}
              placeholder="-----BEGIN PRIVATE KEY-----&#10;…&#10;-----END PRIVATE KEY-----"
              className="h-20 w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none" />
          </div>
          <Button size="sm" onClick={uploadCert} disabled={useAuto || uploading || !pem.trim() || !key.trim()} className="text-[11px]">
            {uploading && <Loader2 size={11} className="animate-spin" />}
            {uploading ? labels.installing : labels.install}
          </Button>
        </div>
      </Step>

      {/* Шаг 3 — сквозная проверка */}
      <Step n={3} title={labels.s3} enabled={Boolean(state.step3.ready)} complete={Boolean(healthRun?.allOk)} icon={<RefreshCw size={12} />}>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{labels.healthIntro}</p>
        <Button size="sm" onClick={runHealthCheck} disabled={healthChecking} className="text-[11px]">
          {healthChecking && <Loader2 size={11} className="animate-spin" />}
          {healthChecking ? labels.checking : labels.runCheck}
        </Button>
        {healthRun && (
          <div className="space-y-1 rounded-md border border-border bg-background p-2 font-mono text-[10px]">
            {healthRun.results.map((r) => {
              const ok = r.dnsOk && r.certValid && r.httpsStatus !== null && r.httpsStatus >= 200 && r.httpsStatus < 500;
              const optionalDown = !ok && r.optional;
              return (
                <div key={r.host} className="flex items-center gap-2">
                  {ok ? <CheckCircle size={11} className="text-green-500" />
                    : optionalDown ? <AlertTriangle size={11} className="text-amber-500" />
                    : <XCircle size={11} className="text-destructive" />}
                  <span className="flex-1 break-all text-foreground">{r.host}</span>
                  {r.optional && <span className="text-muted-foreground">{labels.optional}</span>}
                  {!r.dnsOk && <span className={optionalDown ? "text-amber-500" : "text-destructive"}>DNS</span>}
                  {r.dnsOk && !r.certValid && <span className={optionalDown ? "text-amber-500" : "text-destructive"}>cert: {r.error}</span>}
                  {r.dnsOk && r.certValid && r.httpsStatus !== null && (
                    <span className={ok ? "text-green-500" : "text-amber-500"}>HTTP {r.httpsStatus}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Step>

      {/* Шаг 4 — включение защищённого режима */}
      <Step n={4} title={labels.s4} enabled={Boolean(healthRun?.allOk) && !state.step4.complete} complete={state.step4.complete} icon={<Rocket size={12} />}>
        <div className="space-y-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
          <p className="flex items-center gap-1.5 font-medium"><AlertTriangle size={12} /> {labels.activateWarning}</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {labels.activateBullets.map((b) => <li key={b}>{fill(b, { domain })}</li>)}
          </ul>
        </div>
        <Button size="sm" onClick={activate} disabled={activating}
          className="bg-emerald-600 text-[11px] text-white hover:bg-emerald-700">
          {activating && <Loader2 size={11} className="animate-spin" />}
          {activating ? labels.activating : fill(labels.activate, { domain })}
        </Button>
      </Step>

      {/* Шаг 5 — после включения */}
      <Step n={5} title={labels.s5} enabled={state.step4.complete} complete={state.step4.complete} icon={<CheckCircle size={12} className="text-green-500" />}>
        <p className="text-[11px] leading-relaxed text-foreground">
          {fill(labels.liveIntro, {
            domain,
            cert: state.step2.certSource === "upload" ? labels.certUpload : labels.certAuto,
          })}
          {certExpires && <> {fill(labels.expires, { date: certExpires })}</>}
        </p>
        {state.step2.certSource === "auto" && (
          <p className="text-[10px] leading-relaxed text-muted-foreground">{labels.renewNote}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
            <ExternalLink size={11} /> {labels.openSite}
          </a>
          <span title={labels.reissueSoon}
            className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-md border border-border px-3 text-[11px] text-muted-foreground opacity-40">
            {labels.reissue} <span className="text-[9px] uppercase tracking-wider">{labels.comingSoon}</span>
          </span>
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-[10px] leading-relaxed text-muted-foreground">{labels.emailIntro}</p>
          {emailSent !== null ? (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5 text-[10px] leading-relaxed text-emerald-700 dark:text-emerald-300">
              {fill(labels.emailSent, { recipient: emailSent })}
            </div>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={sendEmail} disabled={emailSending}
                className="border-violet-500/40 text-[11px] text-violet-600 hover:bg-violet-500/10 dark:text-violet-400">
                {emailSending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                {emailSending ? labels.emailSending : labels.emailButton}
              </Button>
              {emailError && <p className="mt-1.5 text-[10px] leading-relaxed text-destructive">{emailError}</p>}
            </>
          )}
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-[10px] leading-relaxed text-muted-foreground">{labels.rollbackIntro}</p>
          <Button variant="outline" size="sm" onClick={deactivate} disabled={deactivating}
            className="border-amber-500/40 text-[11px] text-amber-600 hover:bg-amber-500/10 dark:text-amber-400">
            {deactivating ? <Loader2 size={11} className="animate-spin" /> : <AlertTriangle size={11} />}
            {deactivating ? labels.switchingBack : labels.rollback}
          </Button>
        </div>
      </Step>
    </div>
  );
}
