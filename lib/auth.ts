import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { normalizeEmail } from "./crypto";
import { prisma } from "./db";
import { ensureOAuthUser, verifyCredentials } from "./users";

export const isGoogleAuthEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;
      const email = normalizeEmail(credentials.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
      const user = await verifyCredentials(email, credentials.password);
      if (!user) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.avatarUrl,
        handle: user.handle,
        role: user.role,
      };
    },
  }),
];

if (isGoogleAuthEnabled) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: { scope: "openid email profile" },
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        await ensureOAuthUser({
          email: user.email,
          name: user.name,
          image: user.image,
        });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user && account?.provider === "credentials") {
        token.uid = user.id;
        token.role = user.role;
        token.handle = user.handle;
      }

      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: normalizeEmail(token.email) },
          select: { id: true, role: true, handle: true },
        });
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
          token.handle = dbUser.handle;
        }
      }

      if (token.uid && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.uid as string },
          select: { role: true, handle: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.handle = dbUser.handle;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string | undefined) ?? "";
        session.user.role = token.role ?? "user";
        session.user.handle = token.handle ?? "";
      }
      return session;
    },
  },
};
