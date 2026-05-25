const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";

export async function requireAuth(cookie: string): Promise<boolean> {
  if (!cookie) return false;
  try {
    const res = await fetch(`${AUTH_SERVICE}/api/session`, {
      headers: { cookie },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
