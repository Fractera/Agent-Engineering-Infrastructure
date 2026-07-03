import GlossaryEntry from "./_components"

// Architect-only service page (moved from the slot in step 170). Access is enforced
// by the admin proxy.ts; the page reads/writes the slot's GLOSSARY.md at request time,
// so it renders dynamically.
export const dynamic = "force-dynamic"

export default function Page() {
  return <GlossaryEntry />
}
