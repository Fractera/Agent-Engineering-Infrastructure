// 🔒 THE DECLARED BRIDGE (step 254.9) — the single allowed crossing into the platform stores.
// Nodes import { addRow, ingestToMemory } from "../../_lib/rows", never "@/lib/..." directly: this file is
// the whole doorway, and the check-route-self-sufficiency gate enforces that.
export { addRow, listRows } from "@/lib/dashboard-rows";
// PROVENANCE-CARRYING VECTOR MEMORY (step 260) — the output node writes its result here too, tagged with this
// automation's address projects/<category>/<slug>, so every automation's answers become searchable memory.
export { ingestToMemory } from "@/lib/vector-memory";
