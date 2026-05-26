"use client";

import { useState, useEffect, useCallback } from "react";
import { CircleUserRound, Globe } from "lucide-react";
import { CodingWindowShell } from "./coding-workspace/coding-window-shell.client";
import { AuthLoginModal } from "./auth-login-modal.client";
import { SitePreviewWindow } from "./site-preview-window.client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { Platform } from "./coding-workspace/platforms";

type SessionData = {
  userId: string;
  email: string;
  roles: string[];
};

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001";
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL  || "http://localhost:3000";
const HEADER_H = 48;

export function WorkspaceController() {
  const [session, setSession]                   = useState<SessionData | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [authModalOpen, setAuthModalOpen]       = useState(false);
  const [shellHeight, setShellHeight]           = useState(0);
  const [windowWidth, setWindowWidth]           = useState(0);
  const [terminalPlatform, setTerminalPlatform] = useState<Platform>("claude-code");
  const [terminalSessions, setTerminalSessions] = useState<Set<Platform>>(new Set());
  const [siteOpen, setSiteOpen]                 = useState(false);
  const isMobile = windowWidth > 0 && windowWidth < 768;

  // Open the site preview on first admin entry — same UX as the original
  // bridges/app: user lands on the preview window inside the workspace.
  useEffect(() => {
    setSiteOpen(true);
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
            onClick={() => setSiteOpen((v) => !v)}
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

      {/* ── Workspace shell (carousel + terminals + chat) ── */}
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
        />
      )}

      {/* ── Site preview window ── */}
      <SitePreviewWindow open={siteOpen} onClose={() => setSiteOpen(false)} siteUrl={APP_URL} />

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
