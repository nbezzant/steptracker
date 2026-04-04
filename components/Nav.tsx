"use client";

import { useState } from "react";
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
  { href: "/trend", label: "Trend", icon: "📈" },
];

export default function Nav() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const team = profile?.teamId ? TEAMS[profile.teamId] : null;

  return (
    <>
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

        {/* Desktop nav */}
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

        {/* Right side */}
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
          {/* Desktop sign out */}
          <button
            onClick={signOut}
            className="hidden md:block text-xs text-white/30 hover:text-white/60 transition-colors font-mono"
          >
            sign out
          </button>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-white/[0.05] transition-all"
            aria-label="Toggle menu"
          >
            <span
              className={cn(
                "block w-5 h-0.5 bg-white/60 rounded transition-all duration-300",
                menuOpen && "rotate-45 translate-y-2"
              )}
            />
            <span
              className={cn(
                "block w-5 h-0.5 bg-white/60 rounded transition-all duration-300",
                menuOpen && "opacity-0"
              )}
            />
            <span
              className={cn(
                "block w-5 h-0.5 bg-white/60 rounded transition-all duration-300",
                menuOpen && "-rotate-45 -translate-y-2"
              )}
            />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      <div
        className={cn(
          "fixed inset-x-0 top-[65px] z-40 md:hidden glass border-b border-white/[0.05] transition-all duration-300 overflow-hidden",
          menuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 w-full",
                pathname === item.href
                  ? "bg-white/[0.08] text-white"
                  : "text-white/50 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
              {pathname === item.href && (
                <span className="ml-auto text-[var(--gold)] text-xs font-mono">●</span>
              )}
            </Link>
          ))}
          <div className="pt-2 pb-1 border-t border-white/[0.05] mt-2">
            <button
              onClick={() => { signOut(); setMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/30 hover:text-white/60 transition-all w-full font-mono"
            >
              <span>🚪</span>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}