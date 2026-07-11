"use client";

import Link from "next/link";
import { StatusIndicator } from "./status-indicator.client";
import { AutomationInfoMenu } from "./automation-info-menu.client";

// FROZEN STANDARD — the bar right below the cron slider (step 218). Left: breadcrumb back to
// the categories index (the missing root hop this session already fixed for category hubs —
// project pages had the same gap). Right: the existing StatusIndicator pill + a hamburger that
// opens the automation menu (bot / provider / model / activate) as a shadcn DropdownMenu.
export function ProjectStatusBar({
  category,
  categoryLabel,
  slug,
  modelEnvKey,
  defaultModel,
}: {
  category: string;
  categoryLabel: string;
  slug: string;
  modelEnvKey: string;
  defaultModel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:underline">
          ← Projects
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/projects/${category}`} className="hover:underline">
          {categoryLabel}
        </Link>
      </span>
      <span className="flex items-center gap-2">
        <StatusIndicator />
        <AutomationInfoMenu
          category={category}
          slug={slug}
          modelEnvKey={modelEnvKey}
          defaultModel={defaultModel}
        />
      </span>
    </div>
  );
}
