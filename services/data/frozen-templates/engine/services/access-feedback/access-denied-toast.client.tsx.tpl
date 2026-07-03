'use client'

// App-wide access-denied feedback. Call showAccessDenied(...) anywhere a user is
// turned away by role; it shows a localized toast that closes ONLY by button
// (duration: Infinity). Translated by default (82-language fallback to English) —
// no setup needed at the call site. The <Toaster/> is already mounted in the layouts.
import { toast } from 'sonner'
import { getAccessDeniedStrings } from './access-denied-strings'

export function showAccessDenied({ lang, group, role }: { lang: string; group: string; role?: string }) {
  const s = getAccessDeniedStrings(lang || 'en')
  const roleLabel = role || 'guest'
  toast.custom(
    (id) => (
      <div className="flex w-[min(92vw,420px)] flex-col gap-2 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl">
        <p className="text-sm font-semibold text-violet-300">{s.title}</p>
        <p className="text-sm leading-relaxed text-foreground/80">{s.line1.replace('{group}', group)}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{s.line2.replace('{role}', roleLabel)}</p>
        <button
          onClick={() => toast.dismiss(id)}
          className="mt-1 self-end rounded-md border border-border px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40"
        >
          {s.close}
        </button>
      </div>
    ),
    { duration: Infinity },  // never auto-dismiss — the owner asked for manual close only
  )
}
