"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AccountDrawer } from "@/components/menu/account/account-drawer.client";
import type { AuthShellSide } from "@/components/menu/account/account-config";
import type { AccountLabels } from "@/components/menu/account/account-menu.i18n";
import type { ProjectsManifest } from "@/app/(projects)/projects/_shared/projects-manifest";

// Public app-shell account control (step 161). Rendered ONLY when public auth is enabled
// (NEXT_PUBLIC_APP_SHELL_AUTH = left|right). Client island: reads identity from /api/me (the
// slot convention — never auth() in a page). Guest → a Sign-in link into the auth flow;
// signed-in → the account drawer. Pre-hydration shows the Sign-in link so no-JS visitors get
// the entry point too. UI standard: shadcn Button/buttonVariants + lucide icons.
type Me = { userId?: string; email?: string; roles?: string[] } | null;

export function AccountButton({ lang, side, labels, projects }: {
  lang: string;
  side: AuthShellSide;
  labels: AccountLabels;
  projects?: ProjectsManifest;
}) {
  const [me, setMe] = useState<Me>(undefined as unknown as Me);

  useEffect(() => {
    let alive = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setMe(d?.userId ? d : null); })
      .catch(() => { if (alive) setMe(null); });
    return () => { alive = false; };
  }, []);

  if (me && me.userId) {
    return <AccountDrawer lang={lang} side={side} labels={labels} email={me.email} roles={me.roles} projects={projects} />;
  }

  return (
    <Link href={`/login?lang=${lang}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <LogIn />{labels.signIn}
    </Link>
  );
}
