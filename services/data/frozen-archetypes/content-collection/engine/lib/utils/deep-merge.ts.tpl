// Recursive per-key fallback for partially-translated content. Arrays are
// replaced wholesale (never merged element-wise) — a partial translation of a
// list almost always means "translate the whole list or fall back to base."
export type DeepPartial<T> = T extends (infer U)[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function deepMerge<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (override === undefined) return base
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override as T
  }
  const baseObj = base as Record<string, unknown>
  const overrideObj = override as Record<string, unknown>
  const result: Record<string, unknown> = { ...baseObj }
  for (const key of Object.keys(overrideObj)) {
    const overrideValue = overrideObj[key]
    const baseValue = baseObj[key]
    result[key] = isPlainObject(baseValue) && isPlainObject(overrideValue)
      ? deepMerge(baseValue, overrideValue)
      : overrideValue ?? baseValue
  }
  return result as T
}
