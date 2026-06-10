"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Activity, Server, Database, Zap, AlertTriangle,
  Settings, LogOut, Bell
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Activity, exact: true },
  { href: "/dashboard/servers", label: "Servers", icon: Server },
  { href: "/dashboard/databases", label: "Databases", icon: Database },
  { href: "/dashboard/apis", label: "APIs", icon: Zap },
  { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ user }: { user: { name?: string; email?: string } }) {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex flex-col border-r border-zinc-800 bg-zinc-900 shrink-0">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-zinc-800">
        <Activity className="text-brand-400 w-5 h-5 shrink-0" />
        <span className="font-semibold text-sm">Monitoring</span>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-brand-600/20 text-brand-400 font-medium"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-4 border-t border-zinc-800 pt-3">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-medium text-zinc-300 truncate">{user.name ?? user.email}</p>
          <p className="text-xs text-zinc-500 truncate">{user.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm
                     text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
