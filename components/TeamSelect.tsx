"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { joinTeam, TEAMS, TeamId } from "@/lib/firestore";
import { cn } from "@/lib/utils";

export default function TeamSelect() {
  const { profile, refreshProfile } = useAuth();
  const [selected, setSelected] = useState<TeamId | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!selected || !profile) return;
    setLoading(true);
    try {
      await joinTeam(profile.uid, selected);
      await refreshProfile();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
      <div className="text-center mb-10 animate-fade-up">
        <div className="text-[var(--gold)] text-xs font-mono tracking-[0.3em] uppercase mb-4 opacity-60">
          Step 1 of 1
        </div>
        <h2 className="font-display text-5xl text-white mb-3">
          Pick your <span className="italic text-[var(--gold)]">team</span>
        </h2>
        <p className="text-white/40 font-body">
          You can switch teams later from your profile.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-8">
        {(Object.entries(TEAMS) as [TeamId, (typeof TEAMS)[TeamId]][]).map(
          ([id, team], i) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={cn(
                "group glass rounded-2xl p-8 text-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] animate-fade-up",
                selected === id
                  ? "ring-2 bg-white/[0.06]"
                  : "hover:bg-white/[0.04]"
              )}
              style={{
                animationDelay: `${i * 0.08}s`,
                opacity: 0,
                borderColor:
                  selected === id ? `${team.color}80` : "rgba(255,255,255,0.07)",
              }}
            >
              <div className="text-5xl mb-4">{team.emoji}</div>
              <div className="font-display text-2xl text-white mb-1">
                {team.name}
              </div>
              <div
                className="text-xs font-mono mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: team.color }}
              >
                {selected === id ? "✓ Selected" : "Select →"}
              </div>
            </button>
          )
        )}
      </div>

      <button
        onClick={handleJoin}
        disabled={!selected || loading}
        className={cn(
          "px-10 py-4 rounded-2xl font-medium text-sm transition-all duration-300",
          selected
            ? "bg-[var(--gold)] text-black hover:bg-[var(--gold-light)] hover:scale-[1.02] active:scale-[0.98]"
            : "glass text-white/20 cursor-not-allowed"
        )}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            Joining...
          </span>
        ) : (
          "Join Team →"
        )}
      </button>
    </div>
  );
}
