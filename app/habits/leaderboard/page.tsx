"use client";

import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth-context";
import { getHabitsLeaderboard, HabitsLeaderEntry } from "@/lib/habits-firestore";
import { cn } from "@/lib/utils";
import Image from "next/image";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function HabitsLeaderboardPage() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<HabitsLeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHabitsLeaderboard();
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AuthGuard>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <div className="text-white/30 text-xs font-mono tracking-widest uppercase mb-1">Rankings</div>
          <h1 className="font-display text-4xl text-white">
            Leader<span className="italic text-emerald-400">board</span>
          </h1>
          <p className="text-white/30 text-sm font-mono mt-1">Ranked by days with both tasks completed</p>
        </div>

        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl h-16 animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
            ))
          ) : entries.length === 0 ? (
            <div className="glass rounded-3xl py-16 text-center text-white/30 font-mono text-sm">
              No completions yet — start logging today!
            </div>
          ) : (
            entries.map((entry, i) => {
              const isMe = entry.uid === profile?.uid;
              return (
                <div
                  key={entry.uid}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200",
                    isMe
                      ? "bg-emerald-500/10 ring-1 ring-emerald-400/30"
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
                  {entry.photoURL ? (
                    <Image
                      src={entry.photoURL}
                      alt={entry.displayName}
                      width={36}
                      height={36}
                      className="rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm flex-shrink-0">
                      {entry.displayName?.[0]}
                    </div>
                  )}

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium truncate",
                      isMe ? "text-emerald-400" : "text-white/80"
                    )}>
                      {entry.displayName}
                      {isMe && <span className="text-xs ml-2 text-emerald-400/60 font-mono">(you)</span>}
                    </div>
                    <div className="text-xs text-white/30 font-mono mt-0.5">
                      {entry.count} day{entry.count !== 1 ? "s" : ""} completed
                    </div>
                  </div>

                  {/* Count */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-medium text-xl text-emerald-400">{entry.count}</span>
                    </div>
                    <div className="flex gap-1 justify-end mt-0.5">
                      <span className="text-xs">🌙</span>
                      <span className="text-xs">🎧</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {entries.length > 0 && !loading && (
          <p className="text-center text-white/20 text-xs font-mono mt-6">
            Only days where both tasks are checked count
          </p>
        )}
      </div>
    </AuthGuard>
  );
}
