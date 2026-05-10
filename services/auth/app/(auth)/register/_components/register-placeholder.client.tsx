"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register } from "@/lib/auth/register";

function RegisterForm() {
  const router = useRouter();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const result = await register(email, password);
      if (!result.success) { setError(result.error); return; }
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) { setError("Sign in failed after registration"); return; }

      if (typeof window !== "undefined" && window.parent !== window) {
        window.parent.postMessage({ type: "AUTH_SUCCESS" }, "*");
      }

      router.refresh();
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unexpected error during registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm flex flex-col gap-4">
      <div className="flex flex-col gap-6 p-8 bg-background rounded-xl border shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Create account</h1>
          <p className="text-sm text-muted-foreground">Register to get started</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reg-email">Email</Label>
            <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" disabled={loading} autoFocus required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reg-password">Password</Label>
            <div className="relative">
              <Input id="reg-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" disabled={loading} required className="pr-10" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reg-confirm">Confirm password</Label>
            <Input id="reg-confirm" type={showPassword ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" disabled={loading} required />
          </div>
          {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <><Loader2 className="size-4 animate-spin" /> Creating account…</> : "Create account"}
          </Button>
        </form>
        <Button variant="outline" className="w-full" onClick={() => router.replace("/login")} disabled={loading}>Sign in instead</Button>
      </div>
    </div>
  );
}

export function RegisterPlaceholder() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <RegisterForm />
    </div>
  );
}
