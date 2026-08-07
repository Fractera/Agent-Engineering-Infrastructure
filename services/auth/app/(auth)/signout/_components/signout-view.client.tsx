"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { getAuthStrings, detectBrowserLang, DEFAULT_AUTH_LANG } from "@/lib/i18n/auth-strings";

// The sign-out confirmation. (step 500) Until now this route fell through to the
// authentication library's built-in page: unstyled, English-only, and with no way
// back — a dead end reached by anyone who clicked sign out and changed their mind.
//
// Registering it in auth.config `pages.signOut` is what makes the library hand the
// route over instead of drawing its own.
export function SignOutView() {
  const [lang, setLang] = useState(DEFAULT_AUTH_LANG);
  useEffect(() => { setLang(detectBrowserLang()); }, []);
  const s = getAuthStrings(lang);

  const [busy, setBusy] = useState(false);

  // Where "back" goes. The library puts the origin in `callbackUrl`; when it is
  // absent we fall back to history, and only then to the root — so the button is
  // never a guess that lands the user somewhere they have not been.
  const [back, setBack] = useState<string | null>(null);
  useEffect(() => {
    const cb = new URLSearchParams(window.location.search).get("callbackUrl");
    setBack(cb && cb.startsWith("http") ? cb : null);
  }, []);

  function goBack() {
    if (back) { window.location.href = back; return; }
    if (window.history.length > 1) { window.history.back(); return; }
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm flex flex-col gap-6 p-8 bg-background rounded-xl border shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <LogOut className="size-4" />
            {s.signOut}
          </h1>
          <p className="text-sm text-muted-foreground">{s.signOutQuestion}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            disabled={busy}
            onClick={() => { setBusy(true); signOut({ callbackUrl: "/login" }); }}
          >
            {busy ? <><Loader2 className="size-4 animate-spin" /> {s.signingOut}</> : s.signOut}
          </Button>
          <Button variant="outline" className="w-full" disabled={busy} onClick={goBack}>
            {s.goToApp}
          </Button>
        </div>
      </div>
    </div>
  );
}
