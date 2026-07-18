"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

type Props = {
  email: string;
  appUrl: string;
  adminUrl: string;
  /** The Projects layer (step 256.2) — shown to architects AND managers (the zone's role set). */
  projectsUrl?: string;
  roles: string[];
};

export function LoggedInView({ email, appUrl, adminUrl, projectsUrl, roles }: Props) {
  const isAdmin = roles.includes("architect");
  const canProjects = isAdmin || roles.includes("manager");

  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: "AUTH_SUCCESS" }, "*");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm flex flex-col gap-6 p-8 bg-background rounded-xl border shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Signed in</h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign out
        </Button>
        {(appUrl || (canProjects && projectsUrl) || (isAdmin && adminUrl)) && (
          <div className="flex flex-row flex-wrap gap-4 pt-1 border-t border-border justify-center">
            {appUrl && (
              <a
                href={appUrl}
                className="text-sm text-center text-primary hover:underline"
              >
                Go to App
              </a>
            )}
            {canProjects && projectsUrl && (
              <a
                href={projectsUrl}
                className="text-sm text-center text-primary hover:underline"
              >
                Go to Projects
              </a>
            )}
            {isAdmin && adminUrl && (
              <a
                href={adminUrl}
                className="text-sm text-center text-primary hover:underline"
              >
                Go to Admin Panel
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
