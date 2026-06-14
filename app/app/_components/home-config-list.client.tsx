"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Settings2 } from "lucide-react";
import { adminBase } from "@/lib/runtime-urls";
import { DEFAULT_APP_CONFIG, iconUrl, type AppConfig } from "@/config/app-config.defaults";
import { SECTIONS, getAt, type Field } from "@/config/site-fields";
import { HomeImageModal } from "./home-image-modal.client";

// A live, read-only mirror of Admin -> Site Settings: it walks the SAME field descriptor as the
// panel and shows ONLY the fields the owner has set (value differs from the shipped default), with
// the panel's exact labels, grouped by the panel's sections. Images appear as clickable thumbnails.

function isSet(config: AppConfig, f: Field): boolean {
  const v = getAt(config, f.path);
  const def = getAt(DEFAULT_APP_CONFIG, f.path);
  if (f.type === "image") return typeof v === "string" && v.length > 0;
  if (f.type === "icons") return !!v && typeof v === "object";
  if (f.type === "switch") return typeof v === "boolean" && v !== def;
  if (v === undefined || v === null || v === "") return false;
  return v !== def;
}

function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-f]{3,8}$/i.test(v);
}

function imageUrl(config: AppConfig, f: Field): string | null {
  if (f.type === "image") return (getAt(config, f.path) as string) ?? null;
  if (f.type === "icons") return iconUrl(config, "icon_512") ?? iconUrl(config, "icon_192");
  return null;
}

function valueText(f: Field, v: unknown): string {
  if (f.type === "switch") return v ? "On" : "Off";
  if (f.type === "select") return f.options?.find((o) => o.value === v)?.label ?? String(v);
  return String(v);
}

export function HomeConfigList({ config }: { config: AppConfig }) {
  const [modal, setModal] = useState<{ url: string; label: string } | null>(null);

  const groups = SECTIONS
    .map((s) => ({ title: s.title, fields: s.fields.filter((f) => isSet(config, f)) }))
    .filter((g) => g.fields.length > 0);

  if (groups.length === 0) {
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

  let row = 0;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="flex flex-col gap-4 text-left w-full max-w-sm mx-auto"
    >
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/60">{g.title}</span>
          <ul className="flex flex-col gap-1.5">
            {g.fields.map((f) => {
              const v = getAt(config, f.path);
              const img = imageUrl(config, f);
              return (
                <motion.li
                  key={f.path}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.44 + row++ * 0.04, duration: 0.3, ease: "easeOut" }}
                  className="flex items-center gap-2.5 text-[12.5px]"
                >
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Check size={10} strokeWidth={3} />
                  </span>
                  <span className="text-muted-foreground">{f.label}</span>
                  {img ? (
                    <button
                      type="button"
                      onClick={() => setModal({ url: img, label: f.label })}
                      className="ml-auto size-7 rounded-md border border-border overflow-hidden bg-muted/40 hover:ring-2 hover:ring-primary/40 transition-all"
                      title="Click to preview"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={f.label} className="size-full object-contain" />
                    </button>
                  ) : isHex(v) ? (
                    <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11.5px] text-foreground/90">
                      <span className="size-3.5 rounded-full border border-foreground/15 shadow-sm" style={{ backgroundColor: v }} />
                      {v}
                    </span>
                  ) : (
                    <span className="ml-auto truncate font-medium text-foreground/90 font-mono text-[11.5px] max-w-[55%]">
                      {valueText(f, v)}
                    </span>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </div>
      ))}

      {modal && <HomeImageModal url={modal.url} label={modal.label} onClose={() => setModal(null)} />}
    </motion.div>
  );
}
