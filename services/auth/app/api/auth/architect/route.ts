import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth/auth";

export async function GET(request: Request) {
  if (!process.env.ARCHITECT_TOKEN) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const redirectTo = searchParams.get("redirectTo") || "/";

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  return signIn("architect", { token, redirectTo });
}
