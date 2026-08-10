"use client";

// Подключение репозитория и отправка проекта (шаг 501, Ф2, партия 14).
//
// Островок: токен доступа — секрет, а отправка проекта возвращает вывод git,
// который надо показать целиком, включая отказ.
//
// ВАЖНОЕ РАЗЛИЧЕНИЕ, сохранённое из панели: подключение данных само по себе НИЧЕГО
// не отправляет. Пока не нажата отправка, репозиторий на GitHub остаётся пустым — и
// это читается как «не сработало». Поэтому кнопка отправки стоит отдельно и
// подписана как действие, а не как подтверждение настроек.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, GitBranch, UploadCloud, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ConnectLabels = {
  repoLabel: string; repoPlaceholder: string;
  tokenLabel: string; tokenPlaceholder: string; tokenReplace: string;
  connect: string; connecting: string; connected: string;
  push: string; pushing: string; pushed: string;
  failed: string; outputLabel: string;
};

// Инструкция подключения. Живёт ВНУТРИ островка намеренно: каждый шаг обязан
// стоять рядом со своим полем. Старая панель описывала шаги в одном месте, а
// выполнять их отправляла в другое — именно там настройку и бросали. Слова
// приходят пропсами с сервера, поэтому 82 языка в браузер не уезжают.
export type GuideLabels = {
  step1Title: string; step1Link: string; step1Body: string;
  step2Title: string; step2Link: string; step2Steps: string[];
  step2Note: string; step2Saved: string;
  step3Title: string; step3Body: string;
  step4Title: string; step4Body: string; step4Check: string; step4Open: string;
};

const NEW_REPO_URL = "https://github.com/new";
const TOKENS_URL = "https://github.com/settings/tokens";

function StepLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[10px] text-primary underline underline-offset-2"
    >
      {label} <ExternalLink size={9} />
    </a>
  );
}

export function ConnectForm(
  { repoUrl, hasToken, canPush, labels, guide }:
  { repoUrl: string; hasToken: boolean; canPush: boolean; labels: ConnectLabels; guide: GuideLabels },
) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [repo, setRepo] = useState(repoUrl);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<null | "connect" | "push">(null);
  // Вывод git показывается ЦЕЛИКОМ, включая отказ: сокращённое сообщение об ошибке
  // git — это ошибка, которую нельзя устранить.
  const [output, setOutput] = useState<{ ok: boolean; text: string } | null>(null);

  async function connect() {
    setBusy("connect");
    setOutput(null);
    try {
      const r = await fetch("/api/config/git-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repo.trim(), token: token.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setToken("");
        toast.success(labels.connected);
      } else {
        // Причина от GitHub полезнее нашей формулировки: он объясняет, что именно
        // не так с правами или адресом.
        setOutput({ ok: false, text: String(d.error ?? `${r.status}`) });
        toast.error(labels.failed);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setOutput({ ok: false, text: String((e as Error).message ?? e) });
      toast.error(labels.failed);
    } finally {
      setBusy(null);
    }
  }

  async function push() {
    setBusy("push");
    setOutput(null);
    try {
      const r = await fetch("/api/config/git-push", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      const text = String(d.output ?? d.error ?? (r.ok ? "" : `${r.status}`));
      setOutput({ ok: Boolean(d.success), text });
      if (d.success) {
        toast.success(labels.pushed);
        startTransition(() => router.refresh());
      } else {
        toast.error(labels.failed);
      }
    } catch (e) {
      setOutput({ ok: false, text: String((e as Error).message ?? e) });
      toast.error(labels.failed);
    } finally {
      setBusy(null);
    }
  }

  const repoWebUrl = (repoUrl || "").trim().replace(/\.git$/, "");

  return (
    <div className="space-y-4">
      {/* Шаг 1 — со своим полем. */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[11px] font-semibold text-foreground">{guide.step1Title}</span>
          <StepLink href={NEW_REPO_URL} label={guide.step1Link} />
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">{guide.step1Body}</p>
        <span className="block text-[10px] text-muted-foreground">{labels.repoLabel}</span>
        <Input
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder={labels.repoPlaceholder}
          className="h-8 font-mono text-[11px]"
        />
      </div>

      {/* Шаг 2 — со своим полем. Страница токенов GitHub показывает полсотни
          галочек и ни одной подсказки: названные по порядку органы управления —
          это разница между двумя минутами и брошенной настройкой. */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[11px] font-semibold text-foreground">{guide.step2Title}</span>
          <StepLink href={TOKENS_URL} label={guide.step2Link} />
        </div>
        <ol className="ml-4 list-decimal space-y-1.5 text-[10px] leading-relaxed text-muted-foreground marker:text-muted-foreground/70">
          {guide.step2Steps.map((line) => <li key={line}>{line}</li>)}
        </ol>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {guide.step2Note}{hasToken && <> {guide.step2Saved}</>}
        </p>
        <span className="block text-[10px] text-muted-foreground">{labels.tokenLabel}</span>
        <Input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={hasToken ? labels.tokenReplace : labels.tokenPlaceholder}
          autoComplete="off"
          className="h-8 font-mono text-[11px]"
        />
      </div>

      {/* Шаг 3 — не «сохранить», а «спросить GitHub». */}
      <div className="space-y-1.5">
        <span className="block text-[11px] font-semibold text-foreground">{guide.step3Title}</span>
        <p className="text-[10px] leading-relaxed text-muted-foreground">{guide.step3Body}</p>
        <Button size="sm" onClick={connect} disabled={busy !== null || !repo.trim()} className="text-[11px]">
          {busy === "connect" ? <Loader2 size={11} className="animate-spin" /> : <GitBranch size={11} />}
          {busy === "connect" ? labels.connecting : labels.connect}
        </Button>
      </div>

      {/* Шаг 4 — отдельное действие: подключение само по себе ничего не
          отправляет, и репозиторий остаётся пустым, пока это не нажато. */}
      <div className="space-y-1.5 rounded-md border border-border p-3">
        <span className="block text-[11px] font-semibold text-foreground">{guide.step4Title}</span>
        <p className="text-[10px] leading-relaxed text-muted-foreground">{guide.step4Body}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={push}
            disabled={busy !== null || !canPush}
            className="text-[11px]"
          >
            {busy === "push" ? <Loader2 size={11} className="animate-spin" /> : <UploadCloud size={11} />}
            {busy === "push" ? labels.pushing : labels.push}
          </Button>
          {repoWebUrl && <StepLink href={repoWebUrl} label={guide.step4Open} />}
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">{guide.step4Check}</p>
      </div>

      {output && (
        <div className={`rounded-md border p-2.5 ${output.ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}`}>
          <p className="mb-1 text-[10px] text-muted-foreground">{labels.outputLabel}</p>
          <pre className="max-h-52 overflow-auto font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-foreground">
            {output.text}
          </pre>
        </div>
      )}
    </div>
  );
}
