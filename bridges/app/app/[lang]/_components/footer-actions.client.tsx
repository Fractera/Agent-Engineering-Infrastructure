"use client";

// Три действия подвала: развернуть, забрать, отправить (шаг 501, Ф2).
//
// Островок обязателен: это единственные три кнопки панели, которые трогают
// сервер из любого раздела, а развёртывание ещё и длится минутами и опрашивает
// собственную задачу. Серверной формой это не делается.
//
// 🔒 ГЛАВНОЕ ТРЕБОВАНИЕ ВЛАДЕЛЬЦА (2026-08-10): текст ошибки обязан быть
// КОПИРУЕМЫМ. Панель не чинит код — чинит агент-программист на машине
// пользователя, и переносит он туда ровно эти строки: сообщение компилятора или
// отказ git. Поэтому у каждого отказа: полный вывод в уведомлении, кнопка
// «Копировать» рядом, уведомление НЕ гаснет само (`duration: Infinity`), а
// нажатие «Копировать» его не закрывает — иначе текст исчезает раньше, чем
// доехал до агента.
//
// Словарь остаётся серверным: подписи приезжают пропсами из `admin-footer.tsx`.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Rocket, ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type FooterActionLabels = {
  deploy: string; pull: string; push: string;
  deploying: string; pulling: string; pushing: string;
  deployStarted: string; deployOk: string; deployFailed: string; deployTimeout: string;
  pullOk: string; pullFailed: string;
  pushOk: string; pushFailed: string;
  notConnected: string; stateUnknown: string;
  copy: string; copied: string; copyFailed: string;
  agentHint: string;
  stateBranch: string; stateCommit: string; stateUncommitted: string;
  stateAheadBehind: string; stateCompareUnavailable: string; statePlatform: string;
};

type ProjectState = {
  connected: boolean;
  repo?: string | null; branch?: string | null; commit?: string | null; subject?: string | null;
  uncommitted?: number; ahead?: number | null; behind?: number | null; platform?: string | null;
};

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

// Буфер обмена без защищённого контекста недоступен по закону браузера, а панель
// в режиме без домена работает по http — там отказ ожидаем и обязан быть назван,
// а не проглочен. Текст в уведомлении остаётся выделяемым руками.
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function FooterActions({ labels, children }: { labels: FooterActionLabels; children?: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<ProjectState | null>(null);
  const [busy, setBusy] = useState<null | "deploy" | "pull" | "push">(null);

  const loadState = useCallback(async (withFetch = false) => {
    try {
      const r = await fetch(`/api/config/project-state${withFetch ? "?fetch=1" : ""}`, {
        cache: "no-store",
        credentials: "include",
      });
      const d = await r.json();
      setState(d?.error ? null : d);
    } catch {
      setState(null);
    }
  }, []);

  useEffect(() => { loadState(); }, [loadState]);

  // Одно уведомление на все три действия: успех гаснет сам, отказ остаётся на
  // экране с полным текстом и кнопкой копирования.
  function report(ok: boolean, title: string, text: string) {
    const body = text.trim() || "—";
    const show = ok ? toast.success : toast.error;
    show(title, {
      description: (
        <div className="mt-1 space-y-1">
          {!ok && <p className="text-[10px] leading-relaxed">{labels.agentHint}</p>}
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed">
            {body}
          </pre>
        </div>
      ),
      duration: ok ? 8000 : Infinity,
      closeButton: true,
      action: {
        label: labels.copy,
        onClick: (event) => {
          // Без этого sonner закрывает уведомление по нажатию действия — а вместе с
          // ним исчезает текст, ради которого его и открыли.
          event.preventDefault();
          copyText(body).then((done) => (done ? toast.success(labels.copied) : toast.error(labels.copyFailed)));
        },
      },
    });
  }

  // Развёртывание: собственная задача на сервере, поэтому не ответ, а опрос. Пока
  // она идёт, работает ПРЕДЫДУЩАЯ сборка — отказ ничего не роняет.
  async function deploy() {
    setBusy("deploy");
    toast.info(labels.deployStarted);
    try {
      const r = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "manual deploy" }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.error || !d.jobId) {
        report(false, labels.deployFailed, String(d.error ?? `HTTP ${r.status}`));
        setBusy(null);
        return;
      }
      const jobId = String(d.jobId);
      const startedAt = Date.now();
      const poll = setInterval(async () => {
        try {
          const s = await fetch(`/api/deploy/status?jobId=${encodeURIComponent(jobId)}`, { cache: "no-store" })
            .then((x) => x.json());
          // Состояние читается из журнала опережающей записи, который ОДИН на все
          // прогоны: пока в нём стоит чужой `jobId`, это итог ПРОШЛОГО
          // развёртывания, и принять его за свой значит объявить успех чужой
          // сборки. Ждём, пока запись станет нашей.
          const mine = !s.wal?.jobId || String(s.wal.jobId) === jobId;
          const done = mine && (s.status === "COMPLETED" || s.status === "FAILED" || s.status === "HEALTH_FAILED");
          if (!done) {
            // Страховка от вечного опроса, если запись так и не обновится.
            if (Date.now() - startedAt > 20 * 60 * 1000) {
              clearInterval(poll);
              setBusy(null);
              report(false, labels.deployFailed, labels.deployTimeout);
            }
            return;
          }
          clearInterval(poll);
          setBusy(null);
          const log = Array.isArray(s.log) ? s.log.join("\n") : String(s.log ?? "");
          if (s.status === "COMPLETED") {
            report(true, labels.deployOk, log);
          } else {
            report(false, labels.deployFailed, log || String(s.error ?? s.status));
          }
          loadState();
          router.refresh();
        } catch {
          /* сеть моргнула — опрос продолжается */
        }
      }, 3000);
    } catch (e) {
      report(false, labels.deployFailed, String((e as Error).message ?? e));
      setBusy(null);
    }
  }

  async function git(kind: "pull" | "push") {
    setBusy(kind);
    try {
      const r = await fetch(`/api/config/git-${kind}`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      const okTitle = kind === "pull" ? labels.pullOk : labels.pushOk;
      const failTitle = kind === "pull" ? labels.pullFailed : labels.pushFailed;
      if (d.success) {
        report(true, okTitle, String(d.output ?? ""));
        router.refresh();
      } else {
        report(false, failTitle, String(d.error ?? d.output ?? `HTTP ${r.status}`));
      }
    } catch (e) {
      report(false, kind === "pull" ? labels.pullFailed : labels.pushFailed, String((e as Error).message ?? e));
    } finally {
      setBusy(null);
      loadState();
    }
  }

  // Подсказка при наведении на полосу состояния: почему дальше нажимают именно ту
  // кнопку, а не другую.
  const stateTitle = state?.connected
    ? [
        `${labels.stateBranch} ${state.branch ?? "—"}`,
        `${labels.stateCommit} ${state.commit ?? "—"}${state.subject ? ` — ${state.subject}` : ""}`,
        fill(labels.stateUncommitted, { count: String(state.uncommitted ?? 0) }),
        state.behind === null || state.behind === undefined
          ? labels.stateCompareUnavailable
          : fill(labels.stateAheadBehind, { ahead: String(state.ahead ?? 0), behind: String(state.behind ?? 0) }),
        `${labels.statePlatform} ${state.platform ?? "—"}`,
      ].join("\n")
    : labels.notConnected;

  const dot = !state?.connected
    ? "bg-muted-foreground/40"
    : (state.uncommitted ?? 0) > 0
      ? "bg-amber-500"
      : (state.behind ?? 0) > 0
        ? "bg-sky-500"
        : "bg-emerald-500";

  const actions = [
    { key: "deploy" as const, Icon: Rocket, label: labels.deploy, busyLabel: labels.deploying, run: deploy },
    { key: "pull" as const, Icon: ArrowDownToLine, label: labels.pull, busyLabel: labels.pulling, run: () => git("pull") },
    { key: "push" as const, Icon: ArrowUpFromLine, label: labels.push, busyLabel: labels.pushing, run: () => git("push") },
  ];

  return (
    <>
      {/* Полоса состояния. Нажатие обновляет её, спросив у GitHub, — сравнение
          «впереди / позади» живёт кэшем и без этого стареет молча. */}
      <button
        type="button"
        onClick={() => loadState(true)}
        title={stateTitle}
        className="flex min-w-0 flex-1 items-center gap-1 font-mono text-[10px] text-muted-foreground/70 transition-colors hover:text-foreground"
      >
        <GitBranch size={9} className="shrink-0" />
        <span className="truncate">
          {state?.connected
            ? <span className="hidden sm:inline">{state.repo ?? ""}</span>
            : (state ? labels.notConnected : labels.stateUnknown)}
        </span>
        {state?.connected && state.commit && <span className="text-muted-foreground/50">{state.commit}</span>}
        <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
      </button>

      {children}

      {actions.map(({ key, Icon, label, busyLabel, run }) => (
        <button
          key={key}
          type="button"
          onClick={run}
          disabled={busy !== null}
          className="inline-flex h-5 items-center gap-1 rounded border border-border px-2 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          {busy === key ? <Loader2 size={10} className="animate-spin" /> : <Icon size={10} />}
          <span className="hidden sm:inline">{busy === key ? busyLabel : label}</span>
        </button>
      ))}
    </>
  );
}
