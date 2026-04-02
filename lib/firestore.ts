import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TeamId = "utah" | "texas" | "virginia";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  teamId: TeamId | null;
  createdAt: Timestamp;
  totalSteps: number;
}

export interface StepEntry {
  uid: string;
  date: string; // "YYYY-MM-DD"
  steps: number;
  updatedAt: Timestamp;
}

export interface Team {
  id: TeamId;
  name: string;
  totalSteps: number;
  memberCount: number;
}

export const TEAMS: Record<TeamId, { name: string; color: string; emoji: string }> = {
  utah: { name: "Utah", color: "#cc0000", emoji: "🏔️" },
  texas: { name: "Texas", color: "#bf5700", emoji: "⭐" },
  virginia: { name: "Virginia", color: "#003087", emoji: "🌿" },
};

// ─── User ─────────────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function createOrUpdateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      teamId: null,
      totalSteps: 0,
      createdAt: Timestamp.now(),
      ...data,
    });
  } else {
    await updateDoc(ref, data);
  }
}

export async function joinTeam(uid: string, teamId: TeamId): Promise<void> {
  const batch = writeBatch(db);

  // Update user
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const user = userSnap.data() as UserProfile;

  // Remove from old team if exists
  if (user.teamId) {
    const oldTeamRef = doc(db, "teams", user.teamId);
    const oldTeamSnap = await getDoc(oldTeamRef);
    if (oldTeamSnap.exists()) {
      const oldTeam = oldTeamSnap.data() as Team;
      batch.update(oldTeamRef, {
        memberCount: Math.max(0, oldTeam.memberCount - 1),
        totalSteps: Math.max(0, oldTeam.totalSteps - (user.totalSteps || 0)),
      });
    }
  }

  batch.update(userRef, { teamId });

  // Add to new team
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);
  if (teamSnap.exists()) {
    const team = teamSnap.data() as Team;
    batch.update(teamRef, {
      memberCount: team.memberCount + 1,
      totalSteps: team.totalSteps + (user.totalSteps || 0),
    });
  } else {
    batch.set(teamRef, {
      id: teamId,
      name: TEAMS[teamId].name,
      totalSteps: user.totalSteps || 0,
      memberCount: 1,
    });
  }

  await batch.commit();
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export async function getStepEntry(
  uid: string,
  date: string
): Promise<StepEntry | null> {
  const ref = doc(db, "steps", `${uid}_${date}`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as StepEntry) : null;
}

export async function upsertStepEntry(
  uid: string,
  date: string,
  steps: number
): Promise<void> {
  const batch = writeBatch(db);

  const stepRef = doc(db, "steps", `${uid}_${date}`);
  const prevSnap = await getDoc(stepRef);
  const prevSteps = prevSnap.exists() ? (prevSnap.data() as StepEntry).steps : 0;
  const delta = steps - prevSteps;

  batch.set(stepRef, {
    uid,
    date,
    steps,
    updatedAt: Timestamp.now(),
  });

  // Update user totalSteps
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const user = userSnap.data() as UserProfile;
    const newTotal = Math.max(0, (user.totalSteps || 0) + delta);
    batch.update(userRef, { totalSteps: newTotal });

    // Update team totalSteps
    if (user.teamId) {
      const teamRef = doc(db, "teams", user.teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        const team = teamSnap.data() as Team;
        batch.update(teamRef, {
          totalSteps: Math.max(0, team.totalSteps + delta),
        });
      }
    }
  }

  await batch.commit();
}

export async function getUserStepsForMonth(
  uid: string,
  year: number,
  month: number // 0-indexed
): Promise<StepEntry[]> {
  const startDate = format(new Date(year, month, 1), "yyyy-MM-dd");
  const endDate = format(new Date(year, month + 1, 0), "yyyy-MM-dd");

  const q = query(
    collection(db, "steps"),
    where("uid", "==", uid),
    where("date", ">=", startDate),
    where("date", "<=", endDate)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as StepEntry);
}

export async function getUserStepsForDate(
  uid: string,
  date: string
): Promise<number> {
  const entry = await getStepEntry(uid, date);
  return entry?.steps ?? 0;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getPersonalLeaderboard(): Promise<UserProfile[]> {
  const q = query(
    collection(db, "users"),
    where("teamId", "!=", null),
    orderBy("teamId"),
    orderBy("totalSteps", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserProfile);
}

export async function getDailyLeaderboard(date: string): Promise<
  { user: UserProfile; steps: number }[]
> {
  const stepsQ = query(
    collection(db, "steps"),
    where("date", "==", date),
    orderBy("steps", "desc")
  );
  const stepsSnap = await getDocs(stepsQ);
  const stepDocs = stepsSnap.docs.map((d) => d.data() as StepEntry);

  const results = await Promise.all(
    stepDocs.map(async (s) => {
      const user = await getUserProfile(s.uid);
      return user ? { user, steps: s.steps } : null;
    })
  );

  return results.filter(Boolean) as { user: UserProfile; steps: number }[];
}

export async function getTeamLeaderboard(): Promise<Team[]> {
  const snap = await getDocs(collection(db, "teams"));
  const teams = snap.docs.map((d) => d.data() as Team);
  return teams.sort((a, b) => b.totalSteps - a.totalSteps);
}

export async function getTeamDailySteps(
  date: string
): Promise<Record<TeamId, number>> {
  const stepsQ = query(
    collection(db, "steps"),
    where("date", "==", date)
  );
  const stepsSnap = await getDocs(stepsQ);
  const stepDocs = stepsSnap.docs.map((d) => d.data() as StepEntry);

  const totals: Record<string, number> = {};

  await Promise.all(
    stepDocs.map(async (s) => {
      const user = await getUserProfile(s.uid);
      if (user?.teamId) {
        totals[user.teamId] = (totals[user.teamId] || 0) + s.steps;
      }
    })
  );

  return totals as Record<TeamId, number>;
}
