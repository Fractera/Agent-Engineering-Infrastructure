// Compact line diff (LCS) — no dependency. Produces a unified-style block where
// each line is prefixed " " (context), "-" (removed) or "+" (added). Used to make
// a code-change request human-readable in the to-do list: months later you see
// WHAT changed, not just the full new file. Files are <200 lines (CLAUDE.md §12),
// so the O(m·n) table is tiny.
export function lineDiff(oldStr: string, newStr: string): string {
  const a = oldStr.split("\n")
  const b = newStr.split("\n")
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out: string[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) { out.push(" " + a[i]); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push("-" + a[i]); i++ }
    else { out.push("+" + b[j]); j++ }
  }
  while (i < m) { out.push("-" + a[i++]) }
  while (j < n) { out.push("+" + b[j++]) }
  return out.join("\n")
}

// Marker prefix that flags a route_task body as a code-change diff, so the to-do
// renderer shows it as a colored diff rather than plain text.
export const CODE_DIFF_PREFIX = "Code update — "
