import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const nextAuth = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  ...(process.env.BASE_PATH ? { basePath: `${process.env.BASE_PATH}/api/auth` } : {}),
});

export const { handlers, auth, signIn, signOut } = nextAuth;
export const { GET, POST } = nextAuth.handlers;
