"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { getRuntimeUrls } from "@/lib/runtime-urls";
import { getAdminStrings, detectBrowserLang, DEFAULT_ADMIN_LANG } from "@/lib/i18n/admin-strings";
import { Menu, X as XIcon, Loader2, Settings, Download, Upload, RefreshCw, Info, Zap, ImagePlus, Database, Copy, Check, CornerDownLeft, Users, Rocket, BrainCircuit, Bot, HelpCircle, GitBranch, ArrowDownToLine, ArrowUpFromLine, Globe, ClipboardPaste, AlertTriangle, Repeat, Send, KeyRound, Palette, LayoutGrid, LogOut, CircleUserRound, Map as MapIcon, Brain, MessagesSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { COMING_SOON } from "./platforms";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EnvEditorPanel } from "./env-editor-panel.client";
import { MediaLibraryPanel } from "./media-library-panel.client";
import { DbBrowserPanel } from "./db-browser-panel.client";
import { UsersPanel } from "./users-panel.client";
import { DomainPanel } from "./domain-panel.client";
import { LoginMethodsPanel } from "./login-methods-panel.client";
import { OpenAiPanel } from "./openai-panel.client";
import { VectorPanel } from "./vector-panel.client";
import { MapPanel } from "./map-panel.client";
import { LightRagPanel } from "./lightrag-panel.client";
import { ChannelsPanel } from "./channels-panel.client";
import { ExportPanel, ImportPanel } from "./backup-panels.client";
import { GitHubPanel } from "./github-panel.client";
import { SiteSettingsPanel } from "./site-settings-panel.client";
import { PlatformSettingsPanel } from "./platform-settings-panel.client";
import { IdleCanvas } from "./idle-canvas.client";
import type { ComponentType } from "react";

export type SettingsPanelId = "openai"; // step 500: hermes + lightrag removed

const CAROUSEL_H = 0; // step 500: the carousel strip is gone; panels start at the top
const FOOTER_H   = 36;
// APP_URL and isLight removed — resolved at runtime via useRuntimeUrls()
const CARD_W     = 112;
const GAP        = 8;

const ANSI_CSI_RE   = /\x1b\[[0-?]*[ -/]*[@-~]/g;
const ANSI_OSC_RE   = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const ANSI_OTHER_RE = /\x1b[=>NOPVWXYZ\\\]^_]/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_OSC_RE, "").replace(ANSI_CSI_RE, "").replace(ANSI_OTHER_RE, "");
}



// PTY_URL and BRIDGE_URL removed — resolved at runtime via getRuntimeUrls()


type Props = {
  height: number;
  windowWidth: number;
  isMobile?: boolean;
  isAuthenticated?: boolean;
  isPreviewOpen?: boolean;
  onPreviewClose?: () => void;
  // (step 500) Embed sessions are gone with Hermes and LightRAG — nothing is
  // embedded in the workspace any more.
  secure?: boolean;
  insecure?: boolean;
  // Parent (workspace-controller) can request a specific settings panel to open
  // — used when clicking an unconfigured embed card to kick off onboarding.
  requestedSettingsPanel?: { id: SettingsPanelId; nonce: number } | null;
  // (step 500) The Menu button lives in the HEADER, so the drawer state is owned there
  // and handed down. The shell only renders the drawer.
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  // (step 500) The account popover moved out of the header and into the pinned
  // footer of this drawer. The session still lives in the parent, so the pieces
  // the footer shows — and the two actions it can fire — are handed down.
  accountEmail?: string | null;
  accountRoles?: string[];
  isVirtualArchitect?: boolean;
  onSignOut?: () => void;
  onRegister?: () => void;
};

export function CodingWindowShell({ height, windowWidth, isMobile = false, isAuthenticated = true, isPreviewOpen = false, onPreviewClose, secure = false, insecure = false, requestedSettingsPanel = null, menuOpen = false, onMenuOpenChange, accountEmail = null, accountRoles = [], isVirtualArchitect = false, onSignOut, onRegister }: Props) {
  const urls = useMemo(() => getRuntimeUrls(), []);
  // Bundled dictionary, browser language read once on mount — see admin-strings.
  const [lang, setLang] = useState(DEFAULT_ADMIN_LANG);
  useEffect(() => { setLang(detectBrowserLang()); }, []);
  const t = getAdminStrings(lang);
  const [carouselIdx, setCarouselIdx]       = useState(0);
  // Selective install (S5): which components this server actually installed.
  // null = unknown/loading or fetch failed → show everything (back-compat with
  // servers deployed before selective install, and never hide on a transient error).
  const [installed, setInstalled]           = useState<string[] | null>(null);
  // mirrors whether Brain/Memory have an API key. Unknown (key missing in map)
  // = never red — we only flag red on a definitive not-authed signal so a probe
  // failure never raises a false alarm.
  // System terminal (S6): a plain project-level shell, always available as the
  // last carousel card. Started once, then kept mounted; `active` toggles its
  // visibility over the agent terminals / idle canvas.
  const dataMenuOpen = menuOpen;
  const setDataMenuOpen = (v: boolean | ((p: boolean) => boolean)) =>
    onMenuOpenChange?.(typeof v === "function" ? v(menuOpen) : v);
  const [updateAvailable, setUpdateAvailable]       = useState(false);
  const [updateCount, setUpdateCount]               = useState(0);
  const [updating, setUpdating]                     = useState(false);
  const [updateLog, setUpdateLog]                   = useState<string[]>([]);
  const [showUpdateLog, setShowUpdateLog]           = useState(false);
  const [deploying, setDeploying]                   = useState(false);
  const [deployLog, setDeployLog]                   = useState<string[]>([]);
  const [showDeployLog, setShowDeployLog]           = useState(false);
  const [deploySeconds, setDeploySeconds]           = useState(0);
  const deployTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showInfo, setShowInfo]                     = useState(false);
  const [showHelp, setShowHelp]                     = useState(false);
  const [helpTipOpen, setHelpTipOpen]               = useState(false);
  const [gitRepo, setGitRepo]                       = useState<string | null>(null);
  const [gitPulling, setGitPulling]                 = useState(false);
  const [gitPushing, setGitPushing]                 = useState(false);
  const [readmeContent, setReadmeContent]           = useState<string | null>(null);
  const [showEnvEditor, setShowEnvEditor]           = useState(false);
  const [showMediaLibrary, setShowMediaLibrary]     = useState(false);
  const [showDbBrowser, setShowDbBrowser]           = useState(false);
  const [showUsers, setShowUsers]                   = useState(false);
  const [showSiteSettings, setShowSiteSettings]     = useState(false);
  const [showPlatform, setShowPlatform]             = useState(false);
  const [showDomainPanel, setShowDomainPanel]       = useState(false);
  const [showOpenAiPanel, setShowOpenAiPanel]       = useState(false);
  const [showVectorPanel, setShowVectorPanel]       = useState(false);
  const [showAuthMethods, setShowAuthMethods]       = useState(false);
  const [showMapPanel, setShowMapPanel]             = useState(false);
  const [showLightRag, setShowLightRag]             = useState(false);
  const [showChannels, setShowChannels]             = useState(false);
  const [showGitHub, setShowGitHub]                 = useState(false);
  // Three states, so the menu can say what is still missing rather than pretending
  // a filled-in field is a working connection.
  const [gitState, setGitState] = useState<"unconfigured" | "unverified" | "working" | null>(null);
  const loadGitState = useCallback(() => {
    fetch("/api/config/git-connect", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setGitState(d.state ?? "unconfigured");
        // The repository name in the footer comes from the same answer, so the
        // footer and the menu can never disagree about whether git is set up.
        const url = String(d.repoUrl ?? "").replace(/.git$/, "");
        const parts = url.split("/").filter(Boolean);
        setGitRepo(parts.length >= 2 ? `${parts[parts.length - 2]}/${parts[parts.length - 1]}` : null);
      })
      .catch(() => setGitState(null));
  }, []);
  // Derived, never stored twice: a verified connection IS a connection.
  const gitConnected = gitState === "working";
  useEffect(() => { loadGitState(); }, [loadGitState]);
  const [showExport, setShowExport]                 = useState(false);
  const [showImport, setShowImport]                 = useState(false);
  // Security tab is hidden from the UI until cert provisioning for all 6
  // subdomains ships (work in progress). The env var FRACTERA_IP_NODOMAIN_MODE
  // is still readable / settable from the terminal — this just removes the
  // half-baked UI that could lock the user out.

  // Honour parent requests to open a specific settings panel (used by Brain/Memory
  // carousel cards when the underlying service has no API key yet — opens the
  // matching panel + focuses the OpenAI key field).
  useEffect(() => {
    if (!requestedSettingsPanel) return;
    const id = requestedSettingsPanel.id;
    
    
    setShowOpenAiPanel(false);
    
    if (id === "openai") setShowOpenAiPanel(true);
    setShowEnvEditor(false);
    setShowDbBrowser(false);
    setShowUsers(false);
    setShowMediaLibrary(false);
    setShowInfo(false);
    setShowHelp(false);
    setShowDomainPanel(false);

    setShowSiteSettings(false);
    setShowPlatform(false);
  }, [requestedSettingsPanel]);
  // Login methods is a sibling slide-out drawer (same slot/zIndex as the others).
  // Rather than add setShowAuthMethods(false) to every other menu handler, close
  // it whenever any other panel opens — keeps the drawers mutually exclusive.
  useEffect(() => {
    if (showInfo || showDbBrowser || showUsers || showMediaLibrary || showHelp || showDomainPanel ||
        showOpenAiPanel || showEnvEditor ||
        showSiteSettings || showPlatform) {
      setShowAuthMethods(false);
    }
  }, [showInfo, showDbBrowser, showUsers, showMediaLibrary, showHelp, showDomainPanel,
showOpenAiPanel, showEnvEditor,
      showSiteSettings, showPlatform]);
  const deployLogRef    = useRef<HTMLDivElement>(null);
  const updateLogRef    = useRef<HTMLDivElement>(null);

  const GITHUB_URL  = process.env.NEXT_PUBLIC_GITHUB_URL  ?? "";
  const PRO_URL     = process.env.NEXT_PUBLIC_PRO_URL     ?? "";
  // Server identity for marketplace links (Skills / Product Loop). Non-secret
  // ServerToken.id baked at bootstrap (NEXT_PUBLIC_SERVER_ID). `||` so an empty
  // baked "" falls through to no-id links. Auth still uses the separate secret token.
  const SERVER_ID   = process.env.NEXT_PUBLIC_SERVER_ID || "";
  const MARKET_BASE = "https://fractera.ai";
  const idQuery     = SERVER_ID ? `?id=${encodeURIComponent(SERVER_ID)}` : "";
  const APP_VERSION = process.env.NEXT_PUBLIC_GIT_COMMIT ?? "dev";

  function handleExport() {
    setDataMenuOpen(false);
    setShowExport(true);
    setShowImport(false);
  }





  async function handleUpdate() {
    setUpdating(true);
    setShowUpdateLog(true);
    setUpdateLog(["Starting update…"]);
    try {
      const res = await fetch("/api/bridges/update/run", { method: "POST" });
      const data = await res.json();
      setUpdateLog(data.log ?? []);
      if (data.ok) { setUpdateAvailable(false); setUpdateCount(0); }
    } catch {
      setUpdateLog(["Update failed — check server logs."]);
    }
    setUpdating(false);
  }

  function stopDeployTimer() {
    if (deployTimerRef.current) { clearInterval(deployTimerRef.current); deployTimerRef.current = null; }
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
              toast.error("Deploy failed", {
                description: "Use AI agents in the terminal to fix the error and run deploy again.",
                duration: Infinity,
                closeButton: true,
              });
            }
          }
        } catch { /* keep polling */ }
      }, 3000);
    } catch {
      setDeployLog(["Deploy failed — check server logs."]);
      setDeploying(false);
      stopDeployTimer();
      toast.error("Deploy failed", {
        description: "Use AI agents in the terminal to fix the error and run deploy again.",
        duration: Infinity,
        closeButton: true,
      });
    }
  }

  function gitToastDesc(text: string) {
    return (
      <div style={{ maxHeight: 260, overflowY: "auto", whiteSpace: "pre-wrap", fontSize: 11, lineHeight: 1.5, fontFamily: "monospace" }}>
        {text}
      </div>
    );
  }

  async function handleGitPull() {
    setGitPulling(true);
    try {
      const res = await fetch("/api/config/git-pull", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Git Pull — success", {
          description: gitToastDesc(data.output || "Already up to date."),
          duration: 8000,
          closeButton: true,
        });
      } else {
        toast.error("Git Pull — error", {
          description: gitToastDesc(data.error || "Unknown error. Check server logs."),
          duration: Infinity,
          closeButton: true,
        });
      }
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
      if (data.success) {
        toast.success("Git Push — success", {
          description: gitToastDesc(data.output || "Pushed to remote."),
          duration: 8000,
          closeButton: true,
        });
      } else {
        toast.error("Git Push — error", {
          description: gitToastDesc(data.error || "Unknown error. Check server logs."),
          duration: Infinity,
          closeButton: true,
        });
      }
    } catch (e: any) {
      toast.error("Git Push — error", { description: gitToastDesc(e.message), duration: Infinity, closeButton: true });
    } finally {
      setGitPushing(false);
    }
  }

  async function handleInfo() {
    setShowEnvEditor(false);
    setShowDbBrowser(false);
    setShowMediaLibrary(false);
    setShowUsers(false);
    setShowInfo((v) => !v);
    if (!readmeContent) {
      const res = await fetch("/api/bridges/readme");
      const data = await res.json();
      setReadmeContent(data.error ? `\n> ${data.message}` : (data.content ?? ""));
    }
  }

  useEffect(() => { if (deployLogRef.current) deployLogRef.current.scrollTop = deployLogRef.current.scrollHeight; }, [deployLog]);
  useEffect(() => { if (updateLogRef.current) updateLogRef.current.scrollTop = updateLogRef.current.scrollHeight; }, [updateLog]);
  useEffect(() => {
    if (!dataMenuOpen) return;
    const close = (e: MouseEvent) => {
      const menu = document.getElementById("data-dropdown");
      if (menu && menu.contains(e.target as Node)) return;
      setDataMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [dataMenuOpen]);


  // Selective install (S5): only show the components this server installed.
  // The system terminal (S6) is NOT in this filter — it is always present.
  const isInstalled = (id: string) => installed === null || installed.includes(id);




  const total   = 1;
  const safeIdx = Math.min(carouselIdx, Math.max(total - 1, 0));
  const canPrev = safeIdx > 0;
  const canNext = safeIdx < total - 1;

  return (
    <div style={{ position: "relative", height }}>
      <style>{`
        @keyframes countdown-shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        @keyframes countdown-color { 0% { background-color: rgb(34 197 94); } 60% { background-color: rgb(251 146 60); } 100% { background-color: rgb(239 68 68); } }
      `}</style>


      {/* Click-away layer for the drawer */}
      {dataMenuOpen && (
        <div style={{ position: "absolute", inset: 0, zIndex: 55 }} onClick={() => setDataMenuOpen(false)} />
      )}

      {/* ── Settings drawer — slides in from the LEFT edge, rightwards ── */}
      <div
        id="data-dropdown"
        style={{
          position: "absolute", top: 0, left: 0, bottom: 0, width: "min(320px, 88vw)", zIndex: 58,
          transform: dataMenuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 180ms ease-out",
          visibility: dataMenuOpen ? "visible" : "hidden",
        }}
        className="bg-background border-r border-border shadow-2xl flex flex-col"
      >
        {/* Drawer head — fixed, never scrolls. */}
        <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-[12px] font-medium text-foreground">Settings</span>
          <button type="button" onClick={() => setDataMenuOpen(false)} className="text-muted-foreground hover:text-foreground">
            <XIcon size={14} />
          </button>
        </div>

        {/* Scrolling body. `min-h-0` is what actually lets a flex child shrink
            below its content height — without it the list pushes the pinned
            account footer out of view instead of scrolling. */}
        <div className="flex-1 min-h-0 overflow-y-auto py-1">
              {/* One promoted slot (owner, 2026-08-08). The menu shows what the project
                  still NEEDS: while the repository is not connected this stands first and
                  red, because nothing built here can leave the server without it. Once it
                  works it disappears from the top and reappears at the bottom as reference.
                  Only ever ONE item is promoted — a menu whose order keeps changing stops
                  being learnable. */}
              {gitState !== null && gitState !== "working" && (
                <>
                  <button type="button" onClick={() => { setDataMenuOpen(false); setShowGitHub(true); setShowUsers(false); setShowMediaLibrary(false); setShowDbBrowser(false); setShowVectorPanel(false); setShowLightRag(false); setShowMapPanel(false); setShowOpenAiPanel(false); setShowEnvEditor(false); setShowInfo(false); setShowHelp(false); setShowDomainPanel(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-destructive hover:bg-destructive/10 transition-colors">
                    <GitBranch size={11} />Connect GitHub
                    <span className="ml-auto text-[9px] uppercase tracking-wide">required</span>
                  </button>
                  <div className="h-px bg-border mx-2" />
                </>
              )}
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowUsers((v) => !v); setShowMediaLibrary(false); setShowEnvEditor(false); setShowDbBrowser(false); setShowInfo(false); setShowDomainPanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <Users size={11} />Users
              </button>
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowMediaLibrary((v) => !v); setShowEnvEditor(false); setShowDbBrowser(false); setShowInfo(false); setShowUsers(false); setShowDomainPanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <ImagePlus size={11} />Upload object
              </button>
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowDbBrowser((v) => !v); setShowEnvEditor(false); setShowMediaLibrary(false); setShowInfo(false); setShowUsers(false); setShowHelp(false); setShowDomainPanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <Database size={11} />Database
              </button>
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowVectorPanel((v) => !v); setShowOpenAiPanel(false); setShowEnvEditor(false); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); setShowDomainPanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <BrainCircuit size={11} />Vector memory
              </button>
              {/* Agentic RAG sits directly under the vector store: the two are the
                  same kind of thing — knowledge storage — and differ only in what
                  they precompute. Vectors give the nearest passage; the graph gives
                  relations across documents. */}
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowLightRag((v) => !v); setShowVectorPanel(false); setShowMapPanel(false); setShowOpenAiPanel(false); setShowEnvEditor(false); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); setShowDomainPanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <Brain size={11} />Agentic RAG
              </button>
              {/* Map settings closes the WAREHOUSE group (owner, 2026-08-08): users,
                  files, rows, vectors, the graph and the map are all places where the
                  project keeps something. The OpenAI key is not a warehouse — it is what
                  several of them consume — so it stands alone below, before the domain. */}
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowMapPanel((v) => !v); setShowOpenAiPanel(false); setShowVectorPanel(false); setShowLightRag(false); setShowEnvEditor(false); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); setShowDomainPanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <MapIcon size={11} />Map settings
              </button>
              <div className="h-px bg-border mx-2" />
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowOpenAiPanel((v) => !v); setShowMapPanel(false); setShowVectorPanel(false); setShowLightRag(false); setShowEnvEditor(false); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); setShowDomainPanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <KeyRound size={11} />OpenAI settings
              </button>
              <div className="h-px bg-border mx-2" />
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowDomainPanel((v) => !v); setShowEnvEditor(false); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-colors hover:bg-muted">
                {secure
                  ? <Globe size={11} className="text-foreground" />
                  : <AlertTriangle size={11} className="text-orange-500" />}
                <span className={!secure ? "text-orange-500 font-medium" : "text-foreground"}>Personal Domain</span>
                {!secure && <span className="ml-auto text-[10px] text-orange-500/80">not secure</span>}
              </button>
              {/* Login methods (Google / magic-link) — secure mode only: these
                  sign-in methods need a domain + HTTPS, so the entry is hidden
                  entirely in IP/insecure mode. */}
              {secure && (
                <button type="button" onClick={() => { setDataMenuOpen(false); setShowAuthMethods((v) => !v); setShowDomainPanel(false); setShowEnvEditor(false); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); setShowOpenAiPanel(false); setShowSiteSettings(false); setShowPlatform(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                  <KeyRound size={11} />Login methods
                </button>
              )}
              {/* Communication channels — how people outside reach the project.
                  Sits next to the ways in, because that is what it is: another door,
                  opened from a messenger instead of a browser. */}
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowChannels((v) => !v); setShowAuthMethods(false); setShowDomainPanel(false); setShowOpenAiPanel(false); setShowMapPanel(false); setShowVectorPanel(false); setShowLightRag(false); setShowEnvEditor(false); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <MessagesSquare size={11} />Communication channels
              </button>
              <div className="h-px bg-border mx-2" />
              <button type="button" onClick={handleExport}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <Download size={11} />Export data
              </button>
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowImport(true); setShowExport(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <Upload size={11} />Import data
              </button>
              {/* Env Variables belongs with export and import (owner, 2026-08-08):
                  all three are about what the server carries in and out of itself —
                  data in an archive, configuration in a file. */}
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowEnvEditor((v) => !v); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); setShowDomainPanel(false); setShowSiteSettings(false); setShowPlatform(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <Settings size={11} />Env Variables
              </button>
              {/* Bottom section: App Settings + Platform. */}
              <div className="h-px bg-border mx-2" />
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowSiteSettings((v) => !v); setShowPlatform(false); setShowEnvEditor(false); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); setShowDomainPanel(false); setShowOpenAiPanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <Palette size={11} />App Settings
              </button>
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowPlatform((v) => !v); setShowSiteSettings(false); setShowEnvEditor(false); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); setShowDomainPanel(false); setShowOpenAiPanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <LayoutGrid size={11} />Platform
              </button>
              {gitState === "working" && (
                <button type="button" onClick={() => { setDataMenuOpen(false); setShowGitHub(true); setShowUsers(false); setShowMediaLibrary(false); setShowDbBrowser(false); setShowVectorPanel(false); setShowLightRag(false); setShowMapPanel(false); setShowOpenAiPanel(false); setShowEnvEditor(false); setShowInfo(false); setShowHelp(false); setShowDomainPanel(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                  <GitBranch size={11} />About GitHub
                </button>
              )}
              {/* …and Help below it as the very last item — opens only a tooltip, no panel. */}
              <div className="h-px bg-border mx-2" />
              <TooltipProvider delayDuration={0}>
                <Tooltip open={helpTipOpen} onOpenChange={setHelpTipOpen}>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={() => setHelpTipOpen((o) => !o)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                      <HelpCircle size={11} />Help
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[220px] whitespace-pre-line text-[11px] leading-relaxed" style={{ zIndex: 99999 }}>
                    Got a question about your project? Just ask in the chat — it knows your full documentation and can walk you through anything.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
        </div>

        {/* Pinned account footer (step 500) — replaces the header's Account
            popover. Sits outside the scrolling body, so it stays on screen no
            matter how long the menu grows. */}
        {accountEmail && (
          <div className="shrink-0 border-t border-border px-3 py-2.5 flex flex-col gap-2">
            <p className="text-[11px] font-medium text-foreground truncate" title={accountEmail}>
              {accountEmail}
            </p>
            {accountRoles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {accountRoles.map((role) => (
                  <span key={role} className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                    {role}
                  </span>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={isVirtualArchitect ? onRegister : onSignOut}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-foreground hover:bg-muted transition-colors"
            >
              {isVirtualArchitect ? <CircleUserRound size={11} /> : <LogOut size={11} />}
              {isVirtualArchitect ? t.registerAccount : t.signOut}
            </button>
          </div>
        )}
      </div>
      {/* Light preview canvas removed — Light product retired */}

      {/* ── Users panel ── */}
      {/* REFERENCE LAYOUT for every page opened from the menu drawer (step 500):
          pinned to the top of the workspace and to the footer, spanning the full
          width. Height comes from the two anchors, never from a fixed number, so
          the page cannot overflow the footer or leave a gap under the header. */}
      {showUsers && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 10 }}>
          <UsersPanel onClose={() => setShowUsers(false)} />
        </div>
      )}


      {/* ── Site Settings panel (branding / SEO / PWA / images) ── */}
      {/* REFERENCE LAYOUT (Users) — anchors for the height, stretch for the width. */}
      {showSiteSettings && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 20 }}>
          <SiteSettingsPanel onClose={() => setShowSiteSettings(false)} />
        </div>
      )}

      {/* ── Platform panel (parallel routing / languages / theme) ── */}
      {showPlatform && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 20 }}>
          <PlatformSettingsPanel onClose={() => setShowPlatform(false)} />
        </div>
      )}

      {/* ── Env editor panel ── */}
      {/* REFERENCE LAYOUT (Users) — anchors for the height, stretch for the width. */}
      {showEnvEditor && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 20 }}>
          <EnvEditorPanel onClose={() => setShowEnvEditor(false)} />
        </div>
      )}

      {/* ── Media library panel ── */}
      {showMediaLibrary && <MediaLibraryPanel onClose={() => setShowMediaLibrary(false)} />}

      {/* ── DB browser panel ── */}
      {showDbBrowser && <DbBrowserPanel onClose={() => setShowDbBrowser(false)} />}

      {/* ── Vector memory panel ── */}
      {/* REFERENCE LAYOUT (see Users above): the two anchors give the height, the
          left/right stretch gives the width — no fixed number for either. */}
      {showVectorPanel && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 10 }}>
          <VectorPanel onClose={() => setShowVectorPanel(false)} />
        </div>
      )}

      {/* ── GitHub page ── */}
      {/* REFERENCE LAYOUT (Users) — anchors for the height, stretch for the width. */}
      {showGitHub && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 20 }}>
          <GitHubPanel onClose={() => setShowGitHub(false)} onChanged={loadGitState} />
        </div>
      )}

      {/* ── Export / Import pages ── */}
      {/* REFERENCE LAYOUT (Users) — anchors for the height, stretch for the width. */}
      {showExport && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 20 }}>
          <ExportPanel onClose={() => setShowExport(false)} />
        </div>
      )}
      {showImport && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 20 }}>
          <ImportPanel onClose={() => setShowImport(false)} />
        </div>
      )}

      {/* ── Communication channels panel ── */}
      {/* REFERENCE LAYOUT (Users) — anchors for the height, stretch for the width. */}
      {showChannels && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 20 }}>
          <ChannelsPanel onClose={() => setShowChannels(false)} />
        </div>
      )}

      {/* ── Agentic RAG panel ── */}
      {/* REFERENCE LAYOUT (Users) — anchors for the height, stretch for the width. */}
      {showLightRag && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 20 }}>
          <LightRagPanel onClose={() => setShowLightRag(false)} />
        </div>
      )}

      {/* ── Map panel ── */}
      {/* REFERENCE LAYOUT (Users) — anchors for the height, stretch for the width. */}
      {showMapPanel && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 20 }}>
          <MapPanel onClose={() => setShowMapPanel(false)} />
        </div>
      )}

      {/* ── Domain panel ── */}
      {showDomainPanel && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 20 }}>
          <DomainPanel onClose={() => setShowDomainPanel(false)} />
        </div>
      )}

      {/* ── Settings drawers — slide in from the right, never full-screen so the
            embed iframe behind stays visible. Mobile: cap at 90% viewport width. ── */}


      {showAuthMethods && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 20 }}>
          <LoginMethodsPanel onClose={() => setShowAuthMethods(false)} />
        </div>
      )}

      {/* REFERENCE LAYOUT (Users) — anchors for the height, stretch for the width. */}
      {showOpenAiPanel && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 20 }}>
          <OpenAiPanel onClose={() => setShowOpenAiPanel(false)} />
        </div>
      )}

      {/* ── Info panel (README) ── */}
      {showInfo && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 10 }}
          className="bg-background flex flex-col">
          <div className="flex items-center px-4 py-2.5 border-b border-border shrink-0">
            <span className="text-xs font-semibold text-foreground flex-1">README</span>
            <button type="button" onClick={() => setShowInfo(false)}
              className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          {readmeContent === null ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs gap-2">
              <Loader2 size={14} className="animate-spin" />Loading README…
            </div>
          ) : readmeContent.trimStart().startsWith("<") ? (
            <iframe
              srcDoc={readmeContent}
              className="flex-1 border-0 w-full"
              style={{ minHeight: 0 }}
              sandbox="allow-same-origin allow-scripts"
              title="README"
            />
          ) : (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="prose prose-sm prose-invert max-w-none text-[13px] leading-relaxed
              [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:border-b [&_h1]:border-border [&_h1]:pb-2 [&_h1]:text-foreground
              [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-foreground
              [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-foreground
              [&_p]:mb-3 [&_p]:text-foreground
              [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
              [&_code]:bg-zinc-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px] [&_code]:font-mono [&_code]:text-zinc-100
              [&_pre]:bg-zinc-900 [&_pre]:border [&_pre]:border-zinc-700 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-x-auto [&_pre]:text-[12px] [&_pre]:font-mono [&_pre]:mb-4 [&_pre]:text-zinc-100
              [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-zinc-100
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1
              [&_li]:text-foreground
              [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:text-foreground/80 [&_blockquote]:italic [&_blockquote]:my-3
              [&_table]:w-full [&_table]:text-[12px] [&_table]:border-collapse [&_table]:mb-4
              [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-muted [&_th]:font-semibold [&_th]:text-left [&_th]:text-foreground
              [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-foreground/90
              [&_hr]:border-border [&_hr]:my-4
              [&_img]:max-w-full [&_img]:rounded [&_strong]:text-foreground [&_strong]:font-semibold">
              <ReactMarkdown>{readmeContent}</ReactMarkdown>
            </div>
          </div>
          )}
        </div>
      )}

      {/* ── Help panel ── */}
      {showHelp && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 10 }}
          className="bg-background flex flex-col">
          <div className="flex items-center px-4 py-2.5 border-b border-border shrink-0">
            <span className="text-xs font-semibold text-foreground flex-1">Help</span>
            <button type="button" onClick={() => setShowHelp(false)}
              className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {[
              { title: "Upload object", desc: "Upload images, videos, and files to local S3 storage. Images can be cropped before saving." },
              { title: "Configure", desc: "Edit environment variables for the application. Changes take effect after the next deploy." },
              { title: "Database", desc: "Browse and edit database tables directly. Supports editing cells, deleting rows, and managing users." },
              { title: "Vector memory", desc: "Stores text as vectors next to your rows and finds the closest matches. Lives in the data service — one database, one backup." },
              { title: "Export", desc: "Downloads a zip archive containing your database and all storage files." },
              { title: "Import", desc: "Merges a backup zip into existing data. Existing records are not overwritten." },
            ].map(({ title, desc }) => (
              <div key={title} className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold text-foreground">{title}</span>
                <span className="text-[12px] text-muted-foreground leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GitHub Connect panel ── */}

      {/* ── Idle canvas (always behind embed/terminals; topmost when nothing else active) ── */}
      <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H }}>
        <IdleCanvas />
      </div>



      {/* ── Footer ── */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: FOOTER_H }} className="border-t border-border bg-background flex items-center gap-2 px-3">

        {/* Left: repo name (when connected) or version */}
        <span className="flex-1 flex items-center gap-2 min-w-0">
          {gitConnected && gitRepo ? (
            <span className="text-[10px] text-muted-foreground/70 font-mono select-none shrink-0 flex items-center gap-1">
              <GitBranch size={9} className="shrink-0" />{gitRepo}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/50 select-none tracking-wide shrink-0">
              {APP_VERSION}
            </span>
          )}
          {updateAvailable && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={handleUpdate} disabled={updating}
                    className="inline-flex items-center gap-1 h-4 px-1.5 rounded text-[10px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium shrink-0">
                    {updating ? <Loader2 size={9} className="animate-spin" /> : <RefreshCw size={9} />}
                    {updateCount} update{updateCount !== 1 ? "s" : ""}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[11px]" style={{ zIndex: 99999 }}>
                  Click to update Fractera Light
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </span>


        {/* Deploy button */}
        <button type="button" onClick={handleDeploy} disabled={deploying}
          className="inline-flex items-center gap-1 h-5 px-2 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none">
          {deploying ? <Loader2 size={10} className="animate-spin" /> : <Rocket size={10} />}Deploy
        </button>


        {/* Git Pull + Push (real, only when connected) */}
        {gitConnected && (
          <>
            <button type="button" onClick={handleGitPull} disabled={gitPulling || gitPushing}
              className="inline-flex items-center gap-1 h-5 px-2 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {gitPulling ? <Loader2 size={10} className="animate-spin" /> : <ArrowDownToLine size={10} />}Pull
            </button>
            <button type="button" onClick={handleGitPush} disabled={gitPulling || gitPushing}
              className="inline-flex items-center gap-1 h-5 px-2 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {gitPushing ? <Loader2 size={10} className="animate-spin" /> : <ArrowUpFromLine size={10} />}Push
            </button>
          </>
        )}

        {/* Info button */}
        <button type="button" onClick={handleInfo}
          className={`inline-flex items-center gap-1 h-5 px-2 rounded border text-[10px] transition-colors ${showInfo ? "border-yellow-400 bg-yellow-400/10 text-yellow-500 dark:text-yellow-300" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
          <Info size={10} />Info
        </button>

        {/* Go to Pro */}
        {PRO_URL && (
          <a href={PRO_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 h-5 px-2 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Zap size={10} />Pro
          </a>
        )}

        {/* GitHub */}
        {GITHUB_URL ? (
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
            className="size-[22px] rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
        ) : (
          <button type="button" disabled className="size-[22px] rounded-full border border-border flex items-center justify-center text-muted-foreground/30 cursor-default">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
          </button>
        )}
      </div>

      {/* ── Deploy log panel ── */}
      {showDeployLog && deployLog.length > 0 && (
        <div style={{ position: "absolute", bottom: FOOTER_H, left: 0, right: 0, zIndex: 9998 }}
          className="bg-zinc-950 border-t border-border flex flex-col max-h-48">
          <div className="flex items-center gap-2 px-3 pt-2 pb-1 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mr-auto">
              {deploying && <Loader2 size={10} className="animate-spin" />}Deploy log
            </span>
            <span className="text-[11px] font-mono text-muted-foreground/60 tabular-nums">
              {Math.floor(deploySeconds / 60)}:{String(deploySeconds % 60).padStart(2, "0")}
            </span>
            <button type="button" onClick={() => setShowDeployLog(false)}
              className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">close</button>
          </div>
          <div ref={deployLogRef} className="overflow-y-auto flex flex-col gap-1 px-3 pb-3">
            {deployLog.map((line, i) => (
              <span key={i} className="text-[11px] font-mono text-zinc-300 leading-relaxed">{line}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Update log panel ── */}
      {showUpdateLog && updateLog.length > 0 && (
        <div style={{ position: "absolute", bottom: FOOTER_H, left: 0, right: 0, zIndex: 9998 }}
          className="bg-zinc-950 border-t border-border flex flex-col max-h-48">
          <div className="flex items-center justify-between px-3 pt-2 pb-1 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground">Update log</span>
            <button type="button" onClick={() => setShowUpdateLog(false)}
              className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">close</button>
          </div>
          <div ref={updateLogRef} className="overflow-y-auto flex flex-col gap-1 px-3 pb-3">
            {updateLog.map((line, i) => (
              <span key={i} className="text-[11px] font-mono text-zinc-300 leading-relaxed">{line}</span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
