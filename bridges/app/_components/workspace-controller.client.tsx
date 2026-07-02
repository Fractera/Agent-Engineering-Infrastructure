"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ComponentType } from "react";
import { Brain, BrainCircuit, Bot, CircleUserRound, Globe, AlertTriangle } from "lucide-react";
import { CodingWindowShell, type SettingsPanelId } from "./coding-workspace/coding-window-shell.client";
import { AuthLoginModal } from "./auth-login-modal.client";
import { SitePreviewWindow } from "./site-preview-window.client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useRuntimeUrls } from "@/lib/runtime-urls";
import type { Platform } from "./coding-workspace/platforms";
import type { EmbedCard, EmbedCardId, EmbedTarget } from "./coding-workspace/platforms";

type SessionData = {
  userId: string;
  email: string;
  roles: string[];
};

const HEADER_H = 48;

export function WorkspaceController() {
  const urls = useRuntimeUrls();
  const [session, setSession]           = useState<SessionData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [shellHeight, setShellHeight]   = useState(0);
  const [windowWidth, setWindowWidth]   = useState(0);
  // Visual-viewport metrics (iOS keyboard fix): the mobile keyboard is an OVERLAY —
  // CSS dvh ignores it while window.innerHeight shrinks, so a dvh-sized root and a
  // JS-sized shell drift apart (giant gap under the footer). The app root is instead
  // sized to the VISIBLE height and translated by the viewport's pan offset, so the
  // header and footer always stay on screen while the keyboard is open.
  const [appHeight, setAppHeight]       = useState(0);
  const [viewportTop, setViewportTop]   = useState(0);
  const [terminalPlatform, setTerminalPlatform] = useState<Platform>("claude-code");
  const [terminalSessions, setTerminalSessions] = useState<Set<Platform>>(new Set());
  const [siteOpen, setSiteOpen]                 = useState(false);
  const [activeEmbed, setActiveEmbed]           = useState<EmbedTarget | null>(null);
  // Embed sessions (Brain / Memory / Hermes dashboard) — mirror of
  // `terminalSessions` for the CLI agents. Every opened embed iframe stays
  // mounted here so switching cards only toggles visibility (display) instead
  // of unmounting the iframe and losing the chat. An iframe is torn down only
  // by the explicit animated "End session" → handleEmbedClose. (step 96)
  const [embedSessions, setEmbedSessions]       = useState<Set<EmbedTarget>>(new Set());
  // Auto-open the Brain chat (the built-in Hermes Web UI) as the default surface
  // on first load, once we know the user is signed in and Brain is installed.
  // Runs once (guarded by the ref) and only sets the embed if the user hasn't
  // already opened something themselves.
  const autoOpenedRef = useRef(false);
  // Secure mode — true once the Personal Domain wizard has switched the
  // project to strict/HTTPS mode (FRACTERA_IP_NODOMAIN_MODE=false). While the
  // project is still served over plain HTTP on its IP this is false and we
  // surface a browser-style "Not secure" warning. null = not loaded yet
  // (don't flash anything). Drives the header badge + Domain tab styling.
  const [secure, setSecure]                     = useState<boolean | null>(null);
  // Bump nonce each time we re-request a panel so children re-trigger their effect
  // even if the requested id stayed the same.
  const [panelRequest, setPanelRequest]         = useState<{ id: SettingsPanelId; nonce: number } | null>(null);

  // Read secure mode on mount + poll every 60s so the indicator clears on its
  // own a few seconds after the user activates Secure mode in the wizard.
  // /api/config/security is cheap (reads one env file, no DNS/cert work).
  const refreshSecure = useCallback(() => {
    fetch("/api/config/security")
      .then((r) => r.json())
      .then((data) => setSecure(data.open === false))
      .catch(() => setSecure(false));
  }, []);
  useEffect(() => {
    refreshSecure();
    const id = setInterval(refreshSecure, 60_000);
    return () => clearInterval(id);
  }, [refreshSecure]);

  // Mount an embed session once (if new) and make it the active surface.
  // Used by carousel cards, the auto-open default, and the Hermes dashboard
  // menu item — so every path goes through the same mount-once bookkeeping.
  const openEmbed = useCallback((id: EmbedTarget) => {
    setEmbedSessions((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    setActiveEmbed(id);
    setSiteOpen(false);
  }, []);

  // Tear down one embed session — the ONLY way to kill a chat iframe. Wired to
  // the animated "End session" countdown in the carousel (mirrors the CLI
  // terminal close). Switching cards never calls this. (step 96)
  const handleEmbedClose = useCallback((id: EmbedTarget) => {
    setEmbedSessions((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // If we closed the visible one, fall back to nothing (idle canvas).
    setActiveEmbed((cur) => (cur === id ? null : cur));
  }, []);

  // Clicking a Brain/Memory card in the carousel always opens the iframe
  // (the embedded service runs regardless of whether a key is configured).
  // If no key is configured we ALSO surface the matching settings drawer
  // alongside the iframe so the user can paste a key without losing context.
  const handleEmbedCardClick = useCallback(async (card: EmbedCard) => {
    openEmbed(card.id);
    // Brain card is the built-in chat (Hermes Web UI). The chat can't answer
    // without an OpenAI key in the agent's credential pool, so if none is set
    // yet we surface the OpenAI key drawer alongside the chat — the user sees
    // exactly where to paste it. Once a key exists we leave the chat alone.
    if (card.id === "brain") {
      try {
        const res = await fetch("/api/config/hermes", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.configured !== true) {
            setPanelRequest({ id: "openai", nonce: Date.now() });
          }
        }
      } catch { /* show the chat regardless */ }
      return;
    }
    try {
      const res = await fetch(card.configCheckEndpoint, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.configured !== true) {
          setPanelRequest({ id: card.settingsPanelId, nonce: Date.now() });
        }
      }
    } catch {
      // If the config check itself failed, still show the embed; settings
      // can be opened manually from the Data menu.
    }
  }, [openEmbed]);

  // "Hermes Agent" (Settings menu) opens the native Hermes agent dashboard
  // (:9119) in the main embed canvas — the technical panel where providers /
  // keys / OAuth are configured. Brain card stays the friendly chat (:9120).
  const handleOpenHermesDashboard = useCallback(() => {
    openEmbed("hermes-dashboard");
  }, [openEmbed]);

  const isMobile = windowWidth > 0 && windowWidth < 768;

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`${urls.authUrl}/api/session`, { credentials: "include" });
      const data = res.ok ? await res.json() : null;
      setSession(data);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [urls.authUrl]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  // Open the Brain chat by default on first load — SECURE MODE ONLY. We wait
  // until the session AND the mode are resolved (so we neither flash it to
  // logged-out visitors nor open it before we know the mode), then only auto-open
  // when Brain is installed. In insecure (IP) mode the built-in Hermes Web UI is
  // hidden (step 100) — chat is reachable via Telegram instead. installed
  // manifest: null / fetch failure = unknown → still default to the chat
  // (back-compat). Never override a card the user clicked.
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (loading || !session) return;
    if (secure === null) return; // wait until the mode is known
    autoOpenedRef.current = true;
    if (secure !== true) return; // insecure: no built-in chat (step 100)
    fetch("/api/config/components")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const comps = data && Array.isArray(data.components) ? data.components : null;
        const brainInstalled = comps === null || comps.includes("brain");
        if (brainInstalled) {
          setEmbedSessions((s) => (s.has("brain") ? s : new Set(s).add("brain")));
          setActiveEmbed((prev) => prev ?? "brain");
        }
      })
      .catch(() => {});
  }, [loading, session, secure]);

  useEffect(() => {
    // Size everything from the VISUAL viewport — the one honest "what is actually
    // visible above the keyboard" measure on mobile (innerHeight is the fallback
    // where visualViewport is unavailable).
    const vv = window.visualViewport;
    function updateSize() {
      const h = Math.round(vv?.height ?? window.innerHeight);
      setAppHeight(h);
      setViewportTop(Math.round(vv?.offsetTop ?? 0));
      setShellHeight(h - HEADER_H);
      setWindowWidth(window.innerWidth);
      // iOS force-pans the page to reveal a focused input and often leaves that pan
      // stuck after the keyboard closes (only a manual swipe re-clamps it). Re-clamp
      // the document scroll ourselves on every viewport change instead.
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      const se = document.scrollingElement;
      if (se && se.scrollTop !== 0) se.scrollTop = 0;
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    vv?.addEventListener("resize", updateSize);
    vv?.addEventListener("scroll", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
      vv?.removeEventListener("resize", updateSize);
      vv?.removeEventListener("scroll", updateSize);
    };
  }, []);

  function handlePlatformClick(platformId: Platform) {
    if (terminalSessions.has(platformId)) {
      setTerminalPlatform(platformId);
    } else {
      setTerminalSessions((prev) => new Set(prev).add(platformId));
      setTerminalPlatform(platformId);
    }
    setActiveEmbed(null);
  }

  function handleTerminalClose(platformId: Platform) {
    setTerminalSessions((prev) => {
      const next = new Set(prev);
      next.delete(platformId);
      if (platformId === terminalPlatform && next.size > 0) {
        setTerminalPlatform([...next][0]);
      }
      return next;
    });
  }

  function handleSignOut() {
    window.location.href = `${urls.authUrl}/api/auth/signout`;
  }

  function handleRegister() {
    window.location.href = `${urls.authUrl}/register`;
  }

  function handleAuthSuccess() {
    setAuthModalOpen(false);
    setLoading(true);
    fetchSession();
  }

  const roles = session?.roles ?? [];
  const isVirtualArchitect = session?.userId === "virtual-admin";
  const isAuthenticated = session !== null;

  type EmbedSpec = { id: EmbedTarget; url: string; title: string; Icon: ComponentType<{ size?: number; className?: string }> };
  const embedSpecFor = (id: EmbedTarget): EmbedSpec =>
    id === "brain"  ? { id, url: urls.hermesChatUrl, title: "Brain Chat",  Icon: Brain } :
    id === "memory" ? { id, url: urls.brainUrl,  title: "Company Memory", Icon: BrainCircuit } :
                      { id, url: urls.hermesUrl, title: "Hermes Agent", Icon: Bot };
  // One spec per mounted session — the shell renders them all and toggles
  // visibility, so an inactive chat stays alive in the background. (step 96)
  const embedSpecs: EmbedSpec[] = [...embedSessions].map(embedSpecFor);

  const insecure = secure === false;

  return (
    // Fixed root sized to the visual viewport: h-[100dvh] is only the pre-measure
    // fallback (inline height overrides it once measured). `fixed` takes the app out
    // of the document flow so the body has NOTHING to scroll; translateY follows the
    // keyboard pan offset so the app stays glued to the visible area.
    <div
      className="fixed inset-x-0 top-0 h-[100dvh] flex flex-col overflow-hidden bg-background"
      style={{
        height: appHeight > 0 ? appHeight : undefined,
        transform: viewportTop > 0 ? `translateY(${viewportTop}px)` : undefined,
      }}
    >
      {/* ── Header ── */}
      <header
        className="shrink-0 flex items-center justify-between px-4 border-b border-border bg-background"
        style={{ height: HEADER_H }}
      >
        <div className="flex items-center gap-2">
          {insecure && (
            <span
              title="This project is served over plain HTTP on its IP address. Open Settings → Personal Domain to attach a domain and switch to HTTPS / Secure mode."
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400 border border-amber-500/40 bg-amber-500/10"
            >
              <AlertTriangle size={13} />
              <span className="text-[11px] font-medium hidden sm:inline">Not secure</span>
            </span>
          )}
          <span className={`text-sm font-semibold tracking-wide select-none ${insecure ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
            Fractera Admin
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="default"
            className="text-xs shadow-sm dark:border-white/20 dark:shadow-none"
            onClick={() => { setSiteOpen((v) => !v); }}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
          {session ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className="text-xs shadow-sm dark:border-white/20 dark:shadow-none"
                >
                  <CircleUserRound className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Account</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-3 flex flex-col gap-2" style={{ zIndex: 100000 }}>
                <p className="text-xs font-medium text-foreground truncate">{session.email}</p>
                <div className="h-px bg-border" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] text-muted-foreground px-1 mb-0.5">Roles</p>
                  {roles.map((role) => (
                    <span key={role} className="text-xs text-foreground font-mono px-1">{role}</span>
                  ))}
                </div>
                <div className="h-px bg-border" />
                {isVirtualArchitect ? (
                  <Button variant="default" size="sm" className="w-full h-8 text-xs" onClick={handleRegister}>
                    Register account
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={handleSignOut}>
                    Sign out
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          ) : (
            <Button
              variant="outline"
              size="default"
              className="text-xs shadow-sm dark:border-white/20 dark:shadow-none"
              onClick={() => setAuthModalOpen(true)}
            >
              <CircleUserRound className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
          )}
        </div>
      </header>

      {/* ── Workspace shell ── */}
      {shellHeight > 0 && (
        <CodingWindowShell
          height={shellHeight}
          terminalPlatform={terminalPlatform}
          terminalSessions={terminalSessions}
          onPlatformClick={handlePlatformClick}
          onTerminalClose={handleTerminalClose}
          windowWidth={windowWidth}
          isMobile={isMobile}
          isAuthenticated={isAuthenticated && !loading}
          isPreviewOpen={siteOpen}
          onPreviewClose={() => setSiteOpen(false)}
          embeds={embedSpecs}
          activeEmbedId={activeEmbed}
          onEmbedCardClick={handleEmbedCardClick}
          onEmbedClose={handleEmbedClose}
          onOpenHermesDashboard={handleOpenHermesDashboard}
          secure={secure === true}
          insecure={secure === false}
          requestedSettingsPanel={panelRequest}
        />
      )}

      {/* ── Site preview window ── */}
      <SitePreviewWindow open={siteOpen} onClose={() => setSiteOpen(false)} siteUrl={urls.appUrl} />

      {/* ── Auth modal ── */}
      <AuthLoginModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        authUrl={urls.authUrl}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
