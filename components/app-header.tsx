import type { SessionUser } from "@/lib/session";
import { Brand } from "./brand";
import { AppNav } from "./app-nav";
import { SignOutButton } from "./sign-out-button";
import { Avatar } from "./identity";

export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="app-header">
      <div className="app-header__inner wrap-wide">
        <Brand href="/dashboard" />
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
          <AppNav isAdmin={user.role === "admin"} />
          <div className="app-header__account border-l border-rule pl-4">
            <div className="account-name">
              <span className="block font-semibold text-ink">{user.name}</span>
              <span className="block">@{user.handle}</span>
            </div>
            <Avatar name={user.name} src={user.avatarUrl} />
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
