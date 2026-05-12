const REMOTE_DATA_URL = process.env.REMOTE_DATA_URL!
const DATA_API_KEY    = process.env.DATA_API_KEY!

async function migrate(sql: string, params: unknown[] = []) {
  const res = await fetch(`${REMOTE_DATA_URL}/db/migrate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Data-Secret': DATA_API_KEY,
    },
    body: JSON.stringify({ sql, params }),
  })
  if (!res.ok) throw new Error(`Data service ${res.status}: ${await res.text()}`)
  return res.json() as Promise<{ ok: boolean; rows?: unknown[]; changes?: number }>
}

export const remoteDb = {
  prepare(sql: string) {
    return {
      async all(...args: unknown[]) {
        const data = await migrate(sql, args)
        return (data.rows ?? []) as Record<string, unknown>[]
      },
      async get(...args: unknown[]) {
        const data = await migrate(sql, args)
        return ((data.rows ?? [])[0] ?? null) as Record<string, unknown> | null
      },
      async run(...args: unknown[]) {
        return migrate(sql, args)
      },
    }
  },
  async exec(sql: string) {
    await migrate(sql)
  },
}
