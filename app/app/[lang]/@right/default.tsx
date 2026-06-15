// Default fallback for this parallel-route slot. Renders nothing until the slot receives
// real content (step 116.2+). Required by Next.js so routes that don't match the slot do
// not 404 it. When parallel routing is OFF (default) the [lang] layout ignores this slot.
export default function Default() {
  return null;
}
