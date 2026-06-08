"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth-context";
import { getUserHabits, upsertHabitEntry } from "@/lib/habits-firestore";
import { dateKey } from "@/lib/firestore";
import { format, subDays, isToday, isBefore, startOfDay, eachDayOfInterval } from "date-fns";
import { cn } from "@/lib/utils";

const CUTOFF = new Date(2026, 5, 1); // June 1, 2026

export default function HabitsLogPage() {
  const { profile } = useAuth();
  const [habitMap, setHabitMap] = useState<Record<string, { slept: boolean; talked: boolean }>>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const today = new Date();
  const days = eachDayOfInterval({ start: CUTOFF, end: today }).reverse();

  useEffect(() => {
    if (!profile) return;
    setLoaded(false);
    setLoadError(false);
    getUserHabits(profile.uid)
      .then((entries) => {
        const map: Record<string, { slept: boolean; talked: boolean }> = {};
        entries.forEach((e) => { map[e.date] = { slept: e.slept, talked: e.talked }; });
        setHabitMap(map);
        setLoaded(true);
      })
      .catch(() => {
        setLoadError(true);
        setLoaded(true);
      });
  }, [profile, fetchKey]);

  const handleToggle = async (date: string, field: "slept" | "talked") => {
    if (!profile) return;
    const current = habitMap[date] || { slept: false, talked: false };
    const updated = { ...current, [field]: !current[field] };

    setHabitMap((prev) => ({ ...prev, [date]: updated }));
    setSaving((prev) => ({ ...prev, [`${date}_${field}`]: true }));
    try {
      await upsertHabitEntry(profile.uid, date, updated.slept, updated.talked);
    } catch {
      setHabitMap((prev) => ({ ...prev, [date]: current }));
    } finally {
      setSaving((prev) => ({ ...prev, [`${date}_${field}`]: false }));
    }
  };

  const completedTotal = Object.values(habitMap).filter((h) => h.slept && h.talked).length;

  return (
    <AuthGuard>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <div className="text-white/30 text-xs font-mono tracking-widest uppercase mb-1">Daily Check-in</div>
          <h1 className="font-display text-4xl text-white">
            Sleep &amp; <span className="italic text-emerald-400">Talk</span>
          </h1>
          {loaded && (
            <p className="text-white/30 font-mono text-sm mt-1">
              {completedTotal} day{completedTotal !== 1 ? "s" : ""} with both completed
            </p>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mb-5 animate-fade-up px-1" style={{ animationDelay: "0.05s", opacity: 0 }}>
          <div className="flex items-center gap-2 text-xs text-white/40 font-mono">
            <span className="text-base">🌙</span> Slept 7+ hrs
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40 font-mono">
            <span className="text-base">🎧</span> Listened to talk
          </div>
        </div>

        {/* Day rows */}
        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
          {loadError ? (
            <div className="glass rounded-3xl py-10 text-center text-white/30 font-mono text-sm px-4">
              Could not load habits. Make sure Firestore rules are deployed.<br />
              <button onClick={() => setFetchKey((k) => k + 1)} className="mt-3 text-xs text-[var(--gold)] hover:text-[var(--gold-light)]">
                Retry
              </button>
            </div>
          ) : !loaded
            ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl h-16 animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
              ))
            : days.map((day) => {
                const dateStr = dateKey(day);
                const todayDay = isToday(day);
                const isPast = isBefore(startOfDay(day), startOfDay(today));
                const habits = habitMap[dateStr] || { slept: false, talked: false };
                const bothDone = habits.slept && habits.talked;

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "glass rounded-2xl px-5 py-4 flex items-center gap-4 transition-all duration-200",
                      todayDay && "ring-1 ring-emerald-400/30",
                      bothDone && "bg-emerald-500/[0.04]"
                    )}
                  >
                    {/* Date */}
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-sm font-mono font-medium",
                        todayDay ? "text-emerald-400" : "text-white/60"
                      )}>
                        {todayDay ? "Today" : format(day, "EEE, MMM d")}
                      </div>
                      {isPast && !todayDay && !bothDone && (
                        <div className="text-[10px] font-mono text-white/20 mt-0.5">
                          {habits.slept || habits.talked ? "partially done" : "missed"}
                        </div>
                      )}
                    </div>

                    {/* Checkboxes */}
                    <div className="flex items-center gap-5">
                      {(["slept", "talked"] as const).map((field) => {
                        const checked = habits[field];
                        const isSaving = saving[`${dateStr}_${field}`];
                        return (
                          <button
                            key={field}
                            onClick={() => handleToggle(dateStr, field)}
                            disabled={isSaving}
                            className={cn(
                              "flex items-center gap-2 group transition-all duration-150 active:scale-95",
                              isSaving && "opacity-50"
                            )}
                            aria-label={field === "slept" ? "Toggle sleep" : "Toggle talk"}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-150 flex-shrink-0",
                              checked
                                ? "bg-emerald-500 border-emerald-500"
                                : "border-white/20 group-hover:border-white/40 group-active:border-emerald-400/50"
                            )}>
                              {checked && (
                                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <span className="text-base leading-none">{field === "slept" ? "🌙" : "🎧"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
        </div>

        <p className="text-center text-white/20 text-xs font-mono mt-6 pb-8">
          Tap a checkbox to toggle · Changes save automatically
        </p>
      </div>
    </AuthGuard>
  );
}
