import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as cnt FROM users").get() as { cnt: number };
  return NextResponse.json({ count: row.cnt });
}
