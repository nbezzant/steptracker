"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth-context";
import {
  getPersonalLeaderboard,
  getDailyLeaderboard,
  UserProfile,
  TEAMS,
  dateKey,
} from "@/lib/firestore";
import { formatSteps, cn } from "@/lib/utils";
import { subDays } from "date-fns";
import Image from "next/image";

type Mode = "cumulative" | "today" | "yesterday";

interface Entry {
  user: UserProfile;
  steps: number;
}

export default function LeaderboardPage() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<Mode>("cumulative");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "cumulative") {
        const users = await getPersonalLeaderboard();
        setEntries(users.map((u) => ({ user: u, steps: u.totalSteps })));
      } else {
        const date =
          mode === "today"
            ? dateKey(new Date())
            : dateKey(subDays(new Date(), 1));
        const daily = await getDailyLeaderboard(date);
        setEntries(daily as Entry[]);
      }
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <AuthGuard>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <div className="text-white/30 text-xs font-mono tracking-widest uppercase mb-1">Rankings</div>
          <h1 className="font-display text-4xl text-white">
            Leader<span className="italic text-[var(--gold)]">board</span>
          </h1>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 mb-6 animate-fade-up" style={{ animationDelay: "0.05s", opacity: 0 }}>
          {(["cumulative", "today", "yesterday"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-mono transition-all duration-200",
                mode === m
                  ? "bg-[var(--gold)] text-black font-medium"
                  : "glass text-white/40 hover:text-white/60"
              )}
            >
              {m === "cumulative" ? "All Time" : m === "today" ? "Today" : "Yesterday"}
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl h-16 animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
            ))
          ) : entries.length === 0 ? (
            <div className="glass rounded-3xl py-16 text-center text-white/30 font-mono text-sm">
              No data yet — be the first to log steps!
            </div>
          ) : (
            entries.map((entry, i) => {
              const isMe = entry.user.uid === profile?.uid;
              const teamInfo = entry.user.teamId ? TEAMS[entry.user.teamId] : null;

              return (
                <div
                  key={entry.user.uid}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200",
                    isMe
                      ? "bg-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30"
                      : "glass hover:bg-white/[0.03]"
                  )}
                >
                  {/* Rank */}
                  <div className="w-8 text-center flex-shrink-0">
                    {i < 3 ? (
                      <span className="text-xl">{MEDALS[i]}</span>
                    ) : (
                      <span className="font-mono text-sm text-white/25">{i + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  {entry.user.photoURL ? (
                    <Image
                      src={entry.user.photoURL}
                      alt={entry.user.displayName}
                      width={36}
                      height={36}
                      className="rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm flex-shrink-0">
                      {entry.user.displayName?.[0]}
                    </div>
                  )}

                  {/* Name + team */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/calendar?userId=${entry.user.uid}`}
                      className={cn(
                        "font-medium truncate block hover:underline underline-offset-2 decoration-white/20",
                        isMe ? "text-[var(--gold)]" : "text-white/80"
                      )}
                    >
                      {entry.user.displayName}
                      {isMe && <span className="text-xs ml-2 text-[var(--gold)]/60 font-mono">(you)</span>}
                    </Link>
                    {teamInfo && (
                      <Link
                        href={`/calendar?teamId=${entry.user.teamId}`}
                        className="text-xs text-white/30 font-mono hover:text-white/50 transition-colors"
                      >
                        {teamInfo.emoji} {teamInfo.name}
                      </Link>
                    )}
                  </div>

                  {/* Steps */}
                  <div className="text-right flex-shrink-0">
                    <div className={cn("font-mono font-medium text-lg", i === 0 ? "text-[var(--gold)]" : "text-white/70")}>
                      {formatSteps(entry.steps)}
                    </div>
                    <div className="text-xs text-white/25 font-mono">steps</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
