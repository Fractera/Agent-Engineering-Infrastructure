"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Settings, Database, ImagePlus, Users, Globe, Rocket, GitBranch, ArrowDownToLine, ArrowUpFromLine, Download, Upload } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EnvEditorPanel } from "./coding-workspace/env-editor-panel.client";
import { DbBrowserPanel } from "./coding-workspace/db-browser-panel.client";
import { MediaLibraryPanel } from "./coding-workspace/media-library-panel.client";
import { UsersPanel } from "./coding-workspace/users-panel.client";
import { DomainPanel } from "./coding-workspace/domain-panel.client";

const FOOTER_H = 40;

type Props = {
  height: number;
  windowWidth: number;
  siteUrl: string;
  isAuthenticated: boolean;
};

function gitToastDesc(text: string) {
  return (
    <div style={{ maxHeight: 260, overflowY: "auto", whiteSpace: "pre-wrap", fontSize: 11, lineHeight: 1.5, fontFamily: "monospace" }}>
      {text}
    </div>
  );
}

export function LightDashboard({ height, siteUrl, isAuthenticated }: Props) {
  const [showEnvEditor, setShowEnvEditor]       = useState(false);
  const [showDbBrowser, setShowDbBrowser]       = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showUsers, setShowUsers]               = useState(false);
  const [showDomainPanel, setShowDomainPanel]   = useState(false);

  const [deploying, setDeploying]   = useState(false);
  const [deployLog, setDeployLog]   = useState<string[]>([]);
  const [showDeployLog, setShowDeployLog] = useState(false);
  const [deploySeconds, setDeploySeconds] = useState(0);
  const deployTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deployLogRef   = useRef<HTMLDivElement>(null);

  const [gitConnected, setGitConnected] = useState(false);
  const [gitRepo, setGitRepo]           = useState<string | null>(null);
  const [gitPulling, setGitPulling]     = useState(false);
  const [gitPushing, setGitPushing]     = useState(false);

  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const [importing, setImporting]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/config/git-status")
      .then((r) => r.json())
      .then((data) => { setGitConnected(!!data.connected); setGitRepo(data.repo ?? null); })
      .catch(() => {});
  }, []);

  useEffect(() => { if (deployLogRef.current) deployLogRef.current.scrollTop = deployLogRef.current.scrollHeight; }, [deployLog]);

  useEffect(() => {
    if (!dataMenuOpen) return;
    const close = (e: MouseEvent) => {
      const menu = document.getElementById("light-data-dropdown");
      if (menu && menu.contains(e.target as Node)) return;
      setDataMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [dataMenuOpen]);

  function stopDeployTimer() {
    if (deployTimerRef.current) { clearInterval(deployTimerRef.current); deployTimerRef.current = null; }
  }

  function closeAllPanels() {
    setShowEnvEditor(false);
    setShowDbBrowser(false);
    setShowMediaLibrary(false);
    setShowUsers(false);
    setShowDomainPanel(false);
  }

  async function handleDeploy() {
    setDeploying(true);
    setShowDeployLog(true);
    setDeployLog(["Starting deploy…"]);
    setDeploySeconds(0);
    stopDeployTimer();
    deployTimerRef.current = setInterval(() => setDeploySeconds((s) => s + 1), 1000);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "manual deploy" }),
      });
      const data = await res.json();
      if (data.error) {
        setDeployLog([`Error: ${data.error}${data.jobId ? ` (job: ${data.jobId})` : ""}`]);
        setDeploying(false);
        stopDeployTimer();
        return;
      }
      const jobId = data.jobId;
      setDeployLog([`Deploy started (job: ${jobId})…`]);
      const poll = setInterval(async () => {
        try {
          const s = await fetch(`/api/deploy/status?jobId=${jobId}`).then((r) => r.json());
          if (s.log?.length) setDeployLog(s.log);
          const done = s.status === "COMPLETED" || s.status === "FAILED" || s.status === "HEALTH_FAILED";
          if (done) {
            clearInterval(poll);
            setDeploying(false);
            stopDeployTimer();
            if (s.status === "FAILED" || s.status === "HEALTH_FAILED") {
              toast.error("Deploy failed", { description: "Check the deploy log for details.", duration: Infinity, closeButton: true });
            }
          }
        } catch { /* keep polling */ }
      }, 3000);
    } catch {
      setDeployLog(["Deploy failed — check server logs."]);
      setDeploying(false);
      stopDeployTimer();
      toast.error("Deploy failed", { description: "Check server logs.", duration: Infinity, closeButton: true });
    }
  }

  async function handleGitPull() {
    setGitPulling(true);
    try {
      const res = await fetch("/api/config/git-pull", { method: "POST" });
      const data = await res.json();
      if (data.success) toast.success("Git Pull — success", { description: gitToastDesc(data.output || "Already up to date."), duration: 8000, closeButton: true });
      else toast.error("Git Pull — error", { description: gitToastDesc(data.error || "Unknown error."), duration: Infinity, closeButton: true });
    } catch (e: any) {
      toast.error("Git Pull — error", { description: gitToastDesc(e.message), duration: Infinity, closeButton: true });
    } finally {
      setGitPulling(false);
    }
  }

  async function handleGitPush() {
    setGitPushing(true);
    try {
      const res = await fetch("/api/config/git-push", { method: "POST" });
      const data = await res.json();
      if (data.success) toast.success("Git Push — success", { description: gitToastDesc(data.output || "Pushed to remote."), duration: 8000, closeButton: true });
      else toast.error("Git Push — error", { description: gitToastDesc(data.error || "Unknown error."), duration: Infinity, closeButton: true });
    } catch (e: any) {
      toast.error("Git Push — error", { description: gitToastDesc(e.message), duration: Infinity, closeButton: true });
    } finally {
      setGitPushing(false);
    }
  }

  async function handleExport() {
    setDataMenuOpen(false);
    const res = await fetch("/api/data/export");
    if (!res.ok) { toast.error("Export failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "fractera-backup.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setDataMenuOpen(false);
    const form = new FormData();
    form.append("file", file);
    const result = await fetch("/api/data/import", { method: "POST", body: form }).then((r) => r.json()).catch(() => ({ error: "Network error" }));
    setImporting(false);
    e.target.value = "";
    if (result.ok) toast.success(`Imported: ${result.stats.dbRows} DB rows, ${result.stats.mediaFiles} media files`);
    else toast.error("Import failed: " + (result.error ?? "unknown error"));
  }

  const canvasH = height - FOOTER_H;

  function ToolbarButton({ label, icon, onClick, active, disabled }: { label: string; icon: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean }) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded text-xs transition-colors ${active ? "bg-sky-500/15 text-sky-600" : "text-muted-foreground hover:text-foreground hover:bg-white/5"} disabled:opacity-40`}
          >
            {icon}
            <span className="hidden md:inline">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div style={{ position: "relative", height }}>
        {/* ── Preview canvas (always visible — Light's main surface) ── */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: canvasH }} className="bg-white">
          <iframe
            id="light-preview-iframe"
            src={siteUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Site preview"
          />
        </div>

        {/* ── Panels (overlay the canvas when open) ── */}
        {showEnvEditor && <PanelOverlay h={canvasH}><EnvEditorPanel onClose={() => setShowEnvEditor(false)} /></PanelOverlay>}
        {showDbBrowser && <PanelOverlay h={canvasH}><DbBrowserPanel onClose={() => setShowDbBrowser(false)} /></PanelOverlay>}
        {showMediaLibrary && <PanelOverlay h={canvasH}><MediaLibraryPanel onClose={() => setShowMediaLibrary(false)} /></PanelOverlay>}
        {showUsers && <PanelOverlay h={canvasH}><UsersPanel onClose={() => setShowUsers(false)} /></PanelOverlay>}
        {showDomainPanel && <PanelOverlay h={canvasH}><DomainPanel onClose={() => setShowDomainPanel(false)} /></PanelOverlay>}

        {/* ── Deploy log overlay ── */}
        {showDeployLog && (
          <div style={{ position: "absolute", right: 12, bottom: FOOTER_H + 12, width: 420, maxHeight: 320, zIndex: 50 }} className="bg-zinc-950 border border-zinc-700 rounded-lg shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
              <span className="text-xs font-mono text-zinc-300">Deploy {deploying ? `· ${deploySeconds}s` : "· done"}</span>
              <button onClick={() => setShowDeployLog(false)} className="text-zinc-500 hover:text-zinc-200 text-xs">✕</button>
            </div>
            <div ref={deployLogRef} className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] text-zinc-400 leading-relaxed whitespace-pre-wrap">
              {deployLog.join("\n")}
            </div>
          </div>
        )}

        {/* ── Footer toolbar ── */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: FOOTER_H }} className="border-t border-border bg-background flex items-center gap-1 px-3">
          <ToolbarButton label="Environment" icon={<Settings size={14} />} active={showEnvEditor} onClick={() => { const v = !showEnvEditor; closeAllPanels(); setShowEnvEditor(v); }} />
          <ToolbarButton label="Database" icon={<Database size={14} />} active={showDbBrowser} onClick={() => { const v = !showDbBrowser; closeAllPanels(); setShowDbBrowser(v); }} />
          <ToolbarButton label="Media" icon={<ImagePlus size={14} />} active={showMediaLibrary} onClick={() => { const v = !showMediaLibrary; closeAllPanels(); setShowMediaLibrary(v); }} />
          <ToolbarButton label="Users" icon={<Users size={14} />} active={showUsers} onClick={() => { const v = !showUsers; closeAllPanels(); setShowUsers(v); }} />
          <ToolbarButton label="Domain" icon={<Globe size={14} />} active={showDomainPanel} onClick={() => { const v = !showDomainPanel; closeAllPanels(); setShowDomainPanel(v); }} />

          <div className="w-px h-5 bg-border mx-1" />

          {/* Data backup dropdown */}
          <div className="relative" id="light-data-dropdown">
            <ToolbarButton label="Backup" icon={<Download size={14} />} onClick={() => setDataMenuOpen((v) => !v)} />
            {dataMenuOpen && (
              <div className="absolute bottom-9 left-0 w-44 bg-popover border border-border rounded-lg shadow-xl p-1 flex flex-col gap-0.5" style={{ zIndex: 60 }}>
                <button onClick={handleExport} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-white/5 text-foreground"><Download size={13} /> Export backup</button>
                <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-white/5 text-foreground disabled:opacity-40"><Upload size={13} /> {importing ? "Importing…" : "Import backup"}</button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleImport} />
          </div>

          {/* GitHub sync */}
          {gitConnected && (
            <>
              <ToolbarButton label={gitPulling ? "Pulling…" : "Pull"} icon={<ArrowDownToLine size={14} />} disabled={gitPulling} onClick={handleGitPull} />
              <ToolbarButton label={gitPushing ? "Pushing…" : "Push"} icon={<ArrowUpFromLine size={14} />} disabled={gitPushing} onClick={handleGitPush} />
            </>
          )}
          {!gitConnected && gitRepo === null && (
            <ToolbarButton label="GitHub" icon={<GitBranch size={14} />} onClick={() => toast.info("Connect GitHub", { description: "Configure USER_GITHUB_REPO + USER_GITHUB_TOKEN in Environment settings to enable git sync." })} />
          )}

          <div className="flex-1" />

          {/* Deploy */}
          <button
            type="button"
            onClick={handleDeploy}
            disabled={deploying || !isAuthenticated}
            className="flex items-center gap-1.5 h-7 px-3 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-40"
          >
            <Rocket size={14} />
            {deploying ? `Deploying… ${deploySeconds}s` : "Deploy"}
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
}

function PanelOverlay({ children, h }: { children: React.ReactNode; h: number }) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: h, zIndex: 40 }} className="bg-background overflow-auto">
      {children}
    </div>
  );
}
