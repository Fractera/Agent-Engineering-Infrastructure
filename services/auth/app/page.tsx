import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { LoggedInView } from "./_components/logged-in-view.client";

export default async function AuthRoot() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const nextauthUrl = process.env.NEXTAUTH_URL ?? "";
  const appUrl   = nextauthUrl.replace("://auth.", "://");
  const adminUrl = nextauthUrl.replace("://auth.", "://admin.");
  // 🔒 АДРЕС ЧАТА СЧИТАЕТСЯ ТЕМ ЖЕ ПРИЁМОМ, ЧТО СОСЕДНИЕ ДВА: своя формула здесь
  // разошлась бы с ними в тот день, когда сменится домен.
  const chatUrl = nextauthUrl.replace("://auth.", "://chat.");
  // 🔒 АДРЕС ПАМЯТИ СЧИТАЕТСЯ ТЕМ ЖЕ ПРИЁМОМ, ЧТО ТРИ СОСЕДНИХ (2026-09-10,
  // правка владельца: «после авторизации предлагается в числе прочих открыть
  // память»). Своя формула здесь разошлась бы с ними в тот день, когда сменится
  // домен, — и разошлась бы МОЛЧА, потому что заметить это можно только войдя.
  const memoryUrl = nextauthUrl.replace("://auth.", "://memory.");
  const roles: string[] = (session.user as { roles?: string[] }).roles ?? [];

  return (
    <LoggedInView
      email={session.user.email ?? ""}
      appUrl={appUrl}
      adminUrl={adminUrl}
      chatUrl={chatUrl}
      memoryUrl={memoryUrl}
      roles={roles}
    />
  );
}
