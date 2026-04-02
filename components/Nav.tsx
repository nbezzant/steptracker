"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { TEAMS } from "@/lib/firestore";
import { cn } from "@/lib/utils";
import Image from "next/image";

const navItems = [
  { href: "/dashboard", label: "Today", icon: "⚡" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  { href: "/team", label: "Team", icon: "🤝" },
];

export default function Nav() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  const team = profile?.teamId ? TEAMS[profile.teamId] : null;

  return (
    <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 glass border-b border-white/[0.05]">
      {/* Logo */}
      <Link href="/dashboard" className="font-display text-xl text-white flex items-center gap-2">
        Step<span className="italic text-[var(--gold)]">Tracker</span>
        {team && (
          <span className="text-xs font-mono font-normal text-white/30 ml-2">
            {team.emoji} {team.name}
          </span>
        )}
      </Link>

      {/* Nav Items */}
      <div className="hidden md:flex items-center gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-200",
              pathname === item.href
                ? "bg-white/[0.08] text-white"
                : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
            )}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      {/* User */}
      <div className="flex items-center gap-3">
        {profile?.photoURL ? (
          <Image
            src={profile.photoURL}
            alt={profile.displayName}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">
            {profile?.displayName?.[0] ?? "?"}
          </div>
        )}
        <button
          onClick={signOut}
          className="text-xs text-white/30 hover:text-white/60 transition-colors font-mono"
        >
          sign out
        </button>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 glass border-t border-white/[0.05] flex">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-all",
              pathname === item.href ? "text-[var(--gold)]" : "text-white/30"
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="font-mono">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
