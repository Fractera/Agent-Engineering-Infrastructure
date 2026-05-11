"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { register } from "@/lib/auth/register";

type ModalProps = {
  email: string;
  password: string;
  onConfirmed: () => void;
};

function AdministratorConfirmModal({ email, password, onConfirmed }: ModalProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-md bg-background rounded-xl border shadow-xl flex flex-col gap-5 p-7">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Administrator Account Created</h2>
          <p className="text-sm text-muted-foreground">Please read carefully before continuing.</p>
        </div>

        <p className="text-sm leading-relaxed">
          You are the <strong>first</strong> user on this server and have been granted
          the <strong>Administrator</strong> role. This gives you full control over
          the platform, users, and the AI coding workspace.
        </p>

        <div className="rounded-lg border bg-muted/40 px-4 py-3 flex flex-col gap-1.5 font-mono text-xs">
          <div className="flex gap-2">
            <span className="text-muted-foreground w-16 shrink-0">Email</span>
            <span className="text-foreground break-all select-all">{email}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-16 shrink-0">Password</span>
            <span className="text-foreground select-all">{password}</span>
          </div>
        </div>

        <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-3 text-sm leading-relaxed text-orange-200">
          <strong>Important:</strong> Only the first registered user receives Administrator
          privileges. All subsequent users will receive the <strong>User</strong> role.
          If you lose access to this account, you <strong>cannot</strong> regain the
          Administrator role by re-registering — and you will lose the ability to access
          the AI coding workspace and grant admin rights to others.{" "}
          <strong>Save your email and password in a secure location before continuing.</strong>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={checked}
            onCheckedChange={(v) => setChecked(v === true)}
            className="mt-0.5 shrink-0"
          />
          <span className="text-sm leading-snug">
            I understand. I have saved my email and password in a secure location.
          </span>
        </label>

        <Button className="w-full" disabled={!checked} onClick={onConfirmed}>
          Continue
        </Button>
      </div>
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "";

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState("");

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

      const isAdmin = result.roles.includes("architect");

      if (isAdmin) {
        // First user: show mandatory confirmation modal before redirecting
        setPendingRedirect(callbackUrl || "/");
        setShowModal(true);
      } else if (callbackUrl) {
        // Regular user tried to access a protected area (e.g. admin)
        toast.error(
          "You don't have access to the Admin Panel. To use the AI coding workspace, ask your administrator to grant you the Administrator role."
        );
        router.push("/");
      } else {
        router.push("/");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unexpected error during registration");
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirmed = () => {
    setShowModal(false);
    router.push(pendingRedirect);
  };

  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login";

  return (
    <>
      {showModal && (
        <AdministratorConfirmModal
          email={email}
          password={password}
          onConfirmed={handleModalConfirmed}
        />
      )}
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
          <Button variant="outline" className="w-full" onClick={() => router.replace(loginHref)} disabled={loading}>Sign in instead</Button>
        </div>
      </div>
    </>
  );
}

export function RegisterPlaceholder() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
