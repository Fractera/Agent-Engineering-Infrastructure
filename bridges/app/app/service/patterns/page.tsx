import PatternsEntry from "./_components"

// Architect-only service page (moved from the slot in step 170). Access enforced by
// the admin proxy.ts; reads/writes the slot's PATTERNS/ at request time → dynamic.
export const dynamic = "force-dynamic"

export default function Page() {
  return <PatternsEntry />
}
