"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  TEAMS,
  getStepEntry,
  upsertStepEntry,
  dateKey,
  updateAppPreference,
} from "@/lib/firestore";
import { formatSteps, cn } from "@/lib/utils";
import Image from "next/image";

const stepsNavItems = [
  { href: "/dashboard", label: "Today", icon: "⚡" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  { href: "/team", label: "Team", icon: "🤝" },
  { href: "/trend", label: "Trend", icon: "📈" },
];

const habitsNavItems = [
  { href: "/habits/log", label: "Log", icon: "✅" },
  { href: "/habits/calendar", label: "Calendar", icon: "📅" },
  { href: "/habits/leaderboard", label: "Leaderboard", icon: "🏆" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, refreshProfile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [stepEditing, setStepEditing] = useState(false);
  const [stepValue, setStepValue] = useState("");
  const [stepSaving, setStepSaving] = useState(false);

  const currentApp = profile?.appPreference ?? "habits";
  const team = profile?.teamId ? TEAMS[profile.teamId] : null;
  const todayKey = dateKey(new Date());
  const navItems = currentApp === "habits" ? habitsNavItems : stepsNavItems;

  const loadTodaySteps = useCallback(async () => {
    if (!profile || currentApp !== "steps") return;
    const entry = await getStepEntry(profile.uid, todayKey);
    setTodaySteps(entry?.steps ?? 0);
  }, [profile, todayKey, currentApp]);

  useEffect(() => {
    loadTodaySteps();
  }, [loadTodaySteps]);

  const toggleApp = async () => {
    if (!profile || switching) return;
    setSwitching(true);
    const newApp = currentApp === "steps" ? "habits" : "steps";
    try {
      await updateAppPreference(profile.uid, newApp);
      await refreshProfile();
      setMenuOpen(false);
      router.push(newApp === "habits" ? "/habits/log" : "/dashboard");
    } finally {
      setSwitching(false);
    }
  };

  const openEdit = () => {
    setStepValue(todaySteps != null && todaySteps > 0 ? todaySteps.toString() : "");
    setStepEditing(true);
  };

  const handleStepSave = async () => {
    if (!profile) return;
    const num = parseInt(stepValue, 10);
    if (isNaN(num) || num < 0) {
      setStepEditing(false);
      return;
    }
    setStepSaving(true);
    try {
      await upsertStepEntry(profile.uid, todayKey, num);
      setTodaySteps(num);
      await refreshProfile();
    } finally {
      setStepSaving(false);
      setStepEditing(false);
      setStepValue("");
    }
  };

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 md:px-6 py-4 glass border-b border-white/[0.05]">
        {/* Logo — tap to toggle app */}
        <button
          onClick={toggleApp}
          disabled={switching || !profile}
          className="font-display text-xl text-white flex items-center gap-2 hover:opacity-80 active:opacity-60 transition-opacity disabled:opacity-50 text-left"
          title={`Switch to ${currentApp === "steps" ? "Sleep & Talk" : "Step Challenge"}`}
        >
          <span className="hidden sm:inline">FlakeFam</span>
          <span className="sm:hidden">FF</span>
          <span className={cn(
            "italic transition-colors duration-300",
            currentApp === "habits" ? "text-emerald-400" : "text-[var(--gold)]"
          )}>
            {currentApp === "habits" ? "Sleep & Talk Tracker" : "Step Challenge"}
          </span>
          {team && currentApp === "steps" && (
            <span className="text-xs font-mono font-normal text-white/30 hidden lg:inline">
              {team.emoji} {team.name}
            </span>
          )}
          {switching && (
            <span className="ml-1 w-3 h-3 border border-white/40 border-t-transparent rounded-full animate-spin inline-block" />
          )}
        </button>

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
          {/* Desktop step chip — steps app only */}
          {profile && currentApp === "steps" && (
            <div className="hidden md:flex items-center">
              {stepEditing ? (
                <div className="flex items-center gap-1.5 bg-white/[0.06] ring-1 ring-[var(--gold)]/30 rounded-xl px-3 py-1.5">
                  <span className="text-sm">👣</span>
                  <input
                    autoFocus
                    type="number"
                    value={stepValue}
                    onChange={(e) => setStepValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleStepSave();
                      if (e.key === "Escape") setStepEditing(false);
                    }}
                    className="w-20 bg-transparent text-sm text-white font-mono focus:outline-none"
                    placeholder="steps"
                  />
                  <button
                    onClick={handleStepSave}
                    disabled={stepSaving}
                    className="text-xs text-[var(--gold)] font-mono hover:text-[var(--gold-light)] transition-colors"
                  >
                    {stepSaving ? "..." : "save"}
                  </button>
                  <button
                    onClick={() => setStepEditing(false)}
                    className="text-xs text-white/25 font-mono hover:text-white/50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={openEdit}
                  className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] rounded-xl px-3 py-1.5 transition-all group"
                  title="Update today's steps"
                >
                  <span className="text-sm">👣</span>
                  <span className="font-mono text-sm text-white/60 group-hover:text-white/80">
                    {todaySteps !== null ? formatSteps(todaySteps) : "—"}
                  </span>
                  <span className="text-[10px] text-white/25 font-mono">today</span>
                  <span className="text-[10px] text-white/20 group-hover:text-[var(--gold)]/50 transition-colors">✎</span>
                </button>
              )}
            </div>
          )}

          {profile?.photoURL ? (
            <Image
              src={profile.photoURL}
              alt={profile.displayName}
              width={32}
              height={32}
              className="rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs flex-shrink-0">
              {profile?.displayName?.[0] ?? "?"}
            </div>
          )}

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
            <span className={cn("block w-5 h-0.5 bg-white/60 rounded transition-all duration-300", menuOpen && "rotate-45 translate-y-2")} />
            <span className={cn("block w-5 h-0.5 bg-white/60 rounded transition-all duration-300", menuOpen && "opacity-0")} />
            <span className={cn("block w-5 h-0.5 bg-white/60 rounded transition-all duration-300", menuOpen && "-rotate-45 -translate-y-2")} />
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
                <span className={cn(
                  "ml-auto text-xs font-mono",
                  currentApp === "habits" ? "text-emerald-400" : "text-[var(--gold)]"
                )}>●</span>
              )}
            </Link>
          ))}

          {/* Mobile step counter — steps app only */}
          {profile && currentApp === "steps" && (
            <div className="pt-2 pb-1 border-t border-white/[0.05] mt-2">
              <div className="px-4 py-2">
                <div className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-2">Today&apos;s Steps</div>
                {stepEditing ? (
                  <div className="flex items-center gap-2 bg-white/[0.06] ring-1 ring-[var(--gold)]/30 rounded-xl px-3 py-2">
                    <span>👣</span>
                    <input
                      autoFocus
                      type="number"
                      value={stepValue}
                      onChange={(e) => setStepValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleStepSave();
                        if (e.key === "Escape") setStepEditing(false);
                      }}
                      className="flex-1 bg-transparent text-sm text-white font-mono focus:outline-none"
                      placeholder="enter total steps"
                    />
                    <button onClick={handleStepSave} disabled={stepSaving} className="text-xs text-[var(--gold)] font-mono">
                      {stepSaving ? "..." : "save"}
                    </button>
                    <button onClick={() => setStepEditing(false)} className="text-xs text-white/30 font-mono">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={openEdit}
                    className="w-full flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.07] rounded-xl px-3 py-2.5 transition-all"
                  >
                    <span>👣</span>
                    <span className="font-mono text-base text-white/80">
                      {todaySteps !== null ? formatSteps(todaySteps) : "—"}
                    </span>
                    <span className="ml-auto text-xs text-white/30 font-mono">tap to update ✎</span>
                  </button>
                )}
              </div>
            </div>
          )}

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
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMenuOpen(false)} />
      )}
    </>
  );
}
