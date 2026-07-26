import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { readObject, saveObject } from "../../_lib/store";

// ДВЕРЬ ОБЪЕКТНОГО ХРАНИЛИЩА — байтовые файлы склада (изображения и т.п.). Пара к двери строк (`api/rows`):
//   POST api/files?ext=jpg   тело = сырые байты объекта            → { ok, key, size }
//   GET  api/files?key=<key>                                        → сам объект (image/*)
//
// Запись (POST) требует авторизацию — класть в хранилище может только владелец кокпита. Чтение (GET) —
// открыто: картинку показывает и витрина (публичная поверхность), а ключ непредсказуем и сам служит
// капабилити (угадать нельзя). Обход каталога исключён формой ключа (`readObject`).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const ext = (req.nextUrl.searchParams.get("ext") ?? "jpg").trim();
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.byteLength) return NextResponse.json({ error: "empty body — an object needs bytes" }, { status: 400 });
  const { key, size } = await saveObject(buf, ext);
  return NextResponse.json({ ok: true, key, size });
}

export async function GET(req: NextRequest) {
  const key = (req.nextUrl.searchParams.get("key") ?? "").trim();
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });
  const obj = await readObject(key);
  if (!obj) return NextResponse.json({ error: "no such object" }, { status: 404 });
  return new Response(new Uint8Array(obj.bytes), {
    status: 200,
    headers: { "Content-Type": obj.contentType, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
