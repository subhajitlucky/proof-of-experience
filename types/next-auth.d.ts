import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      handle: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    handle: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
    handle?: string;
  }
}
