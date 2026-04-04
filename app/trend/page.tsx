"use client";

import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth-context";
import {
  getAllUsersStepsForMonth,
  getAllUserProfiles,
  UserProfile,
  StepEntry,
  TEAMS,
  TeamId,
} from "@/lib/firestore";
import { formatSteps, cn } from "@/lib/utils";
import {
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  format,
  startOfDay,
} from "date-fns";

const TEAM_GOAL = 1_000_000;
const TODAY = startOfDay(new Date());
const MONTH = new Date();
const TOTAL_DAYS_IN_MONTH = endOfMonth(MONTH).getDate();

// Only days from start of month through today
const ALL_DAYS = eachDayOfInterval({
  start: startOfMonth(MONTH),
  end: TODAY,
});
const DAYS_SO_FAR = ALL_DAYS.length;

const CHART_W = 800;
const CHART_H = 300;
const PAD = { top: 20, right: 24, bottom: 36, left: 72 };
const INNER_W = CHART_W - PAD.left - PAD.right;
const INNER_H = CHART_H - PAD.top - PAD.bottom;

type ChartMode = "individual" | "team";

function toX(dayIndex: number) {
  if (DAYS_SO_FAR === 1) return PAD.left + INNER_W / 2;
  return PAD.left + (dayIndex / (DAYS_SO_FAR - 1)) * INNER_W;
}

function toY(steps: number, maxSteps: number) {
  return PAD.top + INNER_H - (steps / maxSteps) * INNER_H;
}

function polyline(points: { x: number; y: number }[]) {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function yTicks(maxVal: number) {
  return [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    val: Math.round(maxVal * pct),
    y: toY(maxVal * pct, maxVal),
  }));
}

export default function TrendPage() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<ChartMode>("individual");
  const [allSteps, setAllSteps] = useState<Record<string, StepEntry[]>>({});
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [showOthers, setShowOthers] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stepsData, usersData] = await Promise.all([
        getAllUsersStepsForMonth(MONTH.getFullYear(), MONTH.getMonth()),
        getAllUserProfiles(),
      ]);
      setAllSteps(stepsData);
      setAllUsers(usersData.filter((u) => u.teamId));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!profile?.teamId) return <AuthGuard><div /></AuthGuard>;

  const myTeamId = profile.teamId;
  const teamInfo = TEAMS[myTeamId];
  const teamMembers = allUsers.filter((u) => u.teamId === myTeamId);
  const myGoal = Math.round(TEAM_GOAL / Math.max(teamMembers.length, 1));

  // Goals scaled to days elapsed so far
  const myGoalToDate = Math.round(myGoal * (DAYS_SO_FAR / TOTAL_DAYS_IN_MONTH));
  const teamGoalToDate = Math.round(TEAM_GOAL * (DAYS_SO_FAR / TOTAL_DAYS_IN_MONTH));

  // ── Helpers ───────────────────────────────────────────────────────────────

  function stepMapFor(uid: string): Record<string, number> {
    const map: Record<string, number> = {};
    (allSteps[uid] ?? []).forEach((e) => (map[e.date] = e.steps));
    return map;
  }

  function buildUserLine(uid: string, maxVal: number): { x: number; y: number }[] {
    const map = stepMapFor(uid);
    let cum = 0;
    return ALL_DAYS.map((d, i) => {
      cum += map[format(d, "yyyy-MM-dd")] ?? 0;
      return { x: toX(i), y: toY(cum, maxVal) };
    });
  }

  function buildTeamLine(teamId: TeamId, maxVal: number): { x: number; y: number }[] {
    const members = allUsers.filter((u) => u.teamId === teamId);
    let cum = 0;
    return ALL_DAYS.map((d, i) => {
      const dateStr = format(d, "yyyy-MM-dd");
      members.forEach((m) => {
        cum += (allSteps[m.uid] ?? []).find((e) => e.date === dateStr)?.steps ?? 0;
      });
      return { x: toX(i), y: toY(cum, maxVal) };
    });
  }

  // ── Individual data ───────────────────────────────────────────────────────

  const myStepMap = stepMapFor(profile.uid);
  let myCumulative = 0;
  ALL_DAYS.forEach((d) => {
    myCumulative += myStepMap[format(d, "yyyy-MM-dd")] ?? 0;
  });

  const indivMax = Math.max(myGoalToDate * 1.3, myCumulative * 1.3, 1000);
  const myActualLine = buildUserLine(profile.uid, indivMax);
  const myPaceLine = [
    { x: toX(0), y: toY(0, indivMax) },
    { x: toX(DAYS_SO_FAR - 1), y: toY(myGoalToDate, indivMax) },
  ];

  const otherUsers = allUsers.filter((u) => u.uid !== profile.uid);
  const myDelta = myCumulative - myGoalToDate;

  // ── Team data ─────────────────────────────────────────────────────────────

  let myTeamTotal = 0;
  teamMembers.forEach((m) => {
    (allSteps[m.uid] ?? []).forEach((e) => (myTeamTotal += e.steps));
  });

  const teamMax = Math.max(teamGoalToDate * 1.3, myTeamTotal * 1.3, 1000);
  const myTeamLine = buildTeamLine(myTeamId, teamMax);
  const teamPaceLine = [
    { x: toX(0), y: toY(0, teamMax) },
    { x: toX(DAYS_SO_FAR - 1), y: toY(teamGoalToDate, teamMax) },
  ];

  const otherTeamIds = (Object.keys(TEAMS) as TeamId[]).filter((t) => t !== myTeamId);
  const teamDelta = myTeamTotal - teamGoalToDate;

  // ── X-axis labels ─────────────────────────────────────────────────────────

  const xLabels = ALL_DAYS
    .map((d, i) => ({ i, label: format(d, "d") }))
    .filter(({ i }) => i === 0 || (i + 1) % 5 === 0 || i === DAYS_SO_FAR - 1);

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <div className="text-white/30 text-xs font-mono tracking-widest uppercase mb-1">
            {format(MONTH, "MMMM yyyy")}
          </div>
          <h1 className="font-display text-4xl text-white">
            Pace <span className="italic text-[var(--gold)]">Tracker</span>
          </h1>
          <p className="text-white/30 text-sm font-mono mt-1">
            Team goal:{" "}
            <span className="text-white/50">1,000,000 steps</span>
            {" · "}Your goal:{" "}
            <span className="text-[var(--gold)]">{formatSteps(myGoal)}</span>
            {" · "}Day {DAYS_SO_FAR} of {TOTAL_DAYS_IN_MONTH}
          </p>
        </div>

        {/* Mode toggle */}
        <div
          className="flex gap-2 mb-6 animate-fade-up"
          style={{ animationDelay: "0.05s", opacity: 0 }}
        >
          {(["individual", "team"] as ChartMode[]).map((m) => (
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
              {m === "individual" ? "👤 Individual" : "🤝 Team"}
            </button>
          ))}
        </div>

        {/* Chart card */}
        <div
          className="glass rounded-3xl p-6 mb-4 animate-fade-up"
          style={{ animationDelay: "0.1s", opacity: 0 }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-64 text-white/20 font-mono text-sm">
              Loading...
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              className="w-full"
              style={{ fontFamily: "DM Mono, monospace" }}
            >
              {/* Y grid + labels */}
              {(mode === "individual" ? yTicks(indivMax) : yTicks(teamMax)).map((tick) => (
                <g key={tick.val}>
                  <line
                    x1={PAD.left} y1={tick.y}
                    x2={CHART_W - PAD.right} y2={tick.y}
                    stroke="rgba(255,255,255,0.05)" strokeWidth="1"
                  />
                  <text
                    x={PAD.left - 8} y={tick.y + 4}
                    textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.25)"
                  >
                    {formatSteps(tick.val)}
                  </text>
                </g>
              ))}

              {/* X labels */}
              {xLabels.map(({ i, label }) => (
                <text
                  key={i}
                  x={toX(i)} y={CHART_H - PAD.bottom + 14}
                  textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.25)"
                >
                  {label}
                </text>
              ))}

              {/* ── INDIVIDUAL ── */}
              {mode === "individual" && (
                <>
                  {showOthers && otherUsers.map((u) => {
                    const line = buildUserLine(u.uid, indivMax);
                    const color = u.teamId ? TEAMS[u.teamId as TeamId].color : "#666";
                    return (
                      <polyline
                        key={u.uid}
                        points={polyline(line)}
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        strokeOpacity="0.3"
                        strokeLinejoin="round"
                      />
                    );
                  })}

                  {/* Pace */}
                  <polyline
                    points={polyline(myPaceLine)}
                    fill="none"
                    stroke="rgba(201,168,76,0.45)"
                    strokeWidth="2"
                    strokeDasharray="6,4"
                  />

                  {/* My actual */}
                  <polyline
                    points={polyline(myActualLine)}
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {myActualLine.length > 0 && (
                    <circle
                      cx={myActualLine[myActualLine.length - 1].x}
                      cy={myActualLine[myActualLine.length - 1].y}
                      r="4" fill="var(--gold)"
                    />
                  )}

                  {/* Legend */}
                  <g transform={`translate(${PAD.left + 8},${PAD.top + 6})`}>
                    <line x1="0" y1="6" x2="18" y2="6"
                      stroke="rgba(201,168,76,0.5)" strokeWidth="2" strokeDasharray="5,3" />
                    <text x="24" y="10" fontSize="10" fill="rgba(255,255,255,0.35)">Pace to goal</text>
                    <line x1="0" y1="22" x2="18" y2="22"
                      stroke="var(--gold)" strokeWidth="2.5" />
                    <text x="24" y="26" fontSize="10" fill="rgba(255,255,255,0.35)">Your steps</text>
                  </g>
                </>
              )}

              {/* ── TEAM ── */}
              {mode === "team" && (
                <>
                  {showOthers && otherTeamIds.map((tid) => {
                    const line = buildTeamLine(tid, teamMax);
                    const last = line[line.length - 1];
                    return (
                      <g key={tid}>
                        <polyline
                          points={polyline(line)}
                          fill="none"
                          stroke={TEAMS[tid].color}
                          strokeWidth="2"
                          strokeOpacity="0.4"
                          strokeLinejoin="round"
                        />
                        {last && (
                          <text
                            x={last.x + 5} y={last.y + 4}
                            fontSize="9" fill={TEAMS[tid].color} opacity="0.8"
                          >
                            {TEAMS[tid].name}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Pace */}
                  <polyline
                    points={polyline(teamPaceLine)}
                    fill="none"
                    stroke="rgba(201,168,76,0.45)"
                    strokeWidth="2"
                    strokeDasharray="6,4"
                  />

                  {/* My team actual */}
                  <polyline
                    points={polyline(myTeamLine)}
                    fill="none"
                    stroke={teamInfo.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {myTeamLine.length > 0 && (
                    <circle
                      cx={myTeamLine[myTeamLine.length - 1].x}
                      cy={myTeamLine[myTeamLine.length - 1].y}
                      r="4" fill={teamInfo.color}
                    />
                  )}

                  {/* Legend */}
                  <g transform={`translate(${PAD.left + 8},${PAD.top + 6})`}>
                    <line x1="0" y1="6" x2="18" y2="6"
                      stroke="rgba(201,168,76,0.5)" strokeWidth="2" strokeDasharray="5,3" />
                    <text x="24" y="10" fontSize="10" fill="rgba(255,255,255,0.35)">Pace to 1M</text>
                    <line x1="0" y1="22" x2="18" y2="22"
                      stroke={teamInfo.color} strokeWidth="2.5" />
                    <text x="24" y="26" fontSize="10" fill="rgba(255,255,255,0.35)">
                      {teamInfo.emoji} {teamInfo.name}
                    </text>
                  </g>
                </>
              )}
            </svg>
          )}

          {/* Show others checkbox */}
          <div className="mt-4 flex items-center gap-3 border-t border-white/[0.05] pt-4">
            <button
              onClick={() => setShowOthers(!showOthers)}
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center transition-all border flex-shrink-0",
                showOthers
                  ? "bg-[var(--gold)] border-[var(--gold)]"
                  : "border-white/20 bg-transparent"
              )}
            >
              {showOthers && <span className="text-black text-xs font-bold">✓</span>}
            </button>
            <span className="text-white/40 text-sm font-mono">
              {mode === "individual" ? "Show other participants" : "Show other teams"}
            </span>
            {showOthers && mode === "team" && (
              <div className="flex gap-4 ml-2">
                {otherTeamIds.map((t) => (
                  <div key={t} className="flex items-center gap-1.5">
                    <div className="w-4 h-0.5 rounded" style={{ backgroundColor: TEAMS[t].color }} />
                    <span className="text-xs font-mono text-white/30">{TEAMS[t].name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delta cards — always both visible */}
        <div
          className="grid grid-cols-2 gap-4 animate-fade-up"
          style={{ animationDelay: "0.15s", opacity: 0 }}
        >
          {/* Individual */}
          <div className={cn(
            "glass rounded-2xl p-6 text-center border transition-all duration-300",
            mode === "individual" ? "border-white/10" : "border-white/[0.03] opacity-50"
          )}>
            <div className="text-white/30 text-xs font-mono uppercase tracking-widest mb-3">
              You vs. pace
            </div>
            <div className={cn(
              "font-display text-4xl font-bold",
              myDelta >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {myDelta >= 0 ? "+" : ""}{myDelta.toLocaleString()}
            </div>
            <div className="text-white/20 text-xs font-mono mt-2">
              {formatSteps(myCumulative)} of {formatSteps(myGoalToDate)} target
            </div>
          </div>

          {/* Team */}
          <div className={cn(
            "glass rounded-2xl p-6 text-center border transition-all duration-300",
            mode === "team" ? "border-white/10" : "border-white/[0.03] opacity-50"
          )}>
            <div className="text-white/30 text-xs font-mono uppercase tracking-widest mb-3">
              {teamInfo.emoji} {teamInfo.name} vs. pace
            </div>
            <div className={cn(
              "font-display text-4xl font-bold",
              teamDelta >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {teamDelta >= 0 ? "+" : ""}{Math.round(teamDelta).toLocaleString()}
            </div>
            <div className="text-white/20 text-xs font-mono mt-2">
              {formatSteps(myTeamTotal)} of {formatSteps(teamGoalToDate)} target
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
