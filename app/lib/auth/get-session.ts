import { NextRequest } from "next/server"
import { shouldBypassAuth } from "@/lib/auth/auth-bypass"

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

  if (shouldBypassAuth()) {
    return { userId: 'demo@local', email: 'demo@local', roles: ['admin'] }
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
