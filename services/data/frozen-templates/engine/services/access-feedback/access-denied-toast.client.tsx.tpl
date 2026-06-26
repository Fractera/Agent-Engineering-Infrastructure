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
      <div className="flex w-[min(92vw,420px)] flex-col gap-2 rounded-xl border border-white/10 bg-zinc-900 p-4 text-white shadow-xl">
        <p className="text-sm font-semibold text-violet-300">{s.title}</p>
        <p className="text-sm leading-relaxed text-white/80">{s.line1.replace('{group}', group)}</p>
        <p className="text-sm leading-relaxed text-white/60">{s.line2.replace('{role}', roleLabel)}</p>
        <button
          onClick={() => toast.dismiss(id)}
          className="mt-1 self-end rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/10"
        >
          {s.close}
        </button>
      </div>
    ),
    { duration: Infinity },  // never auto-dismiss — the owner asked for manual close only
  )
}
