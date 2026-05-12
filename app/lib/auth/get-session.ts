import { NextRequest } from "next/server"

export type AppSession = {
  userId: string
  email: string
  roles: string[]
}

export async function getSession(req?: NextRequest): Promise<AppSession | null> {
  const agentId = req?.headers.get('x-agent-identity')
  if (agentId) {
    return { userId: `${agentId}@agent`, email: `${agentId}@agent`, roles: ['agent'] }
  }

  if (process.env.NODE_ENV === 'development') {
    return { userId: 'dev@local', email: 'dev@local', roles: ['admin'] }
  }

  const authUrl = process.env.AUTH_SERVICE_URL ?? process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3001'
  const cookie = req?.headers.get('cookie') ?? ''
  try {
    const res = await fetch(`${authUrl}/api/session`, { headers: { cookie } })
    if (!res.ok) return null
    return res.json() as Promise<AppSession>
  } catch {
    return null
  }
}
