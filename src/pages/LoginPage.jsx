import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/VerdiLogo.svg";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) throw new Error(body?.detail || body?.message || "Login failed");
  return body;
}

export default function LoginPage() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    // if already authed, skip login
    const token = localStorage.getItem("jwt");
    if (token) nav("/app", { replace: true });
  }, [nav]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem("jwt", data.access_token);
      nav("/app", { replace: true });
    } catch (e2) {
      setErr(e2.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-black via-slate-950 to-slate-900">
      <div className="min-h-screen px-4 flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6 md:p-8">
          <div className="flex flex-col items-center text-center">
            <img src={logo} alt="Verdi" className="h-10 md:h-12 mb-4" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              Driver Schedule Generator
            </h1>
            <p className="text-sm mt-2 text-white/60">
              Sign in to generate schedules and export Excel.
            </p>
          </div>

          {!API_BASE && (
            <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">
              Missing <span className="font-mono">VITE_API_BASE</span> in <span className="font-mono">.env</span>
            </div>
          )}

          {err && (
            <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <div>
              <label className="text-xs font-medium text-white/70">Username</label>
              <input
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-white/70">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              disabled={loading || !API_BASE}
              className="h-11 rounded-2xl font-semibold bg-[#d3fb00] text-black hover:brightness-95 transition disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
