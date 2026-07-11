"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { StatusIndicator } from "./status-indicator.client";
import { AutomationInfoPanel } from "./automation-info-panel.client";

// FROZEN STANDARD — the bar right below the cron slider (step 218). Left: breadcrumb back
// to the categories index (the missing root hop this session already fixed for category
// hubs — projects had the same gap). Right: the existing StatusIndicator pill, unchanged.
// The whole bar is a button that expands AutomationInfoPanel (bot/provider/model/activate).
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
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-md py-1 text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {/* Breadcrumb links stop the click from bubbling into the expand toggle. */}
          <Link
            href="/projects"
            onClick={(e) => e.stopPropagation()}
            className="hover:underline"
          >
            ← Projects
          </Link>
          <span aria-hidden>/</span>
          <Link
            href={`/projects/${category}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:underline"
          >
            {categoryLabel}
          </Link>
        </span>
        <span className="flex items-center gap-2">
          <StatusIndicator />
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
      </button>
      {expanded && (
        <AutomationInfoPanel
          category={category}
          slug={slug}
          modelEnvKey={modelEnvKey}
          defaultModel={defaultModel}
        />
      )}
    </div>
  );
}
