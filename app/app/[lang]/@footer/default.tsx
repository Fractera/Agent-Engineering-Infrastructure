import { SlotPlaceholder } from "@/app/[lang]/_components/slot-placeholder.server";

// Default fallback for the "footer" parallel-route slot. Renders a labeled placeholder so the
// region is visible when parallel routing is on; replaced by the slot's real pages later.
// When parallel routing is OFF (default) the [lang] layout ignores this slot entirely.
export default function Default() {
  return <SlotPlaceholder label="Footer" />;
}
