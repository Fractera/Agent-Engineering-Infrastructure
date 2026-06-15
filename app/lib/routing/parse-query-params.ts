export type QueryParam = {
  key: string;
  value: string;
};

/**
 * Normalises Next.js searchParams into a flat QueryParam[].
 * Repeated keys (?tag=a&tag=b) produce separate entries.
 *
 * Example: { color: 'red', tag: ['a', 'b'] }
 * Result:  [{ key: 'color', value: 'red' }, { key: 'tag', value: 'a' }, { key: 'tag', value: 'b' }]
 */
export function parseQueryParams(
  searchParams: Record<string, string | string[] | undefined>
): QueryParam[] {
  const result: QueryParam[] = [];
  for (const key of Object.keys(searchParams)) {
    const raw = searchParams[key];
    if (raw === undefined) continue;
    if (Array.isArray(raw)) {
      for (const v of raw) result.push({ key, value: v });
    } else {
      result.push({ key, value: raw });
    }
  }
  return result;
}
