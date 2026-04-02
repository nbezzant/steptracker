"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative z-10 px-4">
      {/* Logo / Hero */}
      <div className="text-center mb-12 animate-fade-up">
        <div className="text-[var(--gold)] text-sm font-mono tracking-[0.3em] uppercase mb-6 opacity-70">
          Team Step Challenge
        </div>
        <h1 className="font-display text-6xl md:text-8xl text-white mb-4 leading-none">
          Step<br />
          <span className="italic text-[var(--gold)]">Tracker</span>
        </h1>
        <p className="text-white/40 text-lg mt-6 max-w-sm mx-auto font-body font-light">
          Log your steps daily. Compete with teammates. Lead your state to victory.
        </p>
      </div>

      {/* Teams Preview */}
      <div
        className="flex gap-3 mb-12 animate-fade-up"
        style={{ animationDelay: "0.1s", opacity: 0 }}
      >
        {[
          { name: "Utah", emoji: "🏔️", color: "#cc0000" },
          { name: "Texas", emoji: "⭐", color: "#bf5700" },
          { name: "Virginia", emoji: "🌿", color: "#003087" },
        ].map((team) => (
          <div
            key={team.name}
            className="glass rounded-xl px-5 py-3 text-center"
            style={{ borderColor: `${team.color}40` }}
          >
            <div className="text-2xl mb-1">{team.emoji}</div>
            <div className="text-xs font-mono text-white/50">{team.name}</div>
          </div>
        ))}
      </div>

      {/* Sign In */}
      <div
        className="animate-fade-up"
        style={{ animationDelay: "0.2s", opacity: 0 }}
      >
        <button
          onClick={signInWithGoogle}
          className="group flex items-center gap-3 glass rounded-2xl px-8 py-4 hover:bg-white/[0.06] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-white/80 group-hover:text-white transition-colors font-medium">
            Continue with Google
          </span>
        </button>
      </div>

      <p className="mt-8 text-white/20 text-xs font-mono animate-fade-up" style={{ animationDelay: "0.3s", opacity: 0 }}>
        Your steps. Your team. Your legacy.
      </p>
    </div>
  );
}
