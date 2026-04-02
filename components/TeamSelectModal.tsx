"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { joinTeam, TEAMS, TeamId } from "@/lib/firestore";
import { cn } from "@/lib/utils";

export default function TeamSelectModal() {
  const { user, profile, refreshProfile } = useAuth();
  const [selected, setSelected] = useState<TeamId | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user || profile?.teamId) return null;

  const handleJoin = async () => {
    if (!selected || !user) return;
    setLoading(true);
    try {
      await joinTeam(user.uid, selected);
      await refreshProfile();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const teamList: { id: TeamId; name: string; emoji: string; color: string; desc: string }[] = [
    { id: "utah", name: "Utah", emoji: "🏔️", color: "#cc0000", desc: "The Beehive State" },
    { id: "texas", name: "Texas", emoji: "⭐", color: "#bf5700", desc: "The Lone Star State" },
    { id: "virginia", name: "Virginia", emoji: "🌿", color: "#003087", desc: "The Old Dominion" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="glass rounded-3xl p-8 max-w-md w-full border border-white/10 animate-fade-up">
        <div className="text-center mb-8">
          <div className="text-[var(--gold)] font-mono text-xs tracking-widest uppercase mb-3">
            Welcome, {profile?.displayName?.split(" ")[0]}
          </div>
          <h2 className="font-display text-4xl text-white mb-2">Choose Your Team</h2>
          <p className="text-white/40 text-sm">
            You'll compete together and climb the leaderboard as one.
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          {teamList.map((team) => (
            <button
              key={team.id}
              onClick={() => setSelected(team.id)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 text-left",
                selected === team.id
                  ? "border-[var(--gold)] bg-[var(--gold)]/10"
                  : "border-white/[0.06] hover:border-white/20 hover:bg-white/[0.03]"
              )}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: `${team.color}20`, border: `1px solid ${team.color}40` }}
              >
                {team.emoji}
              </div>
              <div>
                <div className="font-semibold text-white">{team.name}</div>
                <div className="text-xs text-white/40 font-mono">{team.desc}</div>
              </div>
              {selected === team.id && (
                <div className="ml-auto text-[var(--gold)] text-lg">✓</div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleJoin}
          disabled={!selected || loading}
          className={cn(
            "w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-200",
            selected && !loading
              ? "bg-[var(--gold)] text-black hover:bg-[var(--gold-light)] hover:scale-[1.02] active:scale-[0.98]"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          )}
        >
          {loading ? "Joining…" : selected ? `Join ${TEAMS[selected].name}` : "Select a team"}
        </button>
      </div>
    </div>
  );
}
