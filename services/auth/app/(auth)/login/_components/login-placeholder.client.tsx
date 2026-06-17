"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function AccessDeniedModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-background rounded-xl border shadow-xl flex flex-col gap-5 p-7">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-sm text-muted-foreground">You don't have permission to access the Admin Panel.</p>
        </div>
        <p className="text-sm leading-relaxed text-foreground">
          The AI coding workspace is only available to users with the{" "}
          <strong>Administrator</strong> role. Contact your administrator and ask them
          to grant you the Administrator role.
        </p>
        <Button className="w-full" onClick={onClose}>OK</Button>
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
  // Default "admin" preserves the legacy contract (every callbackUrl was the
  // Admin Panel, e.g. bridges/app/proxy.ts). "user" lets user-level
  // destinations (Shell Dashboard) through without an Access Denied.
  const requireRole = searchParams.get("requireRole") || "admin";

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

  useEffect(() => {
    fetch("/api/auth/methods")
      .then((r) => r.json())
      .then((d) => setMethods({ google: !!d.google, magicLink: !!d.magicLink }))
      .catch(() => {});
  }, []);

  const handleMagicLink = async () => {
    if (!email) { setError("Enter your email above first"); return; }
    setError(null);
    setMagicLoading(true);
    await signIn("resend", { email, callbackUrl, redirect: false });
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
      setError("Invalid email or password");
      return;
    }

    if (typeof window !== "undefined" && window.parent !== window) {
      window.parent.postMessage({ type: "AUTH_SUCCESS" }, "*");
    }

    router.refresh();

    // Admin destinations: verify the role before redirecting. User-level
    // destinations only need a valid session (which we now have).
    if (callbackUrl !== "/" && requireRole === "admin") {
      const session = await getSession();
      const roles: string[] = (session?.user as { roles?: string[] })?.roles ?? [];
      if (!roles.includes("admin")) {
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
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}${requireRole !== "admin" ? `&requireRole=${requireRole}` : ""}`
    : "/register";

  return (
    <>
      {showAccessDenied && (
        <AccessDeniedModal onClose={() => { setShowAccessDenied(false); window.location.href = "/"; }} />
      )}
    <div className="w-full max-w-sm flex flex-col gap-6 p-8 bg-background rounded-xl border shadow-sm">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">Enter your credentials to continue</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" disabled={loading} autoFocus required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" disabled={loading} required className="pr-10" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <><Loader2 className="size-4 animate-spin" /> Signing in…</> : "Sign in"}
        </Button>
      </form>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Optional sign-in methods — rendered only when the server reports their
          credentials are configured (secure mode). Otherwise hidden entirely. */}
      {methods.google && (
        <Button
          variant="outline"
          className="w-full gap-2"
          disabled={googleLoading}
          onClick={() => { setGoogleLoading(true); signIn("google", { callbackUrl }); }}
        >
          {googleLoading ? (
            <><Loader2 className="size-4 animate-spin" /> Connecting…</>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M17.64 9.2c0-.638-.057-1.252-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908C16.658 14.252 17.64 11.945 17.64 9.2Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </Button>
      )}

      {methods.magicLink && (
        magicSent ? (
          <p className="text-xs text-emerald-600 bg-emerald-500/10 rounded px-3 py-2 leading-relaxed">
            Check your email — we sent a sign-in link to <strong>{email}</strong>. Don&apos;t see it? Check your spam folder.
          </p>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={magicLoading || !email}
            onClick={handleMagicLink}
          >
            {magicLoading ? <><Loader2 className="size-4 animate-spin" /> Sending…</> : "Send magic link"}
          </Button>
        )
      )}

      <Button variant="outline" className="w-full" onClick={() => { window.location.href = registerHref }}>Register</Button>
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
