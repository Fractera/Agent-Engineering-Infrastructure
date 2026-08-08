"use client";

import { useState, useEffect, useCallback } from "react";
import { Globe, AlertTriangle, Menu } from "lucide-react";
import { CodingWindowShell, type SettingsPanelId } from "./coding-workspace/coding-window-shell.client";
import { SitePreviewWindow } from "./site-preview-window.client";
import { Button } from "@/components/ui/button";
import { useRuntimeUrls } from "@/lib/runtime-urls";
import { getAdminStrings, detectBrowserLang, DEFAULT_ADMIN_LANG } from "@/lib/i18n/admin-strings";

type SessionData = {
  userId: string;
  email: string;
  roles: string[];
};

const HEADER_H = 48;

export function WorkspaceController() {
  const urls = useRuntimeUrls();
  const [session, setSession]           = useState<SessionData | null>(null);
  // Kept only to end the session request; nothing renders differently while it is in flight — that is
  // what used to make the header blink.
  const [, setLoading]                  = useState(true);
  const [shellHeight, setShellHeight]   = useState(0);
  const [windowWidth, setWindowWidth]   = useState(0);
  const [siteOpen, setSiteOpen]                 = useState(false);
  // already opened something themselves.
  // Secure mode — true once the Personal Domain wizard has switched the
  // project to strict/HTTPS mode (FRACTERA_IP_NODOMAIN_MODE=false). While the
  // project is still served over plain HTTP on its IP this is false and we
  // surface a browser-style "Not secure" warning. null = not loaded yet
  // (don't flash anything). Drives the header badge + Domain tab styling.
  const [secure, setSecure]                     = useState<boolean | null>(null);
  // Bump nonce each time we re-request a panel so children re-trigger their effect
  // even if the requested id stayed the same.
  const [panelRequest, setPanelRequest]         = useState<{ id: SettingsPanelId; nonce: number } | null>(null);
  // Settings drawer open state — owned by the header (the Menu button lives there),
  // rendered by the shell. Lifting it here is what puts the button IN the header row
  // instead of floating over the workspace.
  const [menuOpen, setMenuOpen]                 = useState(false);

  // Language: bundled dictionary, browser language read once on mount. Keeps
  // the page statically renderable (see lib/i18n/admin-strings.ts).
  const [lang, setLang] = useState(DEFAULT_ADMIN_LANG);
  useEffect(() => { setLang(detectBrowserLang()); }, []);
  const s = getAdminStrings(lang);

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


  const isMobile = windowWidth > 0 && windowWidth < 768;
  // Dragging a window is worth having only where there is canvas to drag it across. Below Tailwind's
  // xl (1280px) the preview opens inline, between the header and the footer, like any other page.
  const wideEnoughToFloat = windowWidth >= 1280;

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

  // (step 500) The "auto-open the Brain chat on first load" effect is gone with
  // Hermes. The workspace now opens on the idle canvas; Memory is opened by the
  // user from the carousel.

  useEffect(() => {
    function updateSize() {
      setShellHeight(window.innerHeight - HEADER_H);
      setWindowWidth(window.innerWidth);
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  function handleSignOut() {
    window.location.href = `${urls.authUrl}/api/auth/signout`;
  }

  function handleRegister() {
    window.location.href = `${urls.authUrl}/register`;
  }

  const roles = session?.roles ?? [];
  const isVirtualArchitect = session?.userId === "virtual-admin";
  // Reaching this page IS the proof of access: proxy.ts checks the session on the server and redirects
  // anyone who is not an architect to the auth service before a single pixel is rendered — and in
  // bypass mode there is no session to have. So the panel does not re-decide the question in the
  // browser; it only waits for the session's DETAILS (email, roles). Treating the in-flight moment as
  // "not signed in" is what made a Sign in button flash on every load, offering a door to someone who
  // is already inside.


  const insecure = secure === false;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* ── Header ── */}
      <header
        className="shrink-0 flex items-center justify-between px-4 border-b border-border bg-background"
        style={{ height: HEADER_H }}
      >
        <div className="flex items-center gap-2">
          {insecure && (
            <span
              title={s.notSecureTooltip}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400 border border-amber-500/40 bg-amber-500/10"
            >
              <AlertTriangle size={13} />
              <span className="text-[11px] font-medium hidden sm:inline">{s.notSecure}</span>
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
            <span className="hidden sm:inline">{s.preview}</span>
          </Button>
          {/* (step 500) The Account button and its popover are gone — the email, the roles and the
              sign-out action live in the pinned footer of the settings drawer. Sign in is gone too
              (owner, 2026-08-08): the panel is behind proxy.ts, so nobody unauthenticated is ever here
              to press it, and rendering it while the session request was still in flight made it blink
              on every load. A control that cannot be needed should not exist. */}
          {/* Menu — the last control of the header row, a sibling of Preview and the
              account button. It opens the settings drawer that lives in the shell;
              the open state is owned here so the button and the drawer stay in sync. */}
          <Button
            variant="outline"
            size="default"
            aria-label={s.menu}
            className="text-xs shadow-sm dark:border-white/20 dark:shadow-none"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{s.menu}</span>
          </Button>
        </div>
      </header>

      {/* ── Workspace shell ── */}
      {shellHeight > 0 && (
        <CodingWindowShell
          height={shellHeight}
          windowWidth={windowWidth}
          isMobile={isMobile}
          isPreviewOpen={siteOpen}
          onPreviewClose={() => setSiteOpen(false)}
          secure={secure === true}
          insecure={secure === false}
          requestedSettingsPanel={panelRequest}
          menuOpen={menuOpen}
          onMenuOpenChange={setMenuOpen}
          accountEmail={session?.email ?? null}
          accountRoles={roles}
          isVirtualArchitect={isVirtualArchitect}
          onSignOut={handleSignOut}
          onRegister={handleRegister}
        />
      )}

      {/* ── Site preview — floating only on a wide screen. Narrower than xl it is rendered INSIDE the
             workspace shell instead, so it obeys the same top and bottom anchors as every other page. ── */}
      {wideEnoughToFloat && (
        <SitePreviewWindow open={siteOpen} onClose={() => setSiteOpen(false)} siteUrl={urls.appUrl} />
      )}

      {/* The sign-in modal was mounted here for the button that has just gone. Nothing could open it
          any more, so it is removed rather than left as a component waiting for a caller that cannot
          exist. Signing in happens at the auth service, which is where proxy.ts sends people. */}
    </div>
  );
}
