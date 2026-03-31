import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserById, getUserByUsername, verifyPassword } from "./auth";

/** How often JWT claims are refreshed from DB (admin / is_active). */
const PROFILE_SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await getUserByUsername(credentials.username);
        if (!user) return null;
        const ok = await verifyPassword(credentials.password, user.password_hash);
        if (!ok) return null;
        return {
          id: user.id,
          username: user.username,
          admin: user.admin,
          is_active: user.is_active,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.admin = user.admin;
        token.is_active = user.is_active;
        token.profileSyncedAt = Date.now();
      } else if (token.id) {
        const last = (token.profileSyncedAt as number | undefined) ?? 0;
        const stale = !last || Date.now() - last > PROFILE_SYNC_INTERVAL_MS;
        if (stale) {
          const fresh = await getUserById(token.id);
          if (fresh) {
            token.admin = fresh.admin;
            token.is_active = fresh.is_active;
            token.profileSyncedAt = Date.now();
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.admin = token.admin;
        session.user.is_active = token.is_active;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: { strategy: "jwt" },
};
