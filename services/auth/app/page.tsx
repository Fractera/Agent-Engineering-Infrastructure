import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { LoggedInView } from "./_components/logged-in-view.client";

export default async function AuthRoot() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const nextauthUrl = process.env.NEXTAUTH_URL ?? "";
  const appUrl   = nextauthUrl.replace("://auth.", "://");
  const adminUrl = nextauthUrl.replace("://auth.", "://admin.");
  const roles: string[] = (session.user as { roles?: string[] }).roles ?? [];

  return (
    <LoggedInView
      email={session.user.email ?? ""}
      appUrl={appUrl}
      adminUrl={adminUrl}
      roles={roles}
    />
  );
}
