import type { ArchNode } from "./types"

// Flatten the tree into a lookup the jump bar uses: every node with the ids of
// its ancestors, so a click can expand the exact path needed to reveal it.
export type FlatEntry = { node: ArchNode; ancestors: string[]; chip: string }

export function flattenTree(root: ArchNode): FlatEntry[] {
  const out: FlatEntry[] = []
  const walk = (node: ArchNode, ancestors: string[]) => {
    out.push({ node, ancestors, chip: chipLabel(node.label) })
    node.children?.forEach(child => walk(child, [...ancestors, node.id]))
  }
  walk(root, [])
  return out
}

// A short, chip-friendly name: drop the " — description" tail and any trailing
// ":port" so "fractera-app — App Shell" → "fractera-app", "nginx :80" → "nginx".
function chipLabel(label: string): string {
  return label.split(" — ")[0].replace(/\s*:\S+$/, "").trim()
}
