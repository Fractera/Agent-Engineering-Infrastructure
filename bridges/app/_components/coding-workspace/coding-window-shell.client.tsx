"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { getRuntimeUrls } from "@/lib/runtime-urls";
import { Wifi, WifiOff, Loader2, ChevronLeft, ChevronRight, Store, Settings, Download, Upload, RefreshCw, Info, Zap, ImagePlus, Database, Copy, Check, CornerDownLeft, Users, Rocket, BrainCircuit, Bot, HelpCircle, GitBranch, ArrowDownToLine, ArrowUpFromLine, Globe, ClipboardPaste, AlertTriangle, Repeat, Send, KeyRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { XtermTerminal, type XtermTerminalHandle } from "@/components/ai-elements/xterm-terminal.client";
import { PLATFORMS, COMING_SOON, EMBED_CARDS, type Platform, type TerminalStatus, type EmbedCard, type EmbedCardId, type EmbedTarget } from "./platforms";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EnvEditorPanel } from "./env-editor-panel.client";
import { MediaLibraryPanel } from "./media-library-panel.client";
import { DbBrowserPanel } from "./db-browser-panel.client";
import { AUTH_FLOW_DESCRIPTORS, type AuthFlowDescriptor } from "./auth-flow-descriptors";
import { AuthFlowModal } from "./auth-flow-modal.client";
import { PasteTextModal } from "./paste-text-modal.client";
import { UsersPanel } from "./users-panel.client";
import { DomainPanel } from "./domain-panel.client";
import { LightRagPanel } from "./lightrag-panel.client";
import { HermesPanel } from "./hermes-panel.client";
import { OpenAiPanel } from "./openai-panel.client";
import { DeploymentsPanel } from "./deployments-panel.client";
import { EmbedCanvas } from "./embed-canvas.client";
import { IdleCanvas } from "./idle-canvas.client";
import type { ComponentType } from "react";

export type SettingsPanelId = "hermes" | "lightrag" | "openai";

const CAROUSEL_H = 52;
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

const BRIDGE_TOOLTIP = "Bridge — all platform servers status\n\nOne process runs all platforms:\nClaude Code :3200 · PTY :3201\nCodex :3202 · Gemini :3203\nQwen :3204 · Kimi :3205\n\n🟢 Online — all platforms available\n🔴 Offline — bridge server not running\n\nTo start: cd bridges/platforms && node server.js";


// PTY_URL and BRIDGE_URL removed — resolved at runtime via getRuntimeUrls()

function TerminalDot({ status }: { status: TerminalStatus }) {
  if (status === "unavailable") return <span className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />;
  if (status === "connecting")  return <span className="size-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />;
  if (status === "connected")   return <span className="size-1.5 rounded-full bg-green-500 shrink-0" />;
  return null;
}

function InstallPromptTooltip({ label, prompt, docsUrl }: { label: string; prompt: string; docsUrl: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="px-3 py-2.5 flex flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-white text-[12px]">{label} — not installed</span>
        <span className="text-white/70 text-[11px] leading-relaxed">
          Copy the prompt below and paste it into Claude Code — it will install the platform automatically using the project docs.
        </span>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 h-7 px-3 rounded bg-white/10 hover:bg-white/20 text-[11px] text-white transition-colors w-full justify-center"
      >
        {copied ? <><Check size={11} className="text-green-400" />Copied!</> : <><Copy size={11} />Copy install prompt</>}
      </button>
      <a
        href={docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 h-7 px-3 rounded bg-white/5 hover:bg-white/10 text-[11px] text-white/60 hover:text-white/90 transition-colors w-full justify-center"
      >
        Official docs ↗
      </a>
    </div>
  );
}

type Props = {
  height: number;
  terminalPlatform: Platform;
  terminalSessions: Set<Platform>;
  onPlatformClick: (p: Platform) => void;
  onTerminalClose: (p: Platform) => void;
  windowWidth: number;
  isMobile?: boolean;
  isAuthenticated?: boolean;
  isPreviewOpen?: boolean;
  onPreviewClose?: () => void;
  // Every mounted embed session (Brain / Memory / Hermes dashboard). The shell
  // renders one EmbedCanvas per entry and toggles visibility via `activeEmbedId`
  // so switching cards never unmounts an iframe and loses the chat. (step 96)
  embeds?: { id: EmbedTarget; url: string; title: string; Icon: ComponentType<{ size?: number; className?: string }> }[];
  activeEmbedId?: EmbedTarget | null;
  onEmbedCardClick?: (card: EmbedCard) => void;
  // Explicit animated "End session" on an embed card — the only path that tears
  // down a chat iframe (switching cards never does). (step 96)
  onEmbedClose?: (id: EmbedTarget) => void;
  // Open the native Hermes agent dashboard (:9119) in the embed canvas — wired
  // to the "Hermes Agent" item in the Settings menu.
  onOpenHermesDashboard?: () => void;
  secure?: boolean;
  // Parent (workspace-controller) can request a specific settings panel to open
  // — used when clicking an unconfigured embed card to kick off onboarding.
  requestedSettingsPanel?: { id: SettingsPanelId; nonce: number } | null;
};

export function CodingWindowShell({ height, terminalPlatform, terminalSessions, onPlatformClick, onTerminalClose, windowWidth, isMobile = false, isAuthenticated = true, isPreviewOpen = false, onPreviewClose, embeds = [], activeEmbedId = null, onEmbedCardClick, onEmbedClose, onOpenHermesDashboard, secure = false, requestedSettingsPanel = null }: Props) {
  const urls = useMemo(() => getRuntimeUrls(), []);
  const [terminalStatuses] = useState<Record<Platform, TerminalStatus>>({
    "claude-code": "unavailable", "codex": "unavailable", "gemini-cli": "unavailable",
    "qwen-code": "unavailable", "kimi-code": "unavailable",
  });
  const [bridgeStatus, setBridgeStatus]     = useState<"unknown" | "online" | "offline">("unknown");
  const [carouselIdx, setCarouselIdx]       = useState(0);
  // Selective install (S5): which components this server actually installed.
  // null = unknown/loading or fetch failed → show everything (back-compat with
  // servers deployed before selective install, and never hide on a transient error).
  const [installed, setInstalled]           = useState<string[] | null>(null);
  // System terminal (S6): a plain project-level shell, always available as the
  // last carousel card. Started once, then kept mounted; `active` toggles its
  // visibility over the agent terminals / idle canvas.
  const [sysTermStarted, setSysTermStarted] = useState(false);
  const [sysTermActive, setSysTermActive]   = useState(false);
  const sysTermRef = useRef<XtermTerminalHandle | null>(null);
  const [confirmingPlatform, setConfirmingPlatform] = useState<Platform | null>(null);
  // Embed "End session" confirm state — mirror of confirmingPlatform for the
  // Brain/Memory carousel cards (step 96). Second click on the active embed card
  // arms a 2s animated countdown that calls onEmbedClose.
  const [confirmingEmbed, setConfirmingEmbed]       = useState<EmbedTarget | null>(null);
  const embedCountdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dataMenuOpen, setDataMenuOpen]             = useState(false);
  const [importing, setImporting]                   = useState(false);
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
  const [showGitConnect, setShowGitConnect]         = useState(false);
  const [gitConnected, setGitConnected]             = useState(false);
  const [gitRepo, setGitRepo]                       = useState<string | null>(null);
  const [gitPulling, setGitPulling]                 = useState(false);
  const [gitPushing, setGitPushing]                 = useState(false);
  const [readmeContent, setReadmeContent]           = useState<string | null>(null);
  const [showEnvEditor, setShowEnvEditor]           = useState(false);
  const [showMediaLibrary, setShowMediaLibrary]     = useState(false);
  const [showDbBrowser, setShowDbBrowser]           = useState(false);
  const [showUsers, setShowUsers]                   = useState(false);
  const [showDeployments, setShowDeployments]       = useState(false);
  const [showDomainPanel, setShowDomainPanel]       = useState(false);
  const [showLightRag, setShowLightRag]             = useState(false);
  const [showHermesPanel, setShowHermesPanel]       = useState(false);
  const [showOpenAiPanel, setShowOpenAiPanel]       = useState(false);
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
    setShowHermesPanel(false);
    setShowLightRag(false);
    setShowOpenAiPanel(false);
    if (id === "hermes") setShowHermesPanel(true);
    else if (id === "openai") setShowOpenAiPanel(true);
    else setShowLightRag(true);
    setShowEnvEditor(false);
    setShowDbBrowser(false);
    setShowUsers(false);
    setShowMediaLibrary(false);
    setShowInfo(false);
    setShowHelp(false);
    setShowDomainPanel(false);
    setShowDeployments(false);
  }, [requestedSettingsPanel]);
  const [activeAuth, setActiveAuth]                 = useState<{ descriptor: AuthFlowDescriptor; url: string; code?: string } | null>(null);
  const [pasteModalOpen, setPasteModalOpen]         = useState(false);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const rawBufRef       = useRef<string>("");
  const xtermRefs       = useRef<Partial<Record<Platform, XtermTerminalHandle | null>>>({});
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
  const SKILLS_HREF       = `${MARKET_BASE}/skills${idQuery}`;
  const PRODUCT_LOOP_HREF = `${MARKET_BASE}/product-loop${idQuery}`;
  const APP_VERSION = process.env.NEXT_PUBLIC_GIT_COMMIT ?? "dev";
  const countdownRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlDetectTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAuthRef   = useRef<typeof activeAuth>(null);

  function handleTerminalData(chunk: string) {
    const clean = stripAnsi(chunk).replace(/\r\n|\r|\n/g, " ");
    rawBufRef.current = (rawBufRef.current + clean).slice(-4000);
    if (activeAuthRef.current) return;
    if (urlDetectTimer.current) clearTimeout(urlDetectTimer.current);
    urlDetectTimer.current = setTimeout(() => {
      if (activeAuthRef.current) return;
      const bufForSearch = rawBufRef.current.replace(/ /g, "");
      for (const descriptor of AUTH_FLOW_DESCRIPTORS) {
        const match = bufForSearch.match(descriptor.detectUrl);
        if (match) {
          // bufForSearch has all spaces removed — PTY line-wrap artifacts are gone,
          // URL is reconstructed whole. detectUrl patterns end at &state=<value>
          // so the match stops precisely at the URL boundary.
          let extractedUrl = match[0];
          // Guard against duplicate URLs if PTY reprints via \r.
          const dupeIdx = extractedUrl.indexOf("https://", 8);
          if (dupeIdx !== -1) extractedUrl = extractedUrl.slice(0, dupeIdx);
          // For device-code flow, extract the one-time code from the raw buffer (spaces
          // preserved so the match stops at whitespace and doesn't bleed into the next word)
          let extractedCode: string | undefined;
          if (descriptor.detectCode) {
            const codeMatch = rawBufRef.current.match(descriptor.detectCode);
            if (codeMatch) extractedCode = codeMatch[0];
          }
          const next = { descriptor, url: extractedUrl, code: extractedCode };
          activeAuthRef.current = next;
          setActiveAuth(next);
          break;
        }
      }
    }, 300);
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

  useEffect(() => {
    const ws = new WebSocket(urls.claudeUrl);
    const timer = setTimeout(() => { ws.close(); setBridgeStatus("offline"); }, 3000);
    ws.onopen  = () => { clearTimeout(timer); ws.close(); setBridgeStatus("online"); };
    ws.onerror = () => { clearTimeout(timer); setBridgeStatus("offline"); };
    return () => { clearTimeout(timer); try { ws.close(); } catch {} };
  }, []);

  function handleCardClick(platformId: Platform) {
    onPreviewClose?.();
    setSysTermActive(false);
    cancelEmbedConfirm();
    setShowEnvEditor(false);
    setShowMediaLibrary(false);
    setShowDbBrowser(false);
    setShowUsers(false);
    setShowInfo(false);
    setShowHelp(false);
    setShowGitConnect(false);
    const isRunning = terminalSessions.has(platformId);
    if (isRunning && terminalPlatform === platformId) {
      if (confirmingPlatform === platformId) {
        if (countdownRef.current) clearTimeout(countdownRef.current);
        countdownRef.current = null;
        setConfirmingPlatform(null);
      } else {
        if (countdownRef.current) clearTimeout(countdownRef.current);
        setConfirmingPlatform(platformId);
        countdownRef.current = setTimeout(() => {
          onTerminalClose(platformId);
          setConfirmingPlatform(null);
          countdownRef.current = null;
        }, 2000);
      }
    } else if (isRunning) {
      if (confirmingPlatform === platformId) {
        if (countdownRef.current) clearTimeout(countdownRef.current);
        countdownRef.current = null;
        setConfirmingPlatform(null);
      }
      onPlatformClick(platformId);
    } else {
      onPlatformClick(platformId);
    }
  }

  // Cancel any pending embed "End session" countdown (called when the user
  // navigates to another surface instead of confirming the close).
  function cancelEmbedConfirm() {
    if (embedCountdownRef.current) clearTimeout(embedCountdownRef.current);
    embedCountdownRef.current = null;
    setConfirmingEmbed(null);
  }

  // Carousel Brain/Memory card click. Mirrors handleCardClick for CLI agents:
  // a click on a card that isn't the visible surface just switches to it (the
  // iframe is already mounted, so the chat is preserved); a second click on the
  // already-active card arms a 2s animated "End session" countdown that closes
  // the iframe via onEmbedClose. Switching never tears the session down. (step 96)
  function handleEmbedClick(card: EmbedCard) {
    const isActive = activeEmbedId === card.id && !sysTermActive;
    if (isActive) {
      if (confirmingEmbed === card.id) {
        cancelEmbedConfirm();
      } else {
        if (embedCountdownRef.current) clearTimeout(embedCountdownRef.current);
        setConfirmingEmbed(card.id);
        embedCountdownRef.current = setTimeout(() => {
          onEmbedClose?.(card.id);
          setConfirmingEmbed(null);
          embedCountdownRef.current = null;
        }, 2000);
      }
    } else {
      cancelEmbedConfirm();
      setSysTermActive(false);
      onEmbedCardClick?.(card);
    }
  }

  useEffect(() => {
    fetch("/api/bridges/update/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.available) { setUpdateAvailable(true); setUpdateCount(data.count); }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/config/git-status")
      .then((r) => r.json())
      .then((data) => { setGitConnected(!!data.connected); setGitRepo(data.repo ?? null); })
      .catch(() => {});
  }, []);

  // Load the installed-component manifest (S5). On any failure we leave
  // `installed` null → everything shows (safe default; never hide on error).
  useEffect(() => {
    fetch("/api/config/components")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data && Array.isArray(data.components)) setInstalled(data.components); })
      .catch(() => {});
  }, []);

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

  function handleSendAuthCode(code: string) {
    xtermRefs.current[terminalPlatform]?.sendStdin(code + "\n");
    // xterm canvas freezes until it receives a DOM event — focus it so the
    // PTY response renders immediately without requiring a mouse move.
    setTimeout(() => { xtermRefs.current[terminalPlatform]?.focus(); }, 80);
  }

  function handleSendPasteText(text: string) {
    // The system terminal (S6) is tracked separately from terminalPlatform —
    // when it's the active card, paste must target its ref, not a CLI terminal
    // (otherwise paste silently goes nowhere). → step 95.
    const target = sysTermActive ? sysTermRef.current : xtermRefs.current[terminalPlatform];
    target?.sendStdin(text);
    setTimeout(() => { target?.focus(); }, 80);
  }

  function handleCloseAuthModal() {
    activeAuthRef.current = null;
    setActiveAuth(null);
    rawBufRef.current = "";
  }

  useEffect(() => () => {
    if (countdownRef.current) clearTimeout(countdownRef.current);
    if (embedCountdownRef.current) clearTimeout(embedCountdownRef.current);
  }, []);
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "V") { e.preventDefault(); setPasteModalOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Selective install (S5): only show the components this server installed.
  // The system terminal (S6) is NOT in this filter — it is always present.
  const isInstalled = (id: string) => installed === null || installed.includes(id);
  const visiblePlatforms  = PLATFORMS.filter((p) => isInstalled(p.id));
  const visibleEmbedCards = EMBED_CARDS.filter((c) => isInstalled(c.id));

  const termH   = height - CAROUSEL_H - FOOTER_H;
  const total   = visiblePlatforms.length + 1; // +1 for the always-present Terminal card
  const safeIdx = Math.min(carouselIdx, Math.max(total - 1, 0));
  const canPrev = safeIdx > 0;
  const canNext = safeIdx < total - 1;

  return (
    <div style={{ position: "relative", height }}>
      <style>{`
        @keyframes countdown-shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        @keyframes countdown-color { 0% { background-color: rgb(34 197 94); } 60% { background-color: rgb(251 146 60); } 100% { background-color: rgb(239 68 68); } }
      `}</style>

      {/* ── Auth Flow Modal ── */}
      {activeAuth && (
        <AuthFlowModal
          descriptor={activeAuth.descriptor}
          url={activeAuth.url}
          code={activeAuth.code}
          onClose={handleCloseAuthModal}
          onSendCode={handleSendAuthCode}
        />
      )}

      {/* ── Paste Text Modal ── */}
      <PasteTextModal
        open={pasteModalOpen}
        onClose={() => setPasteModalOpen(false)}
        onSend={handleSendPasteText}
      />

      {/* ── Carousel ── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: CAROUSEL_H }} className="border-b border-border bg-background flex items-center gap-2 px-2">
        {(
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`shrink-0 flex items-center justify-center gap-1.5 rounded-md border border-border h-9 text-[11px] text-muted-foreground select-none px-2 cursor-help${!isAuthenticated ? " opacity-40 pointer-events-none" : ""}`}>
                  {bridgeStatus === "online"  && <><Wifi size={12} className="text-green-500" />{!isMobile && <span className="text-green-500 font-medium">Bridge</span>}</>}
                  {bridgeStatus === "offline" && <><WifiOff size={12} className="text-destructive" />{!isMobile && <span className="text-destructive">Offline</span>}</>}
                  {bridgeStatus === "unknown" && <><Loader2 size={12} className="animate-spin" />{!isMobile && <span>Bridge…</span>}</>}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] whitespace-pre-line text-[11px] leading-relaxed" style={{ zIndex: 99999 }}>
                {BRIDGE_TOOLTIP}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Settings button */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => isAuthenticated && setDataMenuOpen((v) => !v)}
            className={`flex items-center justify-center gap-1.5 rounded-md border border-border h-9 text-[11px] text-muted-foreground select-none px-2 transition-colors${isAuthenticated ? " hover:text-foreground hover:bg-muted" : " opacity-40 cursor-not-allowed"}`}
          >
            {importing ? <Loader2 size={12} className="animate-spin" /> : <Settings size={12} />}
            {!isMobile && <span className="font-medium">Settings</span>}
          </button>
          {dataMenuOpen && (
            <div id="data-dropdown" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 99999 }}
              className="bg-background border border-border rounded-md shadow-lg overflow-hidden min-w-[208px]">
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowUsers((v) => !v); setShowMediaLibrary(false); setShowEnvEditor(false); setShowDbBrowser(false); setShowInfo(false); setShowDomainPanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <Users size={11} />Users
              </button>
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowMediaLibrary((v) => !v); setShowEnvEditor(false); setShowDbBrowser(false); setShowInfo(false); setShowUsers(false); setShowDomainPanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <ImagePlus size={11} />Upload media
              </button>
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowDbBrowser((v) => !v); setShowEnvEditor(false); setShowMediaLibrary(false); setShowInfo(false); setShowUsers(false); setShowHelp(false); setShowDomainPanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <Database size={11} />Database
              </button>
              {/* Hermes Agent — opens the native :9119 dashboard in the embed
                  canvas (providers / keys / OAuth). Brain card = the friendly chat. */}
              {isInstalled("brain") && (
                <button type="button" onClick={() => { setDataMenuOpen(false); onOpenHermesDashboard?.(); setSysTermActive(false); setShowHermesPanel(false); setShowLightRag(false); setShowEnvEditor(false); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); setShowDomainPanel(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                  <Bot size={11} />Hermes Agent
                </button>
              )}
              {isInstalled("brain") && (
                <button type="button" onClick={() => { setDataMenuOpen(false); setShowOpenAiPanel((v) => !v); setShowHermesPanel(false); setShowLightRag(false); setShowEnvEditor(false); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); setShowDomainPanel(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                  <KeyRound size={11} />OpenAI settings
                </button>
              )}
              {isInstalled("brain") && (
                <button type="button" onClick={() => { setDataMenuOpen(false); setShowHermesPanel((v) => !v); setShowOpenAiPanel(false); setShowLightRag(false); setShowEnvEditor(false); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); setShowDomainPanel(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                  <Send size={11} />Telegram settings
                </button>
              )}
              {isInstalled("memory") && (
                <button type="button" onClick={() => { setDataMenuOpen(false); setShowLightRag((v) => !v); setShowHermesPanel(false); setShowEnvEditor(false); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); setShowDomainPanel(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                  <BrainCircuit size={11} />Company Memory settings
                </button>
              )}
              <div className="h-px bg-border mx-2" />
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowDomainPanel((v) => !v); setShowEnvEditor(false); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); setShowHermesPanel(false); setShowLightRag(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-colors hover:bg-muted">
                {secure
                  ? <Globe size={11} className="text-foreground" />
                  : <AlertTriangle size={11} className="text-orange-500" />}
                <span className={!secure ? "text-orange-500 font-medium" : "text-foreground"}>Personal Domain</span>
                {!secure && <span className="ml-auto text-[10px] text-orange-500/80">not secure</span>}
              </button>
              <div className="h-px bg-border mx-2" />
              <button type="button" onClick={handleExport}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <Download size={11} />Export data
              </button>
              <button type="button" onClick={() => { setDataMenuOpen(false); fileInputRef.current?.click(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <Upload size={11} />Import data
              </button>
              {/* Bottom section: Env Variables + Deployments grouped together… */}
              <div className="h-px bg-border mx-2" />
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowEnvEditor((v) => !v); setShowInfo(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowHelp(false); setShowDomainPanel(false); setShowHermesPanel(false); setShowLightRag(false); setShowDeployments(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <Settings size={11} />Env Variables
              </button>
              <button type="button" onClick={() => { setDataMenuOpen(false); setShowDeployments((v) => !v); setShowHelp(false); setShowInfo(false); setShowEnvEditor(false); setShowDbBrowser(false); setShowUsers(false); setShowMediaLibrary(false); setShowDomainPanel(false); setShowHermesPanel(false); setShowLightRag(false); setShowOpenAiPanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-muted transition-colors">
                <Rocket size={11} />Deployments
              </button>
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
          )}
          <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleImport} />
        </div>

        {/* Paste button — right of Settings (hidden in Light) */}
        {(
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => isAuthenticated && setPasteModalOpen(true)}
                  className={`shrink-0 flex items-center justify-center gap-1.5 rounded-md border border-border h-9 text-[11px] text-muted-foreground select-none px-2 transition-colors${isAuthenticated ? " hover:text-foreground hover:bg-muted" : " opacity-40 cursor-not-allowed"}`}
                >
                  <ClipboardPaste size={12} />
                  {!isMobile && <span className="font-medium">Paste</span>}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]" style={{ zIndex: 99999 }}>
                Paste text to active terminal (Ctrl+Shift+V)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {(
          <button type="button" aria-label="Previous" onClick={() => setCarouselIdx(safeIdx - 1)} disabled={!canPrev}
            className="shrink-0 flex items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-sm disabled:opacity-30 disabled:pointer-events-none"
            style={{ width: 20, height: 20 }}>
            <ChevronLeft className="h-3 w-3" />
          </button>
        )}

        {(<>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div className="flex" style={{ gap: GAP, transform: `translateX(-${safeIdx * (CARD_W + GAP)}px)`, transition: "transform 0.25s ease" }}>

            {visibleEmbedCards.map((card) => {
              // Unified carousel-button standard (step 96): same states/colors as
              // the CLI agent cards. A mounted session (in `embeds`) is alive in
              // the background → green; the visible one → yellow; no session →
              // grey; closing → orange + countdown slider. Dot indicator, no icon.
              const hasSession   = embeds.some((e) => e.id === card.id);
              const isActive     = activeEmbedId === card.id && !sysTermActive;
              const isConfirming = confirmingEmbed === card.id;
              const notAuthed    = !isAuthenticated;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => { if (!notAuthed) handleEmbedClick(card); }}
                  disabled={notAuthed}
                  style={{ width: CARD_W, flexShrink: 0, position: "relative" }}
                  className={`flex items-center justify-center gap-1.5 rounded-md border h-9 text-[11px] transition-all px-2 ${
                    notAuthed       ? "border-border text-muted-foreground/30 cursor-not-allowed opacity-40"
                    : isConfirming  ? "border-orange-400 bg-orange-400/10 text-orange-400 font-medium"
                    : isActive      ? "border-yellow-400 bg-yellow-400/10 text-yellow-500 dark:text-yellow-300 font-medium"
                    : hasSession    ? "border-green-500/50 bg-green-500/5 text-green-600 dark:text-green-400"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {isConfirming ? (
                    <>
                      <span className="size-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />
                      <span>End session</span>
                      <span key={confirmingEmbed} style={{ position: "absolute", bottom: 4, left: 4, right: 4, height: 2, borderRadius: 1, transformOrigin: "left", animation: "countdown-shrink 2s linear forwards, countdown-color 2s linear forwards" }} />
                    </>
                  ) : (
                    <>
                      <TerminalDot status={hasSession ? "connected" : "unavailable"} />
                      <span>{card.label}</span>
                    </>
                  )}
                </button>
              );
            })}

            {visiblePlatforms.map((p) => {
              const isRunning      = terminalSessions.has(p.id);
              const isCurrent      = terminalPlatform === p.id && isRunning;
              const isConfirming   = confirmingPlatform === p.id;
              const notInstalled   = !p.active && p.agentPrompt !== '';
              const bridgeOffline  = bridgeStatus === "offline" && !isRunning;
              const notAuthed      = !isAuthenticated;

              const btn = (
                <button
                  type="button"
                  style={{ width: CARD_W, flexShrink: 0, position: "relative" }}
                  onClick={() => {
                    if (bridgeOffline || notInstalled || notAuthed) return;
                    handleCardClick(p.id);
                  }}
                  disabled={notInstalled || notAuthed}
                  className={`flex items-center justify-center gap-1.5 rounded-md border h-9 text-[11px] transition-all px-2 ${
                    notAuthed       ? "border-border text-muted-foreground/30 cursor-not-allowed opacity-40"
                    : bridgeOffline ? "border-border text-muted-foreground/30 cursor-not-allowed opacity-40"
                    : notInstalled  ? "border-dashed border-border text-muted-foreground/40 cursor-not-allowed opacity-60"
                    : isConfirming  ? "border-orange-400 bg-orange-400/10 text-orange-400 font-medium"
                    : isCurrent     ? "border-yellow-400 bg-yellow-400/10 text-yellow-500 dark:text-yellow-300 font-medium"
                    : isRunning     ? "border-green-500/50 bg-green-500/5 text-green-600 dark:text-green-400"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {isConfirming ? (
                    <>
                      <span className="size-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />
                      <span>End session</span>
                      <span key={confirmingPlatform} style={{ position: "absolute", bottom: 4, left: 4, right: 4, height: 2, borderRadius: 1, transformOrigin: "left", animation: "countdown-shrink 2s linear forwards, countdown-color 2s linear forwards" }} />
                    </>
                  ) : notInstalled ? (
                    <><Download size={10} className="shrink-0 opacity-50" /><span>{p.label}</span></>
                  ) : (
                    <><TerminalDot status={isRunning ? "connected" : terminalStatuses[p.id]} /><span>{p.label}</span></>
                  )}
                </button>
              );

              return (
                <React.Fragment key={p.id}>
                  {(bridgeOffline || notInstalled || notAuthed) ? (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-zinc-800 text-white text-[11px] leading-relaxed p-0 [&>svg]:fill-zinc-800 [&>svg]:bg-zinc-800" style={{ zIndex: 99999, maxWidth: 260 }}>
                          {notAuthed ? (
                            <div className="px-3 py-2.5">Sign in to access platforms</div>
                          ) : bridgeOffline ? (
                            <div className="px-3 py-2.5">
                              Bridge is offline. Start the bridge server:<br />
                              <span className="font-mono text-white/80">node bridges/platforms/server.js</span>
                            </div>
                          ) : (
                            <InstallPromptTooltip label={p.label} prompt={p.agentPrompt} docsUrl={p.docsUrl} />
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : btn}
                </React.Fragment>
              );
            })}

            {/* System terminal — ALWAYS the last card, never filtered by the
                installed-component set. A plain project-level shell for installing
                tools, linking Telegram↔Hermes, etc. Unlike the AI platforms it
                can never be disabled. */}
            {(() => {
              const notAuthed = !isAuthenticated;
              const btn = (
                <button
                  type="button"
                  style={{ width: CARD_W, flexShrink: 0 }}
                  disabled={notAuthed}
                  onClick={() => {
                    if (notAuthed) return;
                    onPreviewClose?.();
                    setShowEnvEditor(false); setShowMediaLibrary(false); setShowDbBrowser(false);
                    setShowUsers(false); setShowInfo(false); setShowHelp(false);
                    setShowGitConnect(false); setShowDomainPanel(false);
                    setShowHermesPanel(false); setShowLightRag(false);
                    cancelEmbedConfirm();
                    setSysTermStarted(true);
                    setSysTermActive(true);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-md border h-9 text-[11px] transition-all px-2 ${
                    notAuthed        ? "border-border text-muted-foreground/30 cursor-not-allowed opacity-40"
                    : sysTermActive  ? "border-yellow-400 bg-yellow-400/10 text-yellow-500 dark:text-yellow-300 font-medium"
                    : sysTermStarted ? "border-green-500/50 bg-green-500/5 text-green-600 dark:text-green-400"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {/* Same dot indicator as agents/Brain/Memory. The system
                      terminal can never be turned off (step 85), so it has no
                      "End session" close — only grey(idle)/green(alive)/yellow(active). */}
                  <TerminalDot status={sysTermStarted ? "connected" : "unavailable"} />
                  <span>Terminal</span>
                </button>
              );
              return notAuthed ? (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-zinc-800 text-white text-[11px] leading-relaxed" style={{ zIndex: 99999, maxWidth: 260 }}>
                      <div className="px-1 py-0.5">Sign in to access the terminal</div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : btn;
            })()}

            {/* Coming soon cards */}
            {COMING_SOON.map((item) => (
              <TooltipProvider key={item.id} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      style={{ width: CARD_W, flexShrink: 0 }}
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-border h-9 text-[11px] text-muted-foreground/40 select-none px-2 cursor-help"
                    >
                      <span className="text-[9px] font-mono text-muted-foreground/30">{item.version}</span>
                      <span>{item.label}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[240px] whitespace-pre-line text-[11px] leading-relaxed" style={{ zIndex: 99999 }}>
                    {item.tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        <button type="button" aria-label="Next" onClick={() => setCarouselIdx(safeIdx + 1)} disabled={!canNext}
          className="shrink-0 flex items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-sm disabled:opacity-30 disabled:pointer-events-none"
          style={{ width: 20, height: 20 }}>
          <ChevronRight className="h-3 w-3" />
        </button>
        </>)}
      </div>

      {/* Light preview canvas removed — Light product retired */}

      {/* ── Users panel ── */}
      {showUsers && (
        <div style={{ position: "absolute", top: CAROUSEL_H, right: 0, bottom: FOOTER_H, width: 480, zIndex: 10 }}>
          <UsersPanel onClose={() => setShowUsers(false)} />
        </div>
      )}

      {/* ── Deployments panel (Product Loop) — wide drawer for the Vercel-style table ── */}
      {showDeployments && (
        <div style={{ position: "absolute", top: CAROUSEL_H, right: 0, bottom: FOOTER_H, width: "min(1100px, 96vw)", zIndex: 20 }}>
          <DeploymentsPanel onClose={() => setShowDeployments(false)} />
        </div>
      )}

      {/* ── Env editor panel ── */}
      {showEnvEditor && <EnvEditorPanel onClose={() => setShowEnvEditor(false)} />}

      {/* ── Media library panel ── */}
      {showMediaLibrary && <MediaLibraryPanel onClose={() => setShowMediaLibrary(false)} />}

      {/* ── DB browser panel ── */}
      {showDbBrowser && <DbBrowserPanel onClose={() => setShowDbBrowser(false)} />}

      {/* ── Domain panel ── */}
      {showDomainPanel && (
        <div style={{ position: "absolute", top: CAROUSEL_H, right: 0, bottom: FOOTER_H, width: "min(480px, 90vw)", zIndex: 20 }}>
          <DomainPanel onClose={() => setShowDomainPanel(false)} />
        </div>
      )}

      {/* ── Settings drawers — slide in from the right, never full-screen so the
            embed iframe behind stays visible. Mobile: cap at 90% viewport width. ── */}
      {showLightRag && (
        <div
          style={{
            position: "absolute",
            top: CAROUSEL_H,
            right: 0,
            bottom: FOOTER_H,
            width: "min(480px, 90vw)",
            zIndex: 20,
          }}
        >
          <LightRagPanel onClose={() => setShowLightRag(false)} />
        </div>
      )}

      {showHermesPanel && (
        <div
          style={{
            position: "absolute",
            top: CAROUSEL_H,
            right: 0,
            bottom: FOOTER_H,
            width: "min(480px, 90vw)",
            zIndex: 20,
          }}
        >
          <HermesPanel onClose={() => setShowHermesPanel(false)} />
        </div>
      )}

      {showOpenAiPanel && (
        <div
          style={{
            position: "absolute",
            top: CAROUSEL_H,
            right: 0,
            bottom: FOOTER_H,
            width: "min(480px, 90vw)",
            zIndex: 20,
          }}
        >
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
              { title: "Upload media", desc: "Upload images, videos, and files to local S3 storage. Images can be cropped before saving." },
              { title: "Configure", desc: "Edit environment variables for the application. Changes take effect after the next deploy." },
              { title: "Database", desc: "Browse and edit database tables directly. Supports editing cells, deleting rows, and managing users." },
              { title: "LightRAG", desc: "Company Brain — a shared knowledge graph for all agents. Coming in v1.1." },
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
      {showGitConnect && (
        <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H, zIndex: 10 }}
          className="bg-background flex flex-col">
          <div className="flex items-center px-4 py-2.5 border-b border-border shrink-0">
            <GitBranch size={12} className="text-muted-foreground mr-2 shrink-0" />
            <span className="text-xs font-semibold text-foreground flex-1">Connect GitHub Repository</span>
            <button type="button" onClick={() => setShowGitConnect(false)}
              className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 max-w-2xl">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Connect your GitHub repository to enable Git Pull and Git Push directly from the admin panel.
              The repository will be synced with the <span className="font-mono text-foreground">app</span> layer of your Fractera instance.
            </p>

            {/* Step 1 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                <span className="text-[12px] font-semibold text-foreground">Copy your repository URL</span>
              </div>
              <div className="pl-7 flex flex-col gap-1 text-[12px] text-muted-foreground leading-relaxed">
                <p>Go to your repository on GitHub, click the green <span className="font-semibold text-foreground">Code</span> button, select the <span className="font-semibold text-foreground">HTTPS</span> tab, and copy the URL.</p>
                <div className="mt-1 px-3 py-2 rounded bg-muted font-mono text-[11px] text-foreground">
                  https://github.com/your-name/your-repo.git
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                <span className="text-[12px] font-semibold text-foreground">Create a Personal Access Token <span className="font-normal text-muted-foreground">(private repos only)</span></span>
              </div>
              <div className="pl-7 flex flex-col gap-1 text-[12px] text-muted-foreground leading-relaxed">
                <p>GitHub → <span className="text-foreground">Settings</span> → <span className="text-foreground">Developer Settings</span> → <span className="text-foreground">Personal Access Tokens</span> → <span className="text-foreground">Tokens (classic)</span></p>
                <p>Click <span className="font-semibold text-foreground">Generate new token</span>, select the <span className="font-mono text-foreground">repo</span> scope, and copy the token.</p>
                <p className="text-muted-foreground/60 text-[11px]">Public repositories do not require a token.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                <span className="text-[12px] font-semibold text-foreground">Add the variables in Configure</span>
              </div>
              <div className="pl-7 flex flex-col gap-2 text-[12px] text-muted-foreground leading-relaxed">
                <p>Open <span className="font-semibold text-foreground">Settings → Configure</span> and add the following environment variables:</p>
                <div className="px-3 py-2.5 rounded bg-muted font-mono text-[11px] text-foreground flex flex-col gap-1">
                  <span><span className="text-primary">USER_GITHUB_REPO_URL</span>=https://github.com/your-name/your-repo.git</span>
                  <span className="text-muted-foreground/60"># optional — only for private repos:</span>
                  <span><span className="text-primary">USER_GITHUB_ACCESS_TOKEN</span>=ghp_xxxxxxxxxxxxxxxxxxxx</span>
                </div>
                <p>Click <span className="font-semibold text-foreground">Save &amp; Apply</span>, then press <span className="font-semibold text-foreground">Deploy</span> in the footer.</p>
              </div>
            </div>

            {/* Result */}
            <div className="px-3 py-2.5 rounded border border-green-500/20 bg-green-500/5 text-[11px] text-green-600 dark:text-green-400 leading-relaxed">
              After deploy — the GitHub button will disappear and <span className="font-semibold">Git Pull</span> / <span className="font-semibold">Git Push</span> will become available in the footer.
            </div>
          </div>
        </div>
      )}

      {/* ── Idle canvas (always behind embed/terminals; topmost when nothing else active) ── */}
      <div style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, bottom: FOOTER_H }}>
        <IdleCanvas />
      </div>

      {/* ── Embed canvases (Company Brain / Company Memory / Hermes dashboard) ──
            One iframe per opened session, kept mounted once created; visibility
            toggles via `display` so switching cards (or to a terminal) never
            tears the iframe down and loses the chat. Only the animated
            "End session" on a card removes one (handleEmbedClose). (step 96) */}
      {isAuthenticated && embeds.map((spec) => {
        const isActive = activeEmbedId === spec.id && !sysTermActive;
        return (
          <div
            key={`embed-${spec.id}`}
            style={{ position: "absolute", top: CAROUSEL_H, left: 0, right: 0, height: termH, zIndex: 5, display: isActive ? "block" : "none" }}
          >
            <EmbedCanvas url={spec.url} title={spec.title} Icon={spec.Icon} />
          </div>
        );
      })}

      {/* ── Terminal panels (xterm) ── */}
      {[...terminalSessions].map((platform) => {
        const isCurrent = platform === terminalPlatform;
        return (
          <div
            key={`xterm-${platform}`}
            style={{
              position: "absolute",
              top: CAROUSEL_H,
              left: 0,
              right: 0,
              height: termH,
              display: isCurrent ? "block" : "none",
            }}
            className="bg-zinc-950"
          >
            <XtermTerminal
              ref={(h) => { xtermRefs.current[platform] = h; }}
              wsUrl={urls.ptyUrl}
              platform={platform}
              onData={handleTerminalData}
            />
          </div>
        );
      })}

      {/* ── System terminal panel (S6) — plain project-level shell, no CLI.
            Mounted once started, then kept alive; visibility toggles so the
            session persists when switching to an agent/embed and back. Higher
            zIndex so it sits above the agent terminals when active. ── */}
      {sysTermStarted && (
        <div
          style={{
            position: "absolute",
            top: CAROUSEL_H,
            left: 0,
            right: 0,
            height: termH,
            display: sysTermActive ? "block" : "none",
            zIndex: 8,
          }}
          className="bg-zinc-950"
        >
          <XtermTerminal
            ref={(h) => { sysTermRef.current = h; }}
            wsUrl={urls.ptyUrl}
            platform="system"
          />
        </div>
      )}

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

        {/* Enter button — mobile only */}
        <button
          type="button"
          className="md:hidden inline-flex items-center gap-1 h-5 px-2 rounded border border-primary bg-primary/10 text-primary text-[10px] transition-colors active:bg-primary/20"
          onClick={() => xtermRefs.current[terminalPlatform]?.sendStdin("\r")}
        >
          <CornerDownLeft size={10} />Enter
        </button>

        {/* Deploy button */}
        <button type="button" onClick={handleDeploy} disabled={deploying}
          className="inline-flex items-center gap-1 h-5 px-2 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none">
          {deploying ? <Loader2 size={10} className="animate-spin" /> : <Rocket size={10} />}Deploy
        </button>

        {/* GitHub Connect (only when not connected) */}
        {!gitConnected && (
          <button type="button" onClick={() => setShowGitConnect((v) => !v)}
            className={`inline-flex items-center gap-1 h-5 px-2 rounded border text-[10px] transition-colors ${showGitConnect ? "border-yellow-400 bg-yellow-400/10 text-yellow-500 dark:text-yellow-300" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            <GitBranch size={10} />GitHub
          </button>
        )}

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

        {/* Skills */}
        <a href={SKILLS_HREF} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 h-5 px-2 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Store size={10} />Skills
        </a>

        {/* Product Loop — distinct from Skills: the digitized end-to-end business journey */}
        <a href={PRODUCT_LOOP_HREF} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 h-5 px-2 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Repeat size={10} />Product Loop
        </a>

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
