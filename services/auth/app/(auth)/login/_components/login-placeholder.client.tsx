"use client";

import { Suspense, useState } from "react";
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
