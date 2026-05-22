"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, CircleUserRound, Globe } from "lucide-react";
import { CodingWindowShell } from "./coding-workspace/coding-window-shell.client";
import { AuthLoginModal } from "./auth-login-modal.client";
import { SitePreviewWindow } from "./site-preview-window.client";
import { CompanyBrainWindow } from "./company-brain-window.client";
import { CompanyBrainSetupModal } from "./company-brain-setup-modal.client";
import { HermesWindow } from "./hermes-window.client";
import { WelcomeSetupModal } from "./welcome-setup-modal.client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { Platform } from "./coding-workspace/platforms";

type SessionData = {
  userId: string;
  email: string;
  roles: string[];
};

const AUTH_URL    = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://auth.partner.fractera.local:3001";
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL  || "http://localhost:3000";
const BRAIN_URL   = APP_URL.includes("localhost")
  ? "http://localhost:9621/webui/"
  : APP_URL.replace("://", "://lightrag.") + "/webui/";
const HERMES_URL  = process.env.NEXT_PUBLIC_HERMES_URL
  ?? (APP_URL.includes("localhost")
    ? "http://localhost:9119"
    : APP_URL.replace("://", "://hermes."));
// First-visit lands on /env — the provider/auth panel — so the user
// immediately sees where to sign in to Codex / Claude Code subscriptions.
// Subsequent opens via the Hermes button go to the root as before.
const HERMES_URL_ONBOARDING = HERMES_URL.replace(/\/+$/, "") + "/env";
const HERMES_CHAT_URL = process.env.NEXT_PUBLIC_HERMES_CHAT_URL
  ?? (APP_URL.includes("localhost")
    ? "http://localhost:9120"
    : APP_URL.replace("://", "://hermes.") + "/chat/");
const HEADER_H = 48;

export function WorkspaceController() {
  const [session, setSession]           = useState<SessionData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [shellHeight, setShellHeight]   = useState(0);
  const [windowWidth, setWindowWidth]   = useState(0);
  const [terminalPlatform, setTerminalPlatform] = useState<Platform>("claude-code");
  const [terminalSessions, setTerminalSessions] = useState<Set<Platform>>(new Set());
  const [siteOpen, setSiteOpen]                 = useState(false);
  const [brainOpen, setBrainOpen]               = useState(false);
  const [brainSetupOpen, setBrainSetupOpen]     = useState(false);
  const [welcomeOpen, setWelcomeOpen]           = useState(false);

  // Gate the Company Brain window behind an OpenAI API key check.
  // Without a key LightRAG starts (so the iframe renders) but indexing /
  // queries will fail — we'd rather show an upfront onboarding modal that
  // explains the value of the memory and asks for the key.
  const handleCompanyBrainClick = useCallback(async () => {
    // Closing it (or it's already open) — just toggle, no gating needed.
    if (brainOpen) { setBrainOpen(false); return; }
    try {
      const res = await fetch("/api/config/rag", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.configured) {
          setBrainOpen(true);
          setHermesOpen(false);
          setSiteOpen(false);
          return;
        }
      }
    } catch {
      // Network error — fall through to showing the setup modal anyway;
      // worst case the user sees the explanation again.
    }
    setBrainSetupOpen(true);
  }, [brainOpen]);
  const [hermesOpen, setHermesOpen]             = useState(false);
  // Hermes window URL — defaults to root, swapped to /env (the auth/providers
  // panel) on the first admin-panel visit so the user lands directly on the
  // sign-in screen for Codex / Claude Code subscriptions.
  const [hermesUrl, setHermesUrl]               = useState<string>(HERMES_URL);
  const isMobile = windowWidth > 0 && windowWidth < 768;

  // First admin-panel visit after registration → show a welcome modal
  // that explains the two surfaces (Main Chat / Main Agent) and nudges
  // the user to connect a Codex subscription. Dismissing the modal
  // (either via "Open agent settings" or "Later") flips the localStorage
  // flag so subsequent visits go straight to the site preview.
  //
  // We intentionally do NOT probe Hermes for "are subscriptions connected"
  // — Hermes /api/providers vs /api/models structures shifted across
  // versions and we don't want this onboarding tied to that contract.
  useEffect(() => {
    let firstVisit = false;
    try {
      firstVisit = !localStorage.getItem("fractera_admin_onboarded");
      if (firstVisit) localStorage.setItem("fractera_admin_onboarded", "1");
    } catch {
      // localStorage unavailable — fall back to the regular preview.
    }
    if (firstVisit) {
      setWelcomeOpen(true);
    } else {
      setSiteOpen(true);
    }
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`${AUTH_URL}/api/session`, { credentials: "include" });
      const data = res.ok ? await res.json() : null;
      setSession(data);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  useEffect(() => {
    function updateSize() {
      setShellHeight(window.innerHeight - HEADER_H);
      setWindowWidth(window.innerWidth);
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  function handlePlatformClick(platformId: Platform) {
    if (terminalSessions.has(platformId)) {
      setTerminalPlatform(platformId);
    } else {
      setTerminalSessions((prev) => new Set(prev).add(platformId));
      setTerminalPlatform(platformId);
    }
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
    window.location.href = `${AUTH_URL}/api/auth/signout`;
  }

  function handleRegister() {
    window.location.href = `${AUTH_URL}/register`;
  }

  function handleAuthSuccess() {
    setAuthModalOpen(false);
    setLoading(true);
    fetchSession();
  }

  const roles = session?.roles ?? [];
  const isVirtualArchitect = session?.userId === "virtual-admin";
  const isAuthenticated = session !== null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* ── Header ── */}
      <header
        className="shrink-0 flex items-center justify-between px-4 border-b border-border bg-background"
        style={{ height: HEADER_H }}
      >
        <span className="text-sm font-semibold tracking-wide text-foreground select-none">
          Fractera Admin
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="default"
            className="text-xs shadow-sm dark:border-white/20 dark:shadow-none"
            onClick={handleCompanyBrainClick}
          >
            <Brain className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Company Brain</span>
          </Button>
          <Button
            variant="outline"
            size="default"
            className="text-xs shadow-sm dark:border-white/20 dark:shadow-none"
            onClick={() => { setSiteOpen((v) => !v); setBrainOpen(false); }}
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
          onPreviewClose={() => setSiteOpen(false)}
          onHermesOpen={() => { setHermesUrl(HERMES_URL); setHermesOpen(true); setBrainOpen(false); setSiteOpen(false); }}
          hermesChatUrl={HERMES_CHAT_URL}
        />
      )}

      {/* ── Site preview window ── */}
      <SitePreviewWindow open={siteOpen} onClose={() => setSiteOpen(false)} siteUrl={APP_URL} />

      {/* ── Hermes Agent window ── */}
      <HermesWindow open={hermesOpen} onClose={() => setHermesOpen(false)} hermesUrl={hermesUrl} />

      {/* ── Company Brain window ── */}
      <CompanyBrainWindow open={brainOpen} onClose={() => setBrainOpen(false)} brainUrl={BRAIN_URL} />

      {/* Gating modal — shown when Company Brain is clicked while RAG has no API key. */}
      <CompanyBrainSetupModal
        open={brainSetupOpen}
        onClose={() => setBrainSetupOpen(false)}
        onActivated={() => {
          setBrainSetupOpen(false);
          // pm2 reload of fractera-rag takes a few seconds before the
          // service is ready to serve the iframe; show it anyway, the
          // iframe will retry on its own.
          setBrainOpen(true);
          setHermesOpen(false);
          setSiteOpen(false);
        }}
      />

      {/* First-visit welcome — gates the auto-open of Hermes /env onboarding. */}
      <WelcomeSetupModal
        open={welcomeOpen}
        onContinue={() => {
          setWelcomeOpen(false);
          setHermesUrl(HERMES_URL_ONBOARDING);
          setHermesOpen(true);
          setBrainOpen(false);
          setSiteOpen(false);
        }}
        onClose={() => {
          // "Later" — leave the workspace in its default state; the user
          // can open the agent later via Data → «Main Agent».
          setWelcomeOpen(false);
        }}
      />

      {/* ── Auth modal ── */}
      <AuthLoginModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        authUrl={AUTH_URL}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
