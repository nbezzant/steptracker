"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { upsertStepEntry, getStepEntry, dateKey } from "@/lib/firestore";
import { cn, formatDate } from "@/lib/utils";

interface StepModalProps {
  date: Date;
  onClose: () => void;
  onSaved?: () => void;
}

export default function StepModal({ date, onClose, onSaved }: StepModalProps) {
  const { user } = useAuth();
  const [steps, setSteps] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const dk = dateKey(date);
  const today = dateKey(new Date());
  const isFuture = dk > today;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const entry = await getStepEntry(user.uid, dk);
      if (entry) setSteps(entry.steps.toString());
      setFetching(false);
    })();
  }, [user, dk]);

  const handleSave = async () => {
    if (!user || isFuture) return;
    const num = parseInt(steps, 10);
    if (isNaN(num) || num < 0) return;
    setLoading(true);
    try {
      await upsertStepEntry(user.uid, dk, num);
      onSaved?.();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const presets = [2000, 5000, 8000, 10000, 15000];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass rounded-t-3xl md:rounded-3xl p-8 w-full max-w-md border border-white/10 animate-fade-up">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-[var(--gold)] font-mono text-xs tracking-widest uppercase mb-1">
              {isFuture ? "Locked" : "Log Steps"}
            </div>
            <h3 className="font-display text-3xl text-white">{formatDate(dk)}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors text-xl leading-none mt-1"
          >
            ×
          </button>
        </div>

        {isFuture ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-white/40 text-sm">
              Future dates are locked. Come back on {formatDate(dk)} to log your steps.
            </p>
          </div>
        ) : fetching ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Big number input */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="number"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-5 text-4xl font-display text-white placeholder-white/20 focus:outline-none focus:border-[var(--gold)]/50 transition-colors text-center"
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  autoFocus
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-mono">
                  steps
                </div>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 mb-8">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setSteps(p.toString())}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-150",
                    steps === p.toString()
                      ? "bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/40"
                      : "bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/70"
                  )}
                >
                  {p.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 rounded-2xl border border-white/10 text-white/40 hover:text-white/70 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || steps === ""}
                className={cn(
                  "flex-1 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200",
                  steps !== "" && !loading
                    ? "bg-[var(--gold)] text-black hover:bg-[var(--gold-light)] hover:scale-[1.01] active:scale-[0.99]"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                )}
              >
                {loading ? "Saving…" : "Save Steps"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
