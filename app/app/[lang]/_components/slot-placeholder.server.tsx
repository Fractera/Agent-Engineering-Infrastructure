// Minimal labeled placeholder for a parallel-routing slot. Shown only when parallel routing is
// on (the [lang] layout places active slots) — it makes each region of the frame visibly real
// until the slot's own pages are built. Not a client component (pure render).
export function SlotPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[48px] w-full items-center justify-center p-2">
      <span className="rounded bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
