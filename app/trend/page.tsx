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
import { eachDayOfInterval, startOfMonth, endOfMonth, format, isAfter, startOfDay } from "date-fns";

const TEAM_GOAL = 1_000_000;
const TODAY = startOfDay(new Date());
const MONTH = new Date();
const DAYS_IN_MONTH = endOfMonth(MONTH).getDate();
const ALL_DAYS = eachDayOfInterval({
  start: startOfMonth(MONTH),
  end: endOfMonth(MONTH),
});

type ChartMode = "individual" | "team";

interface DayPoint {
  date: string;
  label: string;
  dayNum: number;
  isPast: boolean;
}

const CHART_W = 800;
const CHART_H = 320;
const PAD = { top: 20, right: 24, bottom: 40, left: 72 };
const INNER_W = CHART_W - PAD.left - PAD.right;
const INNER_H = CHART_H - PAD.top - PAD.bottom;

function buildDayPoints(): DayPoint[] {
  return ALL_DAYS.map((d, i) => ({
    date: format(d, "yyyy-MM-dd"),
    label: format(d, "d"),
    dayNum: i + 1,
    isPast: !isAfter(startOfDay(d), TODAY),
  }));
}

function toX(dayNum: number) {
  return PAD.left + ((dayNum - 1) / (DAYS_IN_MONTH - 1)) * INNER_W;
}

function toY(steps: number, maxSteps: number) {
  return PAD.top + INNER_H - (steps / maxSteps) * INNER_H;
}

function buildPolyline(points: { x: number; y: number }[]) {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
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

  useEffect(() => { load(); }, [load]);

  if (!profile?.teamId) return <AuthGuard><div /></AuthGuard>;

  const days = buildDayPoints();
  const todayIdx = days.findIndex((d) => !d.isPast);
  const lastPastIdx = todayIdx === -1 ? days.length - 1 : todayIdx - 1;

  // ── Individual data ──────────────────────────────────────────────────────
  const myEntries = allSteps[profile.uid] ?? [];
  const myStepMap: Record<string, number> = {};
  myEntries.forEach((e) => (myStepMap[e.date] = e.steps));

  const teamMembers = allUsers.filter((u) => u.teamId === profile.teamId);
  const myGoal = Math.round(TEAM_GOAL / Math.max(teamMembers.length, 1));
  const myPacePerDay = myGoal / DAYS_IN_MONTH;

  // Cumulative actual steps per day for me
  let myCumulative = 0;
  const myActualPoints: { x: number; y: number }[] = [];
  days.forEach((d) => {
    if (!d.isPast) return;
    myCumulative += myStepMap[d.date] ?? 0;
    myActualPoints.push({ x: toX(d.dayNum), y: 0 }); // filled below
  });

  // rebuild with correct Y after we know max
  const myMax = Math.max(myGoal * 1.1, myCumulative * 1.1, 1);
  myCumulative = 0;
  const myActual: { x: number; y: number }[] = [];
  days.forEach((d) => {
    if (!d.isPast) return;
    myCumulative += myStepMap[d.date] ?? 0;
    myActual.push({ x: toX(d.dayNum), y: toY(myCumulative, myMax) });
  });

  const myPaceLine = [
    { x: toX(1), y: toY(0, myMax) },
    { x: toX(DAYS_IN_MONTH), y: toY(myGoal, myMax) },
  ];

  const myDelta = myCumulative - myPacePerDay * (lastPastIdx + 1);

  // ── Team data ────────────────────────────────────────────────────────────
  const allTeamIds = Object.keys(TEAMS) as TeamId[];

  function getTeamCumulativeByDay(teamId: TeamId): { x: number; y: number }[] {
    const members = allUsers.filter((u) => u.teamId === teamId);
    const memberGoal = TEAM_GOAL;
    const teamMax = Math.max(memberGoal * 1.1, 1);

    let cum = 0;
    const pts: { x: number; y: number }[] = [];
    days.forEach((d) => {
      if (!d.isPast) return;
      members.forEach((m) => {
        const entries = allSteps[m.uid] ?? [];
        const entry = entries.find((e) => e.date === d.date);
        cum += entry?.steps ?? 0;
      });
      pts.push({ x: toX(d.dayNum), y: toY(cum, teamMax) });
    });
    return pts;
  }

  const myTeamActual = getTeamCumulativeByDay(profile.teamId);
  const teamMax = Math.max(TEAM_GOAL * 1.1, 1);
  const teamPaceLine = [
    { x: toX(1), y: toY(0, teamMax) },
    { x: toX(DAYS_IN_MONTH), y: toY(TEAM_GOAL, teamMax) },
  ];

  // Team delta
  const myTeamMembers = allUsers.filter((u) => u.teamId === profile.teamId);
  let myTeamTotal = 0;
  myTeamMembers.forEach((m) => {
    const entries = allSteps[m.uid] ?? [];
    entries.forEach((e) => (myTeamTotal += e.steps));
  });
  const teamPaceNow = (TEAM_GOAL / DAYS_IN_MONTH) * (lastPastIdx + 1);
  const teamDelta = myTeamTotal - teamPaceNow;

  // ── Other individuals (for overlay) ─────────────────────────────────────
  function getUserActual(uid: string): { x: number; y: number }[] {
    const entries = allSteps[uid] ?? [];
    const stepMap: Record<string, number> = {};
    entries.forEach((e) => (stepMap[e.date] = e.steps));
    let cum = 0;
    return days
      .filter((d) => d.isPast)
      .map((d) => {
        cum += stepMap[d.date] ?? 0;
        return { x: toX(d.dayNum), y: toY(cum, myMax) };
      });
  }

  const otherUsers = allUsers.filter((u) => u.uid !== profile.uid);
  const otherTeams = allTeamIds.filter((t) => t !== profile.teamId);

  // ── Y-axis ticks ─────────────────────────────────────────────────────────
  function yTicks(maxVal: number) {
    const step = maxVal / 4;
    return [0, 1, 2, 3, 4].map((i) => ({
      val: Math.round(step * i),
      y: toY(step * i, maxVal),
    }));
  }

  const indivTicks = yTicks(myMax);
  const teamTicks = yTicks(teamMax);

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <div className="text-white/30 text-xs font-mono tracking-widest uppercase mb-1">April 2025</div>
          <h1 className="font-display text-4xl text-white">
            Pace <span className="italic text-[var(--gold)]">Tracker</span>
          </h1>
          <p className="text-white/30 text-sm font-mono mt-1">
            Team goal: 1,000,000 steps · Your goal:{" "}
            <span className="text-[var(--gold)]">{formatSteps(myGoal)}</span> steps
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6 animate-fade-up" style={{ animationDelay: "0.05s", opacity: 0 }}>
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

        {/* Chart */}
        <div className="glass rounded-3xl p-6 mb-4 animate-fade-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
          {loading ? (
            <div className="flex items-center justify-center h-64 text-white/20 font-mono text-sm">
              Loading data...
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              className="w-full"
              style={{ fontFamily: "DM Mono, monospace" }}
            >
              {/* Grid lines */}
              {(mode === "individual" ? indivTicks : teamTicks).map((tick) => (
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

              {/* X-axis labels — every 5 days */}
              {days.filter((d) => d.dayNum % 5 === 1 || d.dayNum === DAYS_IN_MONTH).map((d) => (
                <text
                  key={d.date}
                  x={toX(d.dayNum)} y={CHART_H - PAD.bottom + 16}
                  textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.25)"
                >
                  {d.label}
                </text>
              ))}

              {/* Today vertical line */}
              {lastPastIdx >= 0 && (
                <line
                  x1={toX(lastPastIdx + 1)} y1={PAD.top}
                  x2={toX(lastPastIdx + 1)} y2={CHART_H - PAD.bottom}
                  stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4,4"
                />
              )}

              {/* ── INDIVIDUAL MODE ── */}
              {mode === "individual" && (
                <>
                  {/* Other users overlay */}
                  {showOthers && otherUsers.map((u) => {
                    const pts = getUserActual(u.uid);
                    if (pts.length === 0) return null;
                    const teamColor = u.teamId ? TEAMS[u.teamId as TeamId].color : "#666";
                    return (
                      <polyline
                        key={u.uid}
                        points={buildPolyline(pts)}
                        fill="none"
                        stroke={teamColor}
                        strokeWidth="1.5"
                        strokeOpacity="0.35"
                      />
                    );
                  })}

                  {/* Pace line */}
                  <polyline
                    points={buildPolyline(myPaceLine)}
                    fill="none"
                    stroke="rgba(201,168,76,0.35)"
                    strokeWidth="2"
                    strokeDasharray="6,4"
                  />

                  {/* My actual line */}
                  {myActual.length > 0 && (
                    <>
                      <polyline
                        points={buildPolyline(myActual)}
                        fill="none"
                        stroke="var(--gold)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* End dot */}
                      <circle
                        cx={myActual[myActual.length - 1].x}
                        cy={myActual[myActual.length - 1].y}
                        r="4" fill="var(--gold)"
                      />
                    </>
                  )}

                  {/* Legend */}
                  <g transform={`translate(${PAD.left + 8}, ${PAD.top + 8})`}>
                    <line x1="0" y1="6" x2="20" y2="6" stroke="rgba(201,168,76,0.5)" strokeWidth="2" strokeDasharray="5,3" />
                    <text x="26" y="10" fontSize="10" fill="rgba(255,255,255,0.4)">Your pace target</text>
                    <line x1="0" y1="22" x2="20" y2="22" stroke="var(--gold)" strokeWidth="2.5" />
                    <text x="26" y="26" fontSize="10" fill="rgba(255,255,255,0.4)">Your actual steps</text>
                  </g>
                </>
              )}

              {/* ── TEAM MODE ── */}
              {mode === "team" && (
                <>
                  {/* Other teams overlay */}
                  {showOthers && otherTeams.map((teamId) => {
                    const pts = getTeamCumulativeByDay(teamId);
                    if (pts.length === 0) return null;
                    const color = TEAMS[teamId].color;
                    return (
                      <polyline
                        key={teamId}
                        points={buildPolyline(pts)}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeOpacity="0.45"
                      />
                    );
                  })}

                  {/* Team pace line */}
                  <polyline
                    points={buildPolyline(teamPaceLine)}
                    fill="none"
                    stroke="rgba(201,168,76,0.35)"
                    strokeWidth="2"
                    strokeDasharray="6,4"
                  />

                  {/* My team actual */}
                  {myTeamActual.length > 0 && (
                    <>
                      <polyline
                        points={buildPolyline(myTeamActual)}
                        fill="none"
                        stroke={TEAMS[profile.teamId].color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx={myTeamActual[myTeamActual.length - 1].x}
                        cy={myTeamActual[myTeamActual.length - 1].y}
                        r="4" fill={TEAMS[profile.teamId].color}
                      />
                    </>
                  )}

                  {/* Other teams labels */}
                  {showOthers && otherTeams.map((teamId) => {
                    const pts = getTeamCumulativeByDay(teamId);
                    if (pts.length === 0) return null;
                    const last = pts[pts.length - 1];
                    return (
                      <text key={teamId} x={last.x + 4} y={last.y + 4} fontSize="9" fill={TEAMS[teamId].color} opacity="0.7">
                        {TEAMS[teamId].name}
                      </text>
                    );
                  })}

                  {/* Legend */}
                  <g transform={`translate(${PAD.left + 8}, ${PAD.top + 8})`}>
                    <line x1="0" y1="6" x2="20" y2="6" stroke="rgba(201,168,76,0.5)" strokeWidth="2" strokeDasharray="5,3" />
                    <text x="26" y="10" fontSize="10" fill="rgba(255,255,255,0.4)">Team pace target</text>
                    <line x1="0" y1="22" x2="20" y2="22" stroke={TEAMS[profile.teamId].color} strokeWidth="2.5" />
                    <text x="26" y="26" fontSize="10" fill="rgba(255,255,255,0.4)">{TEAMS[profile.teamId].name} actual</text>
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
                "w-5 h-5 rounded flex items-center justify-center transition-all border",
                showOthers
                  ? "bg-[var(--gold)] border-[var(--gold)]"
                  : "border-white/20 bg-transparent"
              )}
            >
              {showOthers && <span className="text-black text-xs font-bold">✓</span>}
            </button>
            <span className="text-white/40 text-sm font-mono">
              {mode === "individual"
                ? "Show other participants"
                : "Show other teams"}
            </span>
            {showOthers && mode === "team" && (
              <div className="flex gap-3 ml-4">
                {otherTeams.map((t) => (
                  <div key={t} className="flex items-center gap-1">
                    <div className="w-3 h-0.5 rounded" style={{ backgroundColor: TEAMS[t].color }} />
                    <span className="text-xs font-mono text-white/30">{TEAMS[t].name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delta cards — always show both */}
        <div className="grid grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: "0.15s", opacity: 0 }}>
          {/* Individual delta */}
          <div className={cn(
            "glass rounded-2xl p-6 text-center border",
            mode === "individual" ? "border-white/10" : "border-white/[0.04] opacity-60"
          )}>
            <div className="text-white/30 text-xs font-mono uppercase tracking-widest mb-3">
              You vs. your pace
            </div>
            <div className={cn(
              "font-display text-4xl font-bold",
              myDelta >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {myDelta >= 0 ? "+" : ""}{myDelta.toLocaleString()}
            </div>
            <div className="text-white/20 text-xs font-mono mt-2">
              steps {myDelta >= 0 ? "ahead" : "behind"} of pace
            </div>
          </div>

          {/* Team delta */}
          <div className={cn(
            "glass rounded-2xl p-6 text-center border",
            mode === "team" ? "border-white/10" : "border-white/[0.04] opacity-60"
          )}>
            <div className="text-white/30 text-xs font-mono uppercase tracking-widest mb-3">
              {TEAMS[profile.teamId].emoji} Team vs. pace
            </div>
            <div className={cn(
              "font-display text-4xl font-bold",
              teamDelta >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {teamDelta >= 0 ? "+" : ""}{Math.round(teamDelta).toLocaleString()}
            </div>
            <div className="text-white/20 text-xs font-mono mt-2">
              steps {teamDelta >= 0 ? "ahead" : "behind"} of pace
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}