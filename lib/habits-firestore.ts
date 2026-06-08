import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { getAllUserProfiles } from "./firestore";

export interface HabitEntry {
  uid: string;
  date: string; // "YYYY-MM-DD"
  slept: boolean;
  talked: boolean;
  updatedAt: Timestamp;
}

export async function getHabitEntry(
  uid: string,
  date: string
): Promise<HabitEntry | null> {
  const ref = doc(db, "habits", `${uid}_${date}`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as HabitEntry) : null;
}

export async function upsertHabitEntry(
  uid: string,
  date: string,
  slept: boolean,
  talked: boolean
): Promise<void> {
  const ref = doc(db, "habits", `${uid}_${date}`);
  await setDoc(ref, { uid, date, slept, talked, updatedAt: Timestamp.now() });
}

export async function getUserHabits(uid: string): Promise<HabitEntry[]> {
  const q = query(collection(db, "habits"), where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as HabitEntry);
}

export interface HabitsLeaderEntry {
  uid: string;
  displayName: string;
  photoURL: string;
  count: number;
}

export async function getHabitsLeaderboard(): Promise<HabitsLeaderEntry[]> {
  const snap = await getDocs(collection(db, "habits"));

  const counts: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const entry = d.data() as HabitEntry;
    if (entry.slept && entry.talked) {
      counts[entry.uid] = (counts[entry.uid] || 0) + 1;
    }
  });

  const profiles = await getAllUserProfiles();

  return profiles
    .map((p) => ({
      uid: p.uid,
      displayName: p.displayName,
      photoURL: p.photoURL,
      count: counts[p.uid] || 0,
    }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);
}
