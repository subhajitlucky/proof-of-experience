import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { authOptions } from "./auth";
import { prisma } from "./db";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  handle: string;
  role: Role;
  bio: string | null;
  avatarUrl: string | null;
  publicKey: string;
  createdAt: Date;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      handle: true,
      role: true,
      bio: true,
      avatarUrl: true,
      publicKey: true,
      createdAt: true,
    },
  });
  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
