"use client"

import { useEffect, useState } from "react"
import { authBase, adminBase } from "@/lib/runtime-urls"
import { SYSTEM_PAGES } from "@/lib/system-pages"

type Probe = { label: string; path: string; status: "pending" | "ok" | "fail"; detail: string }

const COMMIT = process.env.NEXT_PUBLIC_GIT_COMMIT ?? ""

const INITIAL: Probe[] = [
  { label: "App health",  path: "/api/health", status: "pending", detail: "…" },
  { label: "Session (me)", path: "/api/me",     status: "pending", detail: "…" },
]

export function DebugApp() {
  const [env, setEnv] = useState({ origin: "", mode: "", auth: "", admin: "" })
  const [probes, setProbes] = useState<Probe[]>(INITIAL)

  useEffect(() => {
    const host = window.location.hostname
    const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host === "localhost"
    setEnv({
      origin: window.location.origin,
      mode: isIp ? "IP / insecure (auth bypassed)" : "Custom domain / secure (role-checked)",
      auth: authBase(),
      admin: adminBase(),
    })

    INITIAL.forEach(async (p, i) => {
      try {
        const res = await fetch(p.path)
        setProbes(prev => prev.map((x, j) => j === i
          ? { ...x, status: res.ok ? "ok" : "fail", detail: `HTTP ${res.status}` }
          : x))
      } catch (e) {
        setProbes(prev => prev.map((x, j) => j === i
          ? { ...x, status: "fail", detail: String(e) }
          : x))
      }
    })
  }, [])

  const dot = (s: Probe["status"]) =>
    s === "ok" ? "bg-green-500" : s === "fail" ? "bg-red-500" : "bg-muted-foreground/50 animate-pulse"

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <a href="/" className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
          ← back
        </a>
        <h1 className="mt-1 text-xl font-semibold text-foreground">Debug</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Runtime diagnostics for this server</p>

        {/* Purpose — this is a scratch surface, intentionally disposable. */}
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            A scratch surface for debugging. When an agent can&apos;t make a call on
            its own, it can print comparative data here for you to review and decide.
            Anything you ask to inspect — environment values, config, a query result —
            can be surfaced on this page on request. Treat it as a disposable utility
            page: remove it before a public launch.
          </p>
        </div>

        {/* Environment */}
        <section className="mt-6 rounded-xl border border-border">
          <Row k="Origin" v={env.origin} />
          <Row k="Mode" v={env.mode} />
          <Row k="Auth service" v={env.auth} mono />
          <Row k="Admin service" v={env.admin} mono />
          <Row k="Build commit" v={COMMIT ? COMMIT.slice(0, 12) : "— (not baked)"} mono last />
        </section>

        {/* Live probes */}
        <h2 className="mt-8 text-xs font-medium uppercase tracking-wider text-muted-foreground">Live checks</h2>
        <section className="mt-2 rounded-xl border border-border">
          {probes.map((p, i) => (
            <div
              key={p.path}
              className={`flex items-center gap-3 px-4 py-3 text-xs ${i < probes.length - 1 ? "border-b border-border" : ""}`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${dot(p.status)}`} />
              <span className="font-medium text-foreground">{p.label}</span>
              <span className="font-mono text-muted-foreground/70">{p.path}</span>
              <span className="ml-auto font-mono text-muted-foreground">{p.detail}</span>
            </div>
          ))}
        </section>

        {/* System pages */}
        <h2 className="mt-8 text-xs font-medium uppercase tracking-wider text-muted-foreground">System pages</h2>
        <section className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SYSTEM_PAGES.map(sp => (
            <a
              key={sp.path}
              href={sp.path}
              className="rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <p className="text-sm font-medium text-foreground">{sp.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{sp.blurb}</p>
            </a>
          ))}
        </section>
      </div>
    </main>
  )
}

function Row({ k, v, mono, last }: { k: string; v: string; mono?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-3 text-xs ${last ? "" : "border-b border-border"}`}>
      <span className="text-muted-foreground">{k}</span>
      <span className={`truncate text-foreground ${mono ? "font-mono" : ""}`}>{v || "…"}</span>
    </div>
  )
}
