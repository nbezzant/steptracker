"use client";

import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth-context";
import { getUserHabits, upsertHabitEntry, HabitEntry } from "@/lib/habits-firestore";
import { dateKey } from "@/lib/firestore";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  isFuture,
  isToday,
  subMonths,
  addMonths,
  isBefore,
  startOfDay,
} from "date-fns";

const CUTOFF = new Date(2026, 5, 1); // June 1, 2026
import { cn } from "@/lib/utils";

interface EditState {
  date: string;
  slept: boolean;
  talked: boolean;
}

export default function HabitsCalendarPage() {
  const { profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const cutoffMonth = startOfMonth(CUTOFF);
  const [habitMap, setHabitMap] = useState<Record<string, { slept: boolean; talked: boolean }>>({});
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const loadHabits = useCallback(async () => {
    if (!profile) return;
    const entries: HabitEntry[] = await getUserHabits(profile.uid);
    const map: Record<string, { slept: boolean; talked: boolean }> = {};
    entries.forEach((e) => { map[e.date] = { slept: e.slept, talked: e.talked }; });
    setHabitMap(map);
  }, [profile]);

  useEffect(() => { loadHabits(); }, [loadHabits]);

  const calStart = startOfWeek(startOfMonth(currentMonth));
  const calEnd = endOfWeek(endOfMonth(currentMonth));
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const today = new Date();

  const handleDayClick = (day: Date) => {
    const future = isFuture(day) && !isToday(day);
    const inMonth = day >= monthStart && day <= monthEnd;
    const beforeCutoff = isBefore(startOfDay(day), startOfDay(CUTOFF));
    if (future || !inMonth || beforeCutoff) return;
    const dateStr = dateKey(day);
    const current = habitMap[dateStr] || { slept: false, talked: false };
    setEditState({ date: dateStr, slept: current.slept, talked: current.talked });
  };

  const handleUpdate = async () => {
    if (!profile || !editState) return;
    setSaving(true);
    try {
      await upsertHabitEntry(profile.uid, editState.date, editState.slept, editState.talked);
      setHabitMap((prev) => ({
        ...prev,
        [editState.date]: { slept: editState.slept, talked: editState.talked },
      }));
      setEditState(null);
    } finally {
      setSaving(false);
    }
  };

  // Month stats
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(
    (d) => (!isFuture(d) || isToday(d)) && !isBefore(startOfDay(d), startOfDay(CUTOFF))
  );
  const monthCompleted = monthDays.filter((d) => {
    const h = habitMap[dateKey(d)];
    return h?.slept && h?.talked;
  }).length;
  const monthSlept = monthDays.filter((d) => habitMap[dateKey(d)]?.slept).length;
  const monthTalked = monthDays.filter((d) => habitMap[dateKey(d)]?.talked).length;

  return (
    <AuthGuard>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-up">
          <div>
            <div className="text-white/30 text-xs font-mono tracking-widest uppercase mb-1">Calendar</div>
            <h1 className="font-display text-4xl text-white">
              {format(currentMonth, "MMMM")}{" "}
              <span className="text-emerald-400">{format(currentMonth, "yyyy")}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              disabled={startOfMonth(currentMonth) <= cutoffMonth}
              className="glass rounded-xl px-3 py-2 text-white/50 hover:text-white transition-all text-sm active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="glass rounded-xl px-3 py-2 text-white/50 hover:text-white transition-all text-xs font-mono active:scale-95"
            >
              Now
            </button>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              disabled={addMonths(currentMonth, 1) > today}
              className="glass rounded-xl px-3 py-2 text-white/50 hover:text-white transition-all text-sm disabled:opacity-20 disabled:cursor-not-allowed active:scale-95"
            >
              →
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5 animate-fade-up" style={{ animationDelay: "0.05s", opacity: 0 }}>
          {[
            { label: "Both Done", value: `${monthCompleted}d`, color: "text-emerald-400" },
            { label: "🌙 Sleep", value: `${monthSlept}d`, color: "text-white" },
            { label: "🎧 Talk", value: `${monthTalked}d`, color: "text-white" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center">
              <div className="text-white/30 text-[10px] font-mono uppercase tracking-widest mb-1">{s.label}</div>
              <div className={cn("font-display text-2xl", s.color)}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="glass rounded-3xl p-4 animate-fade-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-mono text-white/25 py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dateStr = dateKey(day);
              const inMonth = day >= monthStart && day <= monthEnd;
              const future = isFuture(day) && !isToday(day);
              const todayDay = isToday(day);
              const beforeCutoff = isBefore(startOfDay(day), startOfDay(CUTOFF));
              const strictlyPast = inMonth && !todayDay && !beforeCutoff && isBefore(startOfDay(day), startOfDay(today));
              const clickable = inMonth && !future && !beforeCutoff;
              const habits = habitMap[dateStr] || { slept: false, talked: false };

              const topColor = (() => {
                if (!inMonth || future || beforeCutoff) return "bg-white/[0.02]";
                if (habits.slept) return "bg-emerald-500/50";
                if (strictlyPast) return "bg-red-500/40";
                return "bg-white/[0.03]";
              })();

              const bottomColor = (() => {
                if (!inMonth || future || beforeCutoff) return "bg-white/[0.02]";
                if (habits.talked) return "bg-emerald-500/50";
                if (strictlyPast) return "bg-red-500/40";
                return "bg-white/[0.03]";
              })();

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden transition-all duration-150",
                    (!inMonth || beforeCutoff) && "opacity-20",
                    future && "opacity-25",
                    clickable && "cursor-pointer active:scale-95 hover:ring-1 hover:ring-white/20",
                    todayDay && "ring-1 ring-emerald-400/60"
                  )}
                >
                  <div className={cn("absolute top-0 left-0 right-0 h-1/2 transition-colors duration-200", topColor)} />
                  <div className="absolute top-1/2 left-1 right-1 h-px bg-black/20" />
                  <div className={cn("absolute bottom-0 left-0 right-0 h-1/2 transition-colors duration-200", bottomColor)} />
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <span className={cn(
                      "text-[10px] font-mono leading-none",
                      todayDay ? "text-white font-bold" : "text-white/60"
                    )}>
                      {format(day, "d")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-between text-[10px] font-mono">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-500/50" />
                <span className="text-white/30">done</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-500/40" />
                <span className="text-white/30">missed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-white/[0.04] border border-white/10" />
                <span className="text-white/30">pending</span>
              </div>
            </div>
            <div className="text-white/20 flex flex-col items-end gap-0.5">
              <span>top 🌙 sleep</span>
              <span>btm 🎧 talk</span>
            </div>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs font-mono mt-4">
          Tap any past or current day to edit
        </p>
      </div>

      {/* Edit modal */}
      {editState && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditState(null); }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditState(null)} />
          <div className="relative glass rounded-3xl p-6 w-full max-w-sm animate-fade-up">
            {/* Modal header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-white/30 text-[10px] font-mono uppercase tracking-widest mb-0.5">Edit</div>
                <div className="text-white font-mono font-medium">
                  {format(new Date(editState.date + "T12:00:00"), "EEEE, MMMM d")}
                </div>
              </div>
              <button
                onClick={() => setEditState(null)}
                className="text-white/30 hover:text-white/60 transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 mb-6">
              {(["slept", "talked"] as const).map((field) => {
                const checked = editState[field];
                return (
                  <button
                    key={field}
                    onClick={() => setEditState((s) => s ? { ...s, [field]: !s[field] } : s)}
                    className="w-full flex items-center gap-4 glass rounded-2xl px-4 py-4 transition-all duration-150 active:scale-[0.98] hover:bg-white/[0.04]"
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150",
                      checked ? "bg-emerald-500 border-emerald-500" : "border-white/25"
                    )}>
                      {checked && (
                        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xl">{field === "slept" ? "🌙" : "🎧"}</span>
                    <span className="flex-1 text-left text-sm text-white/70 font-mono">
                      {field === "slept" ? "Slept 7+ hours" : "Listened to a talk"}
                    </span>
                    {checked && <span className="text-xs text-emerald-400 font-mono">✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Update button */}
            <button
              onClick={handleUpdate}
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-mono font-medium text-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Update"}
            </button>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
