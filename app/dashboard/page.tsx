"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/AuthGuard";
import TeamSelect from "@/components/TeamSelect";
import StepLogger from "@/components/StepLogger";
import { TEAMS, getDailyLeaderboard, dateKey } from "@/lib/firestore";
import { formatSteps } from "@/lib/utils";
import Image from "next/image";

interface LeaderEntry {
  user: { uid: string; displayName: string; photoURL: string; teamId: string | null };
  steps: number;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [topToday, setTopToday] = useState<LeaderEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      const entries = await getDailyLeaderboard(dateKey(new Date()));
      setTopToday(entries.slice(0, 5) as LeaderEntry[]);
    };
    load();
  }, []);

  return (
    <AuthGuard>
      {!profile?.teamId ? (
        <TeamSelect />
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Greeting */}
          <div className="mb-10 animate-fade-up">
            <div className="text-white/30 text-xs font-mono tracking-widest uppercase mb-2">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
            <h1 className="font-display text-4xl text-white">
              Hey, {profile.displayName.split(" ")[0]}{" "}
              <span className="text-[var(--gold)]">
                {TEAMS[profile.teamId]?.emoji}
              </span>
            </h1>
            <p className="text-white/30 font-body mt-1">
              Team {TEAMS[profile.teamId]?.name} ·{" "}
              {formatSteps(profile.totalSteps)} total steps
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {/* Step logger - main area */}
            <div className="md:col-span-3">
              <StepLogger />
            </div>

            {/* Today's mini leaderboard */}
            <div
              className="md:col-span-2 glass rounded-3xl p-6 animate-fade-up"
              style={{ animationDelay: "0.15s", opacity: 0 }}
            >
              <div className="text-white/30 text-xs font-mono tracking-widest uppercase mb-5">
                Today&apos;s leaders

              </div>
              {topToday.length === 0 ? (
                <div className="text-center py-8 text-white/20 text-sm font-mono">
                  No steps logged yet today
                </div>
              ) : (
                <div className="space-y-3">
                  {topToday.map((entry, i) => (
                    <div
                      key={entry.user.uid}
                      className="flex items-center gap-3"
                    >
                      <div
                        className="w-5 text-center font-mono text-xs"
                        style={{
                          color:
                            i === 0
                              ? "var(--gold)"
                              : i === 1
                              ? "#aaa"
                              : i === 2
                              ? "#cd7f32"
                              : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {i + 1}
                      </div>
                      {entry.user.photoURL ? (
                        <Image
                          src={entry.user.photoURL}
                          alt={entry.user.displayName}
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs">
                          {entry.user.displayName?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/80 truncate">
                          {entry.user.displayName}
                        </div>
                        {entry.user.teamId && (
                          <div className="text-xs text-white/30 font-mono">
                            {TEAMS[entry.user.teamId as keyof typeof TEAMS]?.emoji}{" "}
                            {TEAMS[entry.user.teamId as keyof typeof TEAMS]?.name}
                          </div>
                        )}
                      </div>
                      <div className="font-mono text-sm text-[var(--gold)]">
                        {formatSteps(entry.steps)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          {(() => {
            const personalGoal = Math.round(1_000_000 / 3);
            const stepsRemaining = Math.max(0, personalGoal - profile.totalSteps);
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const daysRemaining = daysInMonth - now.getDate();
            const avgRequired = stepsRemaining > 0 && daysRemaining > 0 ? Math.ceil(stepsRemaining / daysRemaining) : 0;
            const stats = [
              { label: "Total Steps", value: formatSteps(profile.totalSteps) },
              {
                label: "Team",
                value: `${TEAMS[profile.teamId]?.emoji} ${TEAMS[profile.teamId]?.name}`,
              },
              {
                label: "Goal",
                value: `${Math.round((profile.totalSteps / personalGoal) * 100)}%`,
              },
              { label: "Steps Remaining", value: formatSteps(stepsRemaining) },
              {
                label: "Avg/Day Needed After Today",
                value: stepsRemaining > 0 ? formatSteps(avgRequired) : "Goal met!",
              },
            ];
            return (
          <div
            className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 animate-fade-up"
            style={{ animationDelay: "0.25s", opacity: 0 }}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-5 text-center">
                <div className="text-white/30 text-xs font-mono uppercase tracking-widest mb-2">
                  {stat.label}
                </div>
                <div className="font-display text-2xl text-white">{stat.value}</div>
              </div>
            ))}
          </div>
            );
          })()}
        </div>
      )}
    </AuthGuard>
  );
}
