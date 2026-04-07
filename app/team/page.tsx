"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth-context";
import {
  getTeamLeaderboard,
  getTeamDailySteps,
  joinTeam,
  TEAMS,
  TeamId,
  Team,
} from "@/lib/firestore";
import { formatSteps, cn } from "@/lib/utils";
import { dateKey } from "@/lib/firestore";
import { subDays } from "date-fns";

type Mode = "cumulative" | "today" | "yesterday";

export default function TeamPage() {
  const { profile, refreshProfile } = useAuth();
  const [mode, setMode] = useState<Mode>("cumulative");
  const [teams, setTeams] = useState<Team[]>([]);
  const [dailySteps, setDailySteps] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState<TeamId | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teamData, todaySteps, yestSteps] = await Promise.all([
        getTeamLeaderboard(),
        getTeamDailySteps(dateKey(new Date())),
        getTeamDailySteps(dateKey(subDays(new Date(), 1))),
      ]);
      setTeams(teamData);
      setDailySteps(mode === "today" ? todaySteps : yestSteps);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  const sortedTeams = [...teams].sort((a, b) => {
    if (mode === "cumulative") return b.totalSteps - a.totalSteps;
    return (dailySteps[b.id] ?? 0) - (dailySteps[a.id] ?? 0);
  });

  const maxSteps =
    mode === "cumulative"
      ? Math.max(...teams.map((t) => t.totalSteps), 1)
      : Math.max(...Object.values(dailySteps), 1);

  const handleSwitchTeam = async (teamId: TeamId) => {
    if (!profile) return;
    setSwitching(true);
    try {
      await joinTeam(profile.uid, teamId);
      await refreshProfile();
      setConfirmSwitch(null);
      await load();
    } finally {
      setSwitching(false);
    }
  };

  return (
    <AuthGuard>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <div className="text-white/30 text-xs font-mono tracking-widest uppercase mb-1">Competition</div>
          <h1 className="font-display text-4xl text-white">
            Team <span className="italic text-[var(--gold)]">Standings</span>
          </h1>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 mb-8 animate-fade-up" style={{ animationDelay: "0.05s", opacity: 0 }}>
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

        {/* Team cards */}
        <div className="space-y-4 animate-fade-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass rounded-3xl h-32 animate-pulse" />
              ))
            : sortedTeams.map((team, i) => {
                const teamInfo = TEAMS[team.id as TeamId];
                const stepsForMode =
                  mode === "cumulative" ? team.totalSteps : (dailySteps[team.id] ?? 0);
                const pct = (stepsForMode / maxSteps) * 100;
                const isMyTeam = profile?.teamId === team.id;

                return (
                  <div
                    key={team.id}
                    className={cn(
                      "glass rounded-3xl p-6 transition-all",
                      isMyTeam && "ring-1 ring-[var(--gold)]/40"
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{teamInfo?.emoji}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/calendar?teamId=${team.id}`}
                              className="font-display text-2xl text-white hover:text-[var(--gold)] transition-colors"
                            >
                              {teamInfo?.name}
                            </Link>
                            {isMyTeam && (
                              <span className="text-xs font-mono text-[var(--gold)] bg-[var(--gold)]/10 px-2 py-0.5 rounded-full">
                                your team
                              </span>
                            )}
                          </div>
                          <div className="text-white/30 text-xs font-mono">
                            {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-2xl" style={{ color: i === 0 ? "var(--gold)" : "rgba(255,255,255,0.6)" }}>
                          {formatSteps(stepsForMode)}
                        </div>
                        <div className="text-white/25 text-xs font-mono">steps</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: teamInfo?.color ?? "var(--gold)",
                        }}
                      />
                    </div>

                    {/* Rank badge */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs font-mono text-white/20">
                        {i === 0 ? "🥇 Leading" : i === 1 ? "🥈 2nd place" : "🥉 3rd place"}
                      </div>
                      {!isMyTeam && profile?.teamId && (
                        <div>
                          {confirmSwitch === team.id ? (
                            <div className="flex gap-2 items-center">
                              <span className="text-xs text-white/40 font-mono">Switch?</span>
                              <button
                                onClick={() => handleSwitchTeam(team.id as TeamId)}
                                disabled={switching}
                                className="text-xs text-[var(--gold)] font-mono hover:text-[var(--gold-light)]"
                              >
                                {switching ? "..." : "yes"}
                              </button>
                              <button
                                onClick={() => setConfirmSwitch(null)}
                                className="text-xs text-white/30 font-mono hover:text-white/50"
                              >
                                cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmSwitch(team.id as TeamId)}
                              className="text-xs font-mono text-white/20 hover:text-white/50 transition-colors"
                            >
                              switch team →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>

        {/* All three teams shown even if 0 steps */}
        {!loading && sortedTeams.length < 3 && (
          <div className="mt-4 text-center text-white/20 text-xs font-mono">
            Some teams have no members yet — invite friends!
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
