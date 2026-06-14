"use client";

import { motion } from "motion/react";
import { Check, Settings2 } from "lucide-react";
import { adminBase } from "@/lib/runtime-urls";
import { DEFAULT_APP_CONFIG, type AppConfig } from "@/config/app-config.defaults";

// A live, read-only summary of what the owner has customized in Admin -> Site Settings.
// It lists ONLY fields that differ from the shipped defaults, so the list grows as the
// owner brands the app — a visual preview of the settings before they redesign the page.

type Row =
  | { key: string; label: string; kind: "check" }
  | { key: string; label: string; kind: "text"; value: string }
  | { key: string; label: string; kind: "color"; value: string };

function buildConfiguredRows(c: AppConfig): Row[] {
  const d = DEFAULT_APP_CONFIG;
  const rows: Row[] = [];
  const text = (key: string, label: string, value: unknown, def: unknown) => {
    if (value && value !== def) rows.push({ key, label, kind: "text", value: String(value) });
  };
  const flag = (key: string, label: string, on: unknown) => {
    if (on) rows.push({ key, label, kind: "check" });
  };

  text("name", "Name", c.short_name, d.short_name);
  flag("logo", "Logo", c.logo);
  flag("icon", "App icon", c.iconSet);
  flag("og", "Social image", c.images.ogImage);
  if (c.pwa.themeColor && c.pwa.themeColor !== d.pwa.themeColor) {
    rows.push({ key: "theme", label: "Theme color", kind: "color", value: c.pwa.themeColor });
  }
  text("twitter", "Twitter", c.seo.social.twitter, d.seo.social.twitter);
  text("github", "GitHub", c.seo.social.github, undefined);
  text("linkedin", "LinkedIn", c.seo.social.linkedin, undefined);
  text("facebook", "Facebook", c.seo.social.facebook, undefined);
  flag("analytics", "Analytics", c.analytics.enabled && c.analytics.googleAnalyticsId);
  if (c.seo.indexing === "disallow") rows.push({ key: "noindex", label: "Search indexing off", kind: "check" });
  text("author", "Author", c.author.name, d.author.name);
  text("email", "Support email", c.mailSupport, d.mailSupport);
  return rows;
}

export function HomeConfigList({ config }: { config: AppConfig }) {
  const rows = buildConfiguredRows(config);

  if (rows.length === 0) {
    return (
      <motion.a
        href={adminBase() || "#"}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        className="group inline-flex items-center gap-2 text-[12px] text-muted-foreground/70 hover:text-foreground transition-colors"
      >
        <Settings2 size={13} className="opacity-60 group-hover:opacity-100 transition-opacity" />
        Using Fractera defaults — open <span className="text-foreground/80 font-medium">Site Settings</span> to brand this page
      </motion.a>
    );
  }

  return (
    <motion.ul
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="flex flex-col gap-1.5 text-left w-full max-w-xs mx-auto"
    >
      {rows.map((row, i) => (
        <motion.li
          key={row.key}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.44 + i * 0.05, duration: 0.32, ease: "easeOut" }}
          className="flex items-center gap-2.5 text-[12.5px]"
        >
          {row.kind === "color" ? (
            <span
              className="size-3.5 shrink-0 rounded-full border border-foreground/15 shadow-sm"
              style={{ backgroundColor: row.value }}
            />
          ) : (
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Check size={10} strokeWidth={3} />
            </span>
          )}
          <span className="text-muted-foreground">{row.label}</span>
          {row.kind !== "check" && (
            <span className="ml-auto truncate font-medium text-foreground/90 font-mono text-[11.5px] max-w-[55%]">
              {row.value}
            </span>
          )}
        </motion.li>
      ))}
    </motion.ul>
  );
}
