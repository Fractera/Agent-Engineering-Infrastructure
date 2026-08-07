"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { X, GitBranch, Loader2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { GitHubHelp } from "./help-note.client";

type State = "unconfigured" | "unverified" | "working";

type Status = {
  state: State;
  repoUrl: string;
  hasToken: boolean;
  verifiedAt: string | null;
  pendingFiles: number;
  sample: string[];
};

// Connecting a repository. (step 500) Every instruction stands next to the field
// it is about: the old panel described the steps and then sent the owner to the
// Env Variables screen to carry them out. Reading in one place and typing in
// another is where people abandon a setup — and this is the setup they cannot
// skip, because git is the only way their work leaves this server.
export function GitHubPanel({ onClose, onChanged }: { onClose: () => void; onChanged?: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/config/git-connect", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) { setError(String(d.error ?? `Could not read the status (${r.status})`)); return; }
      setStatus(d);
      setRepoUrl(d.repoUrl ?? "");
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/config/git-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repoUrl.trim(), token: token.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setToken("");
        toast.success("GitHub connected and verified");
        await load();
        onChanged?.();
      } else {
        setError(String(d.error ?? `Could not connect (${r.status})`));
        await load();
        onChanged?.();
      }
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setSaving(false);
    }
  }

  const s = status?.state ?? "unconfigured";

  return (
    <div className="flex flex-col w-full h-full bg-background border-t border-border">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
          <GitBranch size={13} />
          GitHub repository
          <GitHubHelp />
          {s === "working" && (
            <span className="flex items-center gap-1 text-[10px] text-green-500"><CheckCircle size={10} />verified</span>
          )}
          {s === "unverified" && (
            <span className="flex items-center gap-1 text-[10px] text-amber-500"><AlertCircle size={10} />saved, not verified</span>
          )}
          {s === "unconfigured" && (
            <span className="flex items-center gap-1 text-[10px] text-destructive"><AlertCircle size={10} />not connected</span>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 w-full">
        {s !== "working" && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-[11px] text-destructive leading-relaxed">
            Until this is connected, nothing you build here can leave the server. The backup archive
            carries your data — rows, files, knowledge — but not your source code. Git is the only road
            out for that.
          </div>
        )}

        {/* Step one, with its own field. */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold text-foreground">1. The repository address</span>
            <a href="https://github.com/new" target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-primary underline underline-offset-2 inline-flex items-center gap-1">
              create a new one <ExternalLink size={9} />
            </a>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Open your repository on GitHub and copy the address from the browser bar, or from the green
            <strong> Code</strong> button. It looks like <code className="font-mono">https://github.com/owner/name</code>.
          </p>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            className="px-2.5 py-1.5 text-[11px] border border-border rounded-md bg-background text-foreground
                       placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
        </div>

        {/* Step two, with its own field. */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold text-foreground">2. An access token</span>
            <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-primary underline underline-offset-2 inline-flex items-center gap-1">
              open the token page <ExternalLink size={9} />
            </a>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            On GitHub: <strong>Settings → Developer Settings → Personal Access Tokens → Tokens (classic) →
            Generate new token</strong>, with the <code className="font-mono">repo</code> scope. A public
            repository can be read without a token, but writing to any repository needs one.
            {status?.hasToken && <> A token is already saved — leave this empty to keep it.</>}
          </p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={status?.hasToken ? "Saved — type here only to replace it" : "ghp_…"}
            className="px-2.5 py-1.5 text-[11px] border border-border rounded-md bg-background text-foreground
                       placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
        </div>

        {/* Step three: proving it, not assuming it. */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-foreground">3. Connect and verify</span>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Saving asks GitHub straight away whether these credentials actually reach that repository.
            Green here means a real answer came back — not that the fields are filled in.
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={save} disabled={saving || !repoUrl.trim()}
              className="px-3 py-1.5 text-[11px] rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-40 flex items-center gap-1.5">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <GitBranch size={11} />}
              {saving ? "Asking GitHub…" : "Save and verify"}
            </button>
            {status?.verifiedAt && (
              <span className="text-[10px] text-muted-foreground">
                last verified {new Date(status.verifiedAt).toLocaleString()}
              </span>
            )}
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5">
              <AlertCircle size={13} className="text-destructive mt-0.5 shrink-0" />
              <span className="text-[10px] text-destructive leading-relaxed">{error}</span>
            </div>
          )}
        </div>

        {/* What the first push would carry. Sending blind is why people hesitate. */}
        {status && status.pendingFiles > 0 && (
          <div className="rounded-md border border-border p-3 flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-foreground">
              Waiting to be pushed: {status.pendingFiles} file(s)
            </span>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Secrets and build output are excluded automatically — <code className="font-mono">.env.local</code>,
              <code className="font-mono"> node_modules</code>, <code className="font-mono">.next</code> and
              uploaded storage never leave.
            </p>
            <ul className="text-[10px] text-muted-foreground font-mono leading-relaxed">
              {status.sample.map((f) => <li key={f} className="truncate">{f}</li>)}
              {status.pendingFiles > status.sample.length && (
                <li className="text-muted-foreground/70">…and {status.pendingFiles - status.sample.length} more</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
