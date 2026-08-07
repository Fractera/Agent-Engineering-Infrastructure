"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { X, GitBranch, Loader2, CheckCircle, AlertCircle, ExternalLink, ArrowUpFromLine } from "lucide-react";
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
  const [pushing, setPushing] = useState(false);
  const [pushLog, setPushLog] = useState<{ ok: boolean; text: string } | null>(null);

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

  // Sending the project. This is the step the whole page exists for — connecting
  // credentials changes nothing by itself, and until this runs the repository on
  // GitHub stays empty, which reads as "it did not work".
  async function push() {
    setPushing(true);
    setPushLog(null);
    try {
      const r = await fetch("/api/config/git-push", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      const text = String(d.output ?? d.error ?? (r.ok ? "Done." : `Failed (${r.status})`));
      setPushLog({ ok: Boolean(d.success), text });
      if (d.success) {
        toast.success("Project sent to GitHub");
        await load();
        onChanged?.();
      } else {
        toast.error("Push failed");
      }
    } catch (e) {
      setPushLog({ ok: false, text: String((e as Error).message ?? e) });
      toast.error("Push failed");
    } finally {
      setPushing(false);
    }
  }

  const s = status?.state ?? "unconfigured";
  const repoWebUrl = (status?.repoUrl ?? "").replace(/.git$/, "");

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
          {/* The token page shows about fifty checkboxes and no guidance at all.
              Naming the exact controls, in order, is the difference between two
              minutes and giving up. */}
          <ol className="text-[10px] text-muted-foreground leading-relaxed flex flex-col gap-1.5 list-none">
            <li>
              <strong>2.1</strong> Open the link above. It lands on{" "}
              <strong>Tokens (classic)</strong>. Press{" "}
              <strong>Generate new token</strong> and choose{" "}
              <strong>Generate new token (classic)</strong>.
            </li>
            <li>
              <strong>2.2</strong> <strong>Note</strong> — a name for yourself, so you
              recognise it in a year. Something like <em>Fractera server</em>. GitHub does not use it.
            </li>
            <li>
              <strong>2.3</strong> <strong>Expiration</strong> — pick a date. When it
              passes, pushing simply stops working and you come back here with a new token. A long
              expiry is convenient; a short one is safer. <strong>No expiration</strong>{" "}
              works but means a leaked token stays useful forever.
            </li>
            <li>
              <strong>2.4</strong> <strong>Select scopes</strong> — the long list. Tick
              exactly ONE: <code className="font-mono">repo</code>, the first line, described as{" "}
              <em>Full control of private repositories</em>. Its five indented children tick themselves —
              that is expected. Touch nothing else: packages, workflows, org and admin scopes are not
              needed here, and every extra tick widens what a stolen token could do.
            </li>
            <li>
              <strong>2.5</strong> Scroll to the bottom and press{" "}
              <strong>Generate token</strong>.
            </li>
            <li>
              <strong>2.6</strong> Copy it at once. GitHub shows the value <strong>one time only</strong>;
              leave the page and it cannot be read again — only replaced.
            </li>
            <li>
              <strong>2.7</strong> Paste it below and press <strong>Save and verify</strong>. If GitHub
              refuses it, the reason appears here rather than later during a push.
            </li>
          </ol>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            A public repository can be read without a token, but writing to any repository needs one.
            {status?.hasToken && <> A token is already saved — leave the field empty to keep it.</>}
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

        {/* Step four: the point of the whole page. Saving credentials changes nothing
            on GitHub — until this runs, the repository is empty and the setup looks
            like it failed. */}
        {s === "working" && (
          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            <span className="text-[11px] font-semibold text-foreground">4. Send the project to GitHub</span>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Connecting the credentials does not move a single file. This does: it packages what is on
              the server right now and sends it to your repository.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" onClick={push} disabled={pushing}
                className="px-3 py-1.5 text-[11px] rounded-md border border-border bg-primary text-primary-foreground hover:bg-primary/85 transition-colors disabled:opacity-40 flex items-center gap-1.5">
                {pushing ? <Loader2 size={11} className="animate-spin" /> : <ArrowUpFromLine size={11} />}
                {pushing ? "Sending…" : "Send project to GitHub"}
              </button>
              {repoWebUrl && (
                <a href={repoWebUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-primary underline underline-offset-2 inline-flex items-center gap-1">
                  open the repository to check <ExternalLink size={9} />
                </a>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>How to tell it worked:</strong> open the repository in a browser and refresh. Files
              appear, and the commit list shows one entry from this server. If the page is still empty,
              the message below says why.
            </p>
            {pushLog && (
              <pre className={`text-[10px] font-mono leading-relaxed whitespace-pre-wrap rounded-md border p-2.5 max-h-40 overflow-y-auto
                ${pushLog.ok ? "border-border text-muted-foreground" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
                {pushLog.text}
              </pre>
            )}
          </div>
        )}

        {/* The questions that arrive right after the first push. */}
        {s === "working" && (
          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            <span className="text-[11px] font-semibold text-foreground">What happens after this</span>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>This button&apos;s real job is the FIRST transfer.</strong> Nothing in this admin
              panel writes code: you work here with data and settings, and those are excluded from the
              repository on purpose — the database, uploaded files, the environment file and the
              application settings all stay on the server. So sending the project is how your repository
              gets its starting point, once.
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>After that the direction reverses.</strong> Developers write code on their machines
              and push it to the repository; this server PULLS it. That is the normal rhythm, and it is
              why the footer offers Pull as well as Push.
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>Do I press it again?</strong> Rarely — only if something genuinely changed the code
              on the server. Pressing it with nothing changed is harmless: git reports there was nothing
              to send.
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>Will it clash with work done on a laptop?</strong> It can, and the rule that avoids
              it is simple: at any moment, one side is the source of truth. If your developers work in the
              repository, the server should PULL and not push — otherwise two histories grow apart and git
              refuses to merge them. If the work happens here, on the server, push from here and let the
              laptops pull.
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>What if a push is refused?</strong> The usual cause is exactly that: the repository
              moved ahead of the server. Pull first, then push. The message above names it.
            </p>
          </div>
        )}

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
