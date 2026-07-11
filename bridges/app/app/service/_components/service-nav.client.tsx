"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

// Shared top nav of the /service zone — the 7 architect service pages, opened in a
// full browser tab from the Service button in the admin header. Replaces both the
// former windowed dropdown and the per-page "← back" links (which pointed at the
// admin root and made no sense in a dedicated tab). Patterns retired in step 210 —
// the concept becomes the future Design layer (:3004).
const PAGES = [
  { label: "Architecture", path: "/service/architecture" },
  { label: "AI Core", path: "/service/ai-core" },
  { label: "Development steps", path: "/service/development-steps" },
  { label: "Glossary", path: "/service/glossary" },
  { label: "Documents", path: "/service/documents" },
  { label: "AI Draft Settings", path: "/service/ai-draft-settings" },
  { label: "Debug", path: "/service/debug" },
]

export function ServiceNav() {
  const pathname = usePathname()
  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2">
        {PAGES.map((p) => {
          const active = pathname === p.path || pathname.startsWith(p.path + "/")
          return (
            <Link
              key={p.path}
              href={p.path}
              className={
                "whitespace-nowrap rounded px-2.5 py-1 font-mono text-xs transition-colors " +
                (active
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground")
              }
            >
              {p.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
