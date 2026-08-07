"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAuthStrings, detectBrowserLang, DEFAULT_AUTH_LANG } from "@/lib/i18n/auth-strings";

type Props = {
  email: string;
  appUrl: string;
  adminUrl: string;
  roles: string[];
};

export function LoggedInView({ email, appUrl, adminUrl, roles }: Props) {
  const isAdmin = roles.includes("architect");

  // Same language mechanic as the login / register forms: every language is
  // baked into the bundle, the browser language is read once on mount, no
  // request and no runtime translation.
  const [lang, setLang] = useState(DEFAULT_AUTH_LANG);
  useEffect(() => { setLang(detectBrowserLang()); }, []);
  const s = getAuthStrings(lang);

  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: "AUTH_SUCCESS" }, "*");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm flex flex-col gap-6 p-8 bg-background rounded-xl border shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{s.signedInTitle}</h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
          {s.signOut}
        </Button>
        {/* Destinations: stacked vertically under a separator, carrying the same
            weight as the sign-in button on the login form. Base UI's Button has
            no asChild, so the anchors wear buttonVariants() directly. */}
        {(appUrl || (isAdmin && adminUrl)) && (
          <div className="flex flex-col gap-3 pt-6 border-t border-border">
            {appUrl && (
              <a href={appUrl} className={cn(buttonVariants(), "w-full")}>
                {s.goToApp}
              </a>
            )}
            {isAdmin && adminUrl && (
              <a href={adminUrl} className={cn(buttonVariants(), "w-full")}>
                {s.goToAdmin}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
