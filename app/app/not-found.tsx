import type { Metadata } from "next";
import { getAppConfig } from "@/config/app-config";

export function generateMetadata(): Metadata {
  const cfg = getAppConfig();
  return { title: `Not found · ${cfg.short_name}`, robots: { index: false, follow: false } };
}

export default function NotFound() {
  return null;
}
