"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { upsertStepEntry, getUserStepsForDate, dateKey } from "@/lib/firestore";
import { formatSteps, cn } from "@/lib/utils";
import { subDays } from "date-fns";

const QUICK_ADD = [1000, 2500, 5000, 10000];

export default function StepLogger() {
  const { profile, refreshProfile } = useAuth();
  const today = new Date();
  const yesterday = subDays(today, 1);

  const [activeDay, setActiveDay] = useState<"today" | "yesterday">("today");
  const [steps, setSteps] = useState("");
  const [currentSteps, setCurrentSteps] = useState<{ today: number; yesterday: number }>({
    today: 0,
    yesterday: 0,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const [t, y] = await Promise.all([
        getUserStepsForDate(profile.uid, dateKey(today)),
        getUserStepsForDate(profile.uid, dateKey(yesterday)),
      ]);
      setCurrentSteps({ today: t, yesterday: y });
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid]);

  const current = activeDay === "today" ? currentSteps.today : currentSteps.yesterday;
  const targetDate = activeDay === "today" ? today : yesterday;

  const handleSave = async () => {
    if (!profile || !steps) return;
    const num = parseInt(steps.replace(/,/g, ""), 10);
    if (isNaN(num) || num < 0) return;
    setSaving(true);
    try {
      await upsertStepEntry(profile.uid, dateKey(targetDate), num);
      setCurrentSteps((prev) => ({
        ...prev,
        [activeDay]: num,
      }));
      setSteps("");
      setSaved(true);
      await refreshProfile();
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass rounded-3xl p-8 animate-fade-up">
      {/* Day toggle */}
      <div className="flex gap-2 mb-8">
        {(["today", "yesterday"] as const).map((day) => (
          <button
            key={day}
            onClick={() => { setActiveDay(day); setSteps(""); }}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-mono transition-all duration-200",
              activeDay === day
                ? "bg-[var(--gold)] text-black font-medium"
                : "glass text-white/40 hover:text-white/60"
            )}
          >
            {day === "today"
              ? `Today · ${today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : `Yesterday · ${yesterday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
          </button>
        ))}
      </div>

      {/* Current display */}
      <div className="text-center mb-8">
        <div className="text-white/30 text-xs font-mono tracking-widest uppercase mb-2">
          Current steps logged
        </div>
        <div className="font-display text-7xl text-white">
          {formatSteps(current)}
        </div>
        {current > 0 && (
          <div className="text-white/30 text-sm font-mono mt-2">
            {current.toLocaleString()} steps
          </div>
        )}
      </div>

      {/* Quick add buttons */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {QUICK_ADD.map((amt) => (
          <button
            key={amt}
            onClick={() => setSteps((current + amt).toString())}
            className="glass rounded-xl py-2 text-xs font-mono text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-all"
          >
            +{formatSteps(amt)}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          type="number"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Enter total steps..."
          className="flex-1 glass rounded-xl px-5 py-4 text-white placeholder-white/20 font-mono text-lg focus:outline-none focus:ring-1 focus:ring-[var(--gold)]/40 transition-all"
        />
        <button
          onClick={handleSave}
          disabled={!steps || saving}
          className={cn(
            "px-6 py-4 rounded-xl font-medium text-sm transition-all duration-200",
            steps && !saving
              ? saved
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-[var(--gold)] text-black hover:bg-[var(--gold-light)]"
              : "glass text-white/20 cursor-not-allowed"
          )}
        >
          {saving ? (
            <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin block" />
          ) : saved ? (
            "✓ Saved"
          ) : (
            "Log →"
          )}
        </button>
      </div>

      <p className="text-center text-white/20 text-xs font-mono mt-4">
        This sets your total for the day, not adds to it
      </p>
    </div>
  );
}
