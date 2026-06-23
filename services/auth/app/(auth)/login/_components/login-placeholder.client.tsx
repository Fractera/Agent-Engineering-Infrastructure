"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAuthStrings, detectBrowserLang, fill, DEFAULT_AUTH_LANG, type AuthStrings } from "@/lib/i18n/auth-strings";

function AccessDeniedModal({ onClose, s }: { onClose: () => void; s: AuthStrings }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-background rounded-xl border shadow-xl flex flex-col gap-5 p-7">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{s.accessDeniedTitle}</h2>
          <p className="text-sm text-muted-foreground">{s.accessDeniedNoPermission}</p>
        </div>
        <p className="text-sm leading-relaxed text-foreground">
          {s.accessDeniedBody}
        </p>
        <Button className="w-full" onClick={onClose}>{s.ok}</Button>
      </div>
    </div>
  );
}
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  // Default "architect" preserves the legacy contract (every callbackUrl was the
  // Admin Panel, e.g. bridges/app/proxy.ts). "user" lets user-level
  // destinations (Shell Dashboard) through without an Access Denied.
  const requireRole = searchParams.get("requireRole") || "architect";

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  // Which extra sign-in methods are active (credentials present on the server).
  // Empty credentials → false → the button is not rendered.
  const [methods, setMethods]           = useState<{ google: boolean; magicLink: boolean }>({ google: false, magicLink: false });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading]   = useState(false);
  const [magicSent, setMagicSent]         = useState(false);
  // Magic-link has its OWN email field (separate from the password login below).
  // magicPrompt flips the button label to "Input your email" if it's clicked
  // while the field is empty.
  const [magicEmail, setMagicEmail]       = useState("");
  const [magicPrompt, setMagicPrompt]     = useState(false);

  // Browser-language strings (static dictionary, picked client-side once on mount).
  const [lang, setLang] = useState(DEFAULT_AUTH_LANG);
  useEffect(() => { setLang(detectBrowserLang()); }, []);
  const s = getAuthStrings(lang);

  useEffect(() => {
    fetch("/api/auth/methods")
      .then((r) => r.json())
      .then((d) => setMethods({ google: !!d.google, magicLink: !!d.magicLink }))
      .catch(() => {});
  }, []);

  // Welcome toast. If the visitor is ALREADY signed in when they land on /login
  // — which is exactly what happens when their role was too low for the target
  // (e.g. a `user` bounced from the Admin Panel) — the bare form looks like a
  // failed login. Confirm the sign-in and show their role so it's clear auth
  // worked; if a higher role is required for this destination, say which.
  useEffect(() => {
    const t = getAuthStrings(detectBrowserLang());
    getSession()
      .then((sess) => {
        if (!sess?.user) return;
        const who = sess.user.name || sess.user.email || "there";
        const roles = (sess.user as { roles?: string[] }).roles ?? [];
        const roleLabel = roles[0] ?? "user";
        toast.success(fill(t.welcomeToast, { who, role: roleLabel }));
        if (requireRole && !roles.includes(requireRole)) {
          toast.info(fill(t.roleNeededToast, { role: requireRole }));
        }
      })
      .catch(() => {});
  }, [requireRole]);

  const handleMagicLink = async () => {
    // Clicked with no email → prompt for it (button label flips to "Input your email").
    if (!magicEmail.trim()) { setMagicPrompt(true); return; }
    setMagicPrompt(false);
    setMagicLoading(true);
    await signIn("resend", { email: magicEmail.trim(), callbackUrl, redirect: false });
    setMagicLoading(false);
    setMagicSent(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setLoading(false);
      setError(s.invalidCredentials);
      return;
    }

    if (typeof window !== "undefined" && window.parent !== window) {
      window.parent.postMessage({ type: "AUTH_SUCCESS" }, "*");
    }

    router.refresh();

    // Admin destinations: verify the role before redirecting. User-level
    // destinations only need a valid session (which we now have).
    if (callbackUrl !== "/" && requireRole === "architect") {
      const session = await getSession();
      const roles: string[] = (session?.user as { roles?: string[] })?.roles ?? [];
      if (!roles.includes("architect")) {
        setLoading(false);
        setShowAccessDenied(true);
        return;
      }
    }

    setLoading(false);
    // Always use full-page navigation — relative paths like "/" or
    // "/admin/" refer to the shell domain, not the auth service.
    window.location.href = callbackUrl;
  };

  // Preserve the return target when switching to the register form.
  const registerHref = callbackUrl !== "/"
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}${requireRole !== "architect" ? `&requireRole=${requireRole}` : ""}`
    : "/register";

  // When at least one provider (Google / magic-link) is configured, signing in
  // with it also REGISTERS the user on first use — so the separate Register step
  // is dropped. Existing email+password accounts can still sign in below.
  const hasProvider = methods.google || methods.magicLink;

  const orDivider = (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground">{s.or}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );

  return (
    <>
      {showAccessDenied && (
        <AccessDeniedModal s={s} onClose={() => { setShowAccessDenied(false); window.location.href = "/"; }} />
      )}
    <div className="w-full max-w-sm flex flex-col gap-6 p-8 bg-background rounded-xl border shadow-sm">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{s.signInTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {hasProvider ? s.subtitleProvider : s.subtitleCreds}
        </p>
      </div>

      {/* Providers first — each renders only when configured on the server.
          A divider follows each, since the email+password form always comes after. */}
      {methods.google && (
        <>
          <Button
            variant="outline"
            className="w-full gap-2"
            disabled={googleLoading}
            onClick={() => { setGoogleLoading(true); signIn("google", { callbackUrl }); }}
          >
            {googleLoading ? (
              <><Loader2 className="size-4 animate-spin" /> {s.connecting}</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M17.64 9.2c0-.638-.057-1.252-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908C16.658 14.252 17.64 11.945 17.64 9.2Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                {s.continueWithGoogle}
              </>
            )}
          </Button>
          {orDivider}
        </>
      )}

      {methods.magicLink && (
        <>
          {magicSent ? (
            <p className="text-xs text-emerald-600 bg-emerald-500/10 rounded px-3 py-2 leading-relaxed">
              {fill(s.magicSentBody, { email: magicEmail })}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Magic-link's own email field — separate from the password login. */}
              <Input
                type="email"
                value={magicEmail}
                onChange={(e) => { setMagicEmail(e.target.value); if (magicPrompt) setMagicPrompt(false); }}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={magicLoading}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={magicLoading}
                onClick={handleMagicLink}
              >
                {magicLoading
                  ? <><Loader2 className="size-4 animate-spin" /> {s.sending}</>
                  : magicPrompt ? s.inputYourEmail : s.sendMagicLink}
              </Button>
            </div>
          )}
          {orDivider}
        </>
      )}

      {/* Email + password — existing accounts sign in here (always available,
          at the bottom). Verified path: signIn("credentials", …). */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{s.email}</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" disabled={loading} autoFocus={!hasProvider} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{s.password}</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" disabled={loading} required className="pr-10" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <><Loader2 className="size-4 animate-spin" /> {s.signingIn}</> : s.signIn}
        </Button>
      </form>

      {/* Register only when NO provider is configured — when a provider exists it
          registers the user on first sign-in, so a separate Register step would
          be redundant (and is hidden). */}
      {!hasProvider && (
        <>
          {orDivider}
          <Button variant="outline" className="w-full" onClick={() => { window.location.href = registerHref }}>{s.register}</Button>
        </>
      )}
    </div>
    </>
  );
}

export function LoginPlaceholder() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Suspense fallback={<div className="w-full max-w-sm p-8 rounded-xl border bg-background shadow-sm flex flex-col gap-4"><div className="h-5 w-1/3 rounded bg-muted animate-pulse" /><div className="h-10 rounded bg-muted animate-pulse" /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
