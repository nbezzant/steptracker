"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth-context";
import {
  getUserStepsForMonth,
  getTeamStepsForMonth,
  getUserProfile,
  upsertStepEntry,
  dateKey,
  StepEntry,
  TEAMS,
  TeamId,
  UserProfile,
} from "@/lib/firestore";
import { formatSteps, cn } from "@/lib/utils";
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
} from "date-fns";

function CalendarContent() {
  const { profile, refreshProfile } = useAuth();
  const searchParams = useSearchParams();
  const viewUserId = searchParams.get("userId");
  const viewTeamId = searchParams.get("teamId") as TeamId | null;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stepMap, setStepMap] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewProfile, setViewProfile] = useState<UserProfile | null>(null);

  const isViewAs = !!(viewUserId || viewTeamId);

  useEffect(() => {
    if (viewUserId) {
      getUserProfile(viewUserId).then(setViewProfile);
    } else {
      setViewProfile(null);
    }
  }, [viewUserId]);

  const loadMonth = useCallback(async () => {
    if (!profile) return;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    if (viewTeamId) {
      const teamSteps = await getTeamStepsForMonth(viewTeamId, year, month);
      setStepMap(teamSteps);
    } else {
      const uid = viewUserId || profile.uid;
      const entries: StepEntry[] = await getUserStepsForMonth(uid, year, month);
      const map: Record<string, number> = {};
      entries.forEach((e) => (map[e.date] = e.steps));
      setStepMap(map);
    }
  }, [profile, currentMonth, viewUserId, viewTeamId]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const calStart = startOfWeek(startOfMonth(currentMonth));
  const calEnd = endOfWeek(endOfMonth(currentMonth));
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const maxSteps = Math.max(...Object.values(stepMap), 1);

  const handleEdit = (dateStr: string, current: number) => {
    if (isViewAs) return;
    setEditing(dateStr);
    setEditValue(current > 0 ? current.toString() : "");
  };

  const handleSave = async () => {
    if (!profile || !editing) return;
    const num = parseInt(editValue, 10);
    if (isNaN(num) || num < 0) { setEditing(null); return; }
    setSaving(true);
    try {
      await upsertStepEntry(profile.uid, editing, num);
      setStepMap((prev) => ({ ...prev, [editing]: num }));
      await refreshProfile();
    } finally {
      setSaving(false);
      setEditing(null);
      setEditValue("");
    }
  };

  const totalThisMonth = Object.values(stepMap).reduce((a, b) => a + b, 0);
  const daysLogged = Object.values(stepMap).filter((v) => v > 0).length;

  const viewAsLabel = viewTeamId
    ? `${TEAMS[viewTeamId]?.emoji} ${TEAMS[viewTeamId]?.name} Team`
    : viewProfile
    ? viewProfile.displayName
    : null;

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* View-as banner */}
        {isViewAs && (
          <div className="mb-5 flex items-center gap-3 animate-fade-up">
            <Link
              href="/calendar"
              className="text-xs text-white/30 font-mono hover:text-white/60 transition-colors"
            >
              ← my calendar
            </Link>
            {viewAsLabel && (
              <div className="text-xs font-mono text-[var(--gold)]/80 bg-[var(--gold)]/10 px-3 py-1 rounded-full">
                viewing: {viewAsLabel}
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-up">
          <div>
            <div className="text-white/30 text-xs font-mono tracking-widest uppercase mb-1">
              {isViewAs ? "Viewing" : "Calendar"}
            </div>
            <h1 className="font-display text-4xl text-white">
              {format(currentMonth, "MMMM")}{" "}
              <span className="text-[var(--gold)]">{format(currentMonth, "yyyy")}</span>
            </h1>
            {isViewAs && viewAsLabel && (
              <div className="text-white/40 text-sm font-mono mt-1">{viewAsLabel}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="glass rounded-xl px-4 py-2 text-white/50 hover:text-white transition-all text-sm"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="glass rounded-xl px-4 py-2 text-white/50 hover:text-white transition-all text-xs font-mono"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              disabled={addMonths(currentMonth, 1) > new Date()}
              className="glass rounded-xl px-4 py-2 text-white/50 hover:text-white transition-all text-sm disabled:opacity-20 disabled:cursor-not-allowed"
            >
              →
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-up" style={{ animationDelay: "0.05s", opacity: 0 }}>
          {[
            { label: "Month Total", value: formatSteps(totalThisMonth) },
            { label: "Days Logged", value: `${daysLogged}` },
            { label: "Daily Avg", value: daysLogged > 0 ? formatSteps(Math.round(totalThisMonth / daysLogged)) : "—" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center">
              <div className="text-white/30 text-xs font-mono uppercase tracking-widest mb-1">{s.label}</div>
              <div className="font-display text-2xl text-white">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="glass rounded-3xl p-6 animate-fade-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-mono text-white/25 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dateStr = dateKey(day);
              const steps = stepMap[dateStr] ?? 0;
              const inMonth = day >= monthStart && day <= monthEnd;
              const future = isFuture(day) && !isToday(day);
              const today = isToday(day);
              const intensity = steps > 0 ? Math.max(0.1, steps / maxSteps) : 0;
              const isEditing = editing === dateStr;
              const clickable = !future && inMonth && !isViewAs;

              return (
                <div
                  key={dateStr}
                  className={cn(
                    "relative aspect-square rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 group",
                    !inMonth && "opacity-20",
                    future && "opacity-30 cursor-not-allowed",
                    clickable && "cursor-pointer hover:ring-1 hover:ring-[var(--gold)]/30",
                    isViewAs && inMonth && !future && "cursor-default",
                    today && "ring-1 ring-[var(--gold)]/60"
                  )}
                  style={{
                    backgroundColor: steps > 0
                      ? `rgba(201,168,76,${intensity * 0.35})`
                      : "rgba(255,255,255,0.02)",
                  }}
                  onClick={() => !future && inMonth && !isEditing && handleEdit(dateStr, steps)}
                >
                  <div className={cn("text-xs font-mono", today ? "text-[var(--gold)]" : "text-white/40")}>
                    {format(day, "d")}
                  </div>
                  {steps > 0 && !isEditing && (
                    <div className="text-[10px] font-mono text-[var(--gold)] opacity-80">
                      {formatSteps(steps)}
                    </div>
                  )}
                  {future && inMonth && (
                    <div className="text-[10px] text-white/20">—</div>
                  )}

                  {/* Inline edit */}
                  {isEditing && (
                    <div
                      className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-[#1e2535] ring-1 ring-[var(--gold)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave();
                          if (e.key === "Escape") setEditing(null);
                        }}
                        className="w-full bg-transparent text-center text-xs text-white font-mono focus:outline-none px-1"
                        placeholder="steps"
                      />
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-[10px] text-[var(--gold)] mt-1 font-mono"
                      >
                        {saving ? "..." : "save"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-3 justify-end">
            <div className="text-xs font-mono text-white/20">Less</div>
            {[0.05, 0.12, 0.22, 0.33].map((o, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded"
                style={{ backgroundColor: `rgba(201,168,76,${o})` }}
              />
            ))}
            <div className="text-xs font-mono text-white/20">More</div>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs font-mono mt-4">
          {isViewAs
            ? "Read-only view · Steps shown are totals for this person or team"
            : "Tap any past or current day to log steps · Future days are locked"}
        </p>
      </div>
    </AuthGuard>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <CalendarContent />
    </Suspense>
  );
}
