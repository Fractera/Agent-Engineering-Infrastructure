"use client"

import dynamic from "next/dynamic"

// Thin Monaco wrapper (the VS Code engine). Monaco is browser-only, so it is
// dynamically imported with ssr disabled. Pure screen translation — editing here
// never runs and never writes to disk (§3.13).
const Monaco = dynamic(() => import("@monaco-editor/react").then(m => m.default), {
  ssr: false,
  loading: () => <div className="p-4 text-xs text-foreground/60">Loading editor…</div>,
})

export function CodeEditor({
  value, language, onChange, readOnly = false,
}: {
  value: string
  language: string
  onChange?: (v: string) => void
  readOnly?: boolean
}) {
  return (
    <Monaco
      height="420px"
      theme="vs-dark"
      language={language}
      value={value}
      onChange={v => onChange?.(v ?? "")}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 12,
        scrollBeyondLastLine: false,
        wordWrap: "on",
        automaticLayout: true,
      }}
    />
  )
}
