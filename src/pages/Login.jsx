import { useState } from "react";

import {
  CalendarDays,
  LockKeyhole,
  ArrowRight,
  Loader2,
  UserRound,
  ShieldCheck,
} from "lucide-react";

// ============================================================
// API CONFIGURATION
// ============================================================

// Uses the Vite /api proxy during development.
// Set VITE_API_BASE_URL if your backend is hosted separately.

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);

// ============================================================
// LOGIN COMPONENT
// ============================================================

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ----------------------------------------------------------
  // LOGIN API
  // ----------------------------------------------------------

  async function submit(event) {
    event.preventDefault();

    if (busy) return;

    setError("");
    setBusy(true);

    try {
      const response = await fetch(`${API_BASE_URL}/driver-scheduler/login`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to sign in. Please check your credentials.",
        );
      }

      if (data.success !== true) {
        throw new Error("Login was not accepted. Please try again.");
      }

      // Login successful.
      // App.jsx will handle switching to the Home page.
      onLogin();
    } catch (exception) {
      if (exception instanceof TypeError) {
        setError(
          "Unable to connect to the server. Please check that the backend is running.",
        );
      } else {
        setError(exception.message || "An unexpected error occurred.");
      }
    } finally {
      setBusy(false);
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="flex min-h-screen bg-slate-50">
      {/* ====================================================
          LEFT SIDE - BRANDING
      ==================================================== */}

      <section
        className="
          relative hidden
          min-h-screen
          w-[46%]
          flex-col
          justify-between
          overflow-hidden
          bg-slate-900
          px-10 py-10
          text-white
          lg:flex
          xl:px-16
          xl:py-12
        "
      >
        {/* Background decorative elements */}

        <div
          className="
            pointer-events-none
            absolute -right-40 -top-40
            h-125 w-125
            rounded-full
            bg-blue-600/20
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute -bottom-48 -left-48
            h-125 w-125
            rounded-full
            bg-indigo-500/15
            blur-3xl
          "
        />

        {/* Decorative grid */}

        <div
          className="
            pointer-events-none
            absolute inset-0
            opacity-[0.04]
          "
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",

            backgroundSize: "48px 48px",
          }}
        />

        {/* BRAND */}

        <div className="relative z-10 flex items-center gap-3">
          <div
            className="
              flex h-11 w-11
              items-center justify-center
              rounded-xl
              bg-blue-600
              shadow-lg shadow-blue-950/30
            "
          >
            <CalendarDays size={23} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">Verdi</span>

            <span className="text-lg font-light text-slate-400">
              / Driver Scheduler
            </span>
          </div>
        </div>

        {/* MAIN BRAND CONTENT */}

        <div className="relative z-10 max-w-xl">
          <div
            className="
              mb-7 inline-flex
              items-center gap-2
              rounded-full
              border border-blue-400/20
              bg-blue-500/10
              px-4 py-2
              text-xs font-semibold
              tracking-[0.18em]
              text-blue-300
            "
          >
            <span
              className="
                h-2 w-2
                rounded-full
                bg-blue-400
              "
            />
            DRIVER OPERATIONS
          </div>

          <h1
            className="
              text-4xl
              font-bold
              leading-[1.15]
              tracking-tight
              xl:text-5xl
              2xl:text-6xl
            "
          >
            Smarter schedules.
            <br />
            <span className="text-blue-400">Clearer operations.</span>
          </h1>

          <p
            className="
              mt-7
              max-w-lg
              text-base
              leading-8
              text-slate-400
              xl:text-lg
            "
          >
            Import your team, configure time-off rules, and produce a clear
            monthly roster in minutes.
          </p>

          {/* FEATURE HIGHLIGHTS */}

          <div className="mt-10 space-y-5">
            <div className="flex items-center gap-3">
              <div
                className="
                  flex h-9 w-9
                  shrink-0
                  items-center justify-center
                  rounded-lg
                  bg-white/10
                  text-blue-300
                "
              >
                <UserRound size={18} />
              </div>

              <span className="text-sm text-slate-300">
                Centralized driver management
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="
                  flex h-9 w-9
                  shrink-0
                  items-center justify-center
                  rounded-lg
                  bg-white/10
                  text-blue-300
                "
              >
                <CalendarDays size={18} />
              </div>

              <span className="text-sm text-slate-300">
                Automated monthly scheduling
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="
                  flex h-9 w-9
                  shrink-0
                  items-center justify-center
                  rounded-lg
                  bg-white/10
                  text-blue-300
                "
              >
                <ShieldCheck size={18} />
              </div>

              <span className="text-sm text-slate-300">
                Consistent scheduling rules
              </span>
            </div>
          </div>
        </div>

        {/* FOOTER */}

        <div
          className="
            relative z-10
            flex items-center gap-2
            border-t border-white/10
            pt-6
            text-xs
            text-slate-400
          "
        >
          <ShieldCheck size={16} />
          Internal scheduling workspace
        </div>
      </section>

      {/* ====================================================
          RIGHT SIDE - LOGIN FORM
      ==================================================== */}

      <section
        className="
          flex min-h-screen
          w-full
          items-center justify-center
          px-5 py-12
          sm:px-8
          lg:w-[54%]
          lg:px-12
        "
      >
        <div className="w-full max-w-md">
          {/* MOBILE BRAND */}

          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div
              className="
                flex h-11 w-11
                items-center justify-center
                rounded-xl
                bg-blue-600
                text-white
              "
            >
              <CalendarDays size={23} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900">FleetOps</h1>

              <p className="text-xs text-slate-500">Driver Scheduler</p>
            </div>
          </div>

          {/* LOGIN CARD */}

          <form
            onSubmit={submit}
            className="
              rounded-2xl
              border border-slate-200
              bg-white
              p-6
              shadow-xl shadow-slate-200/50
              sm:p-9
              lg:border-0
              lg:bg-transparent
              lg:p-0
              lg:shadow-none
            "
          >
            {/* LOGIN ICON */}

            <div
              className="
                mb-7
                flex h-14 w-14
                items-center justify-center
                rounded-2xl
                bg-blue-50
                text-blue-600
              "
            >
              <LockKeyhole size={26} />
            </div>

            {/* HEADING */}

            <div
              className="
                mb-3
                text-xs
                font-bold
                tracking-[0.18em]
                text-blue-600
              "
            >
              WELCOME BACK
            </div>

            <h2
              className="
                text-2xl
                font-bold
                tracking-tight
                text-slate-900
                sm:text-3xl
              "
            >
              Sign in to Scheduler
            </h2>

            <p
              className="
                mt-3
                text-sm
                leading-6
                text-slate-500
              "
            >
              Enter your internal account credentials to continue.
            </p>

            {/* USERNAME */}

            <div className="mt-9">
              <label
                htmlFor="username"
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                Username
              </label>

              <div className="relative">

                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);

                    if (error) setError("");
                  }}
                  placeholder="Your username"
                  required
                  disabled={busy}
                  className="
                    h-12 w-full
                    rounded-xl
                    border border-slate-200
                    bg-white
                    py-3 pl-11 pr-4
                    text-sm
                    text-slate-900
                    outline-none
                    transition
                    placeholder:text-slate-400
                    hover:border-slate-300
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                    disabled:cursor-not-allowed
                    disabled:bg-slate-50
                  "
                />
              </div>
            </div>

            {/* PASSWORD */}

            <div className="mt-5">
              <label
                htmlFor="password"
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                Password
              </label>

              <div className="relative">

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);

                    if (error) setError("");
                  }}
                  placeholder="Your password"
                  required
                  disabled={busy}
                  className="
                    h-12 w-full
                    rounded-xl
                    border border-slate-200
                    bg-white
                    py-3 pl-11 pr-4
                    text-sm
                    text-slate-900
                    outline-none
                    transition
                    placeholder:text-slate-400
                    hover:border-slate-300
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                    disabled:cursor-not-allowed
                    disabled:bg-slate-50
                  "
                />
              </div>
            </div>

            {/* ERROR MESSAGE */}

            {error && (
              <div
                role="alert"
                className="
                  mt-5
                  rounded-xl
                  border border-red-200
                  bg-red-50
                  px-4 py-3
                  text-sm
                  leading-6
                  text-red-700
                "
              >
                {error}
              </div>
            )}

            {/* SUBMIT BUTTON */}

            <button
              type="submit"
              disabled={busy}
              className="
                mt-7
                flex h-12 w-full
                items-center justify-center
                gap-2.5
                rounded-xl
                bg-blue-600
                px-5
                text-sm
                font-bold
                text-white
                shadow-lg shadow-blue-600/15
                transition
                hover:bg-blue-700
                hover:shadow-blue-600/25
                focus:outline-none
                focus:ring-4
                focus:ring-blue-100
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {busy ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* FOOTER */}

            <div
              className="
                mt-7
                flex items-center justify-center
                gap-2
                text-center
                text-xs
                text-slate-400
              "
            >
              <ShieldCheck size={14} />
              For authorized internal use only.
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
