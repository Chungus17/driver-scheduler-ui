import { useState } from "react";

import {
  CalendarDays,
  LockKeyhole,
  ArrowRight,
  Loader2,
  UserRound,
  ShieldCheck,
  Check,
} from "lucide-react";

// ============================================================
// API CONFIGURATION
// ============================================================

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
          password,
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
    <main className="flex min-h-screen bg-[#f3eee4] text-[#2f342b]">
      {/* ====================================================
          LEFT PANEL - BRANDING
      ==================================================== */}

      <section
        className="
          relative hidden
          min-h-screen
          w-[46%]
          flex-col
          justify-between
          overflow-hidden
          border-r border-[#c9c6b1]
          bg-[#e8e8d8]
          px-10 py-10
          lg:flex
          xl:px-16
          xl:py-12
        "
      >
        {/* BRAND */}

        <div className="relative z-10 flex items-center gap-3">
          <div
            className="
              flex h-12 w-12
              shrink-0
              items-center justify-center
              rounded-xl
              border border-[#515e3c]
              bg-[#65724b]
              text-white
            "
          >
            <CalendarDays size={23} strokeWidth={1.8} />
          </div>

          <div className="flex flex-col">
            <h1 className="text-xl leading-tight font-bold tracking-tight text-[#2f342b]">
              VERDI
            </h1>

            <p className="mt-0.5 text-xs font-medium tracking-wide text-[#797b6f]">
              DRIVER SCHEDULER
            </p>
          </div>
        </div>

        {/* MAIN BRAND CONTENT */}

        <div className="relative z-10 max-w-xl">
          <h2
            className="
              text-4xl
              leading-[1.15]
              font-semibold
              tracking-tight
              text-[#2f342b]
              xl:text-5xl
              2xl:text-6xl
            "
          >
            Smarter schedules.
            <br />
            <span className="text-[#65724b]">Clearer operations.</span>
          </h2>

          <p
            className="
              mt-7 max-w-md
              text-base leading-8
              text-[#74776a]
              xl:text-lg
            "
          >
            A simpler way to manage your drivers, organize time off, and create
            monthly schedules with confidence.
          </p>

          {/* FEATURE HIGHLIGHTS */}

          <div className="mt-10 space-y-4">
            {[
              {
                icon: UserRound,
                text: "Centralized driver management",
              },
              {
                icon: CalendarDays,
                text: "Automated monthly scheduling",
              },
              {
                icon: ShieldCheck,
                text: "Consistent scheduling rules",
              },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="
                    flex h-9 w-9
                    shrink-0
                    items-center justify-center
                    rounded-lg
                    border border-[#d2d9bf]
                    bg-[#f5f5eb]
                    text-[#65724b]
                  "
                >
                  <Icon size={17} strokeWidth={1.8} />
                </div>

                <span className="text-sm font-medium text-[#626a56]">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}

        <div
          className="
            relative z-10
            flex items-center gap-2
            border-t border-[#cdd2bf]
            pt-6
            text-xs
            text-[#797b6f]
          "
        >
          <ShieldCheck size={16} />
          Internal scheduling workspace
        </div>
      </section>

      {/* ====================================================
          RIGHT PANEL - LOGIN
      ==================================================== */}

      <section
        className="
          flex min-h-screen
          w-full
          items-center justify-center
          px-5 py-10
          sm:px-8
          lg:w-[54%]
          lg:px-12
        "
      >
        <div className="w-full max-w-125">
          {/* MOBILE BRAND */}

          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div
              className="
                flex h-11 w-11
                items-center justify-center
                rounded-xl
                border border-[#515e3c]
                bg-[#65724b]
                text-white
              "
            >
              <CalendarDays size={22} />
            </div>

            <div>
              <h1 className="text-lg leading-tight font-bold tracking-tight text-[#2f342b]">
                VERDI
              </h1>

              <p className="mt-0.5 text-xs font-medium tracking-wide text-[#797b6f]">
                DRIVER SCHEDULER
              </p>
            </div>
          </div>

          {/* LOGIN CARD */}

          <form
            onSubmit={submit}
            className="
              rounded-2xl
              border border-[#d8cfbf]
              bg-[#fffdf8]
              p-6
              shadow-[0_4px_20px_rgba(69,58,39,0.045)]
              sm:p-9
              lg:p-10
            "
          >
            {/* LOGIN ICON */}

            <div
              className="
                mb-7
                flex h-13 w-13
                items-center justify-center
                rounded-xl
                border border-[#dce1ca]
                bg-[#f0f1e5]
                text-[#65724b]
              "
            >
              <LockKeyhole size={23} strokeWidth={1.8} />
            </div>

            {/* HEADING */}

            <div
              className="
                mb-2
                text-[11px]
                font-bold
                tracking-[0.15em]
                text-[#65724b]
              "
            >
              WELCOME BACK
            </div>

            <h2
              className="
                text-2xl
                font-semibold
                tracking-tight
                text-[#2f342b]
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
                text-[#797b6f]
              "
            >
              Enter your internal account credentials to continue.
            </p>

            {/* DIVIDER */}

            <div className="my-7 h-px bg-[#ece5d9]" />

            {/* USERNAME */}

            <div>
              <label
                htmlFor="username"
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-[#3f4638]
                "
              >
                Username
              </label>

              <div className="relative">
                <UserRound
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    left-4 top-1/2
                    -translate-y-1/2
                    text-[#989b8e]
                  "
                />

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
                    border border-[#d8cfbf]
                    bg-[#fffdf8]
                    py-3 pl-11 pr-4
                    text-sm
                    text-[#2f342b]
                    outline-none
                    transition
                    placeholder:text-[#a09e91]
                    hover:border-[#bdb29f]
                    focus:border-[#65724b]
                    focus:ring-4
                    focus:ring-[#e3e9d4]
                    disabled:cursor-not-allowed
                    disabled:bg-[#f3eee4]
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
                  text-[#3f4638]
                "
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    left-4 top-1/2
                    -translate-y-1/2
                    text-[#989b8e]
                  "
                />

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
                    border border-[#d8cfbf]
                    bg-[#fffdf8]
                    py-3 pl-11 pr-4
                    text-sm
                    text-[#2f342b]
                    outline-none
                    transition
                    placeholder:text-[#a09e91]
                    hover:border-[#bdb29f]
                    focus:border-[#65724b]
                    focus:ring-4
                    focus:ring-[#e3e9d4]
                    disabled:cursor-not-allowed
                    disabled:bg-[#f3eee4]
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
                  flex items-start gap-3
                  rounded-xl
                  border border-[#e9c6bd]
                  bg-[#fcf0ec]
                  px-4 py-3
                  text-sm
                  leading-6
                  text-[#a44535]
                "
              >
                <span className="mt-0.5 shrink-0">
                  <ShieldCheck size={17} />
                </span>

                <span>{error}</span>
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
                border border-[#596740]
                bg-[#65724b]
                px-5
                text-sm
                font-bold
                text-white
                shadow-[0_2px_8px_rgba(72,62,42,0.035)]
                transition
                hover:bg-[#53613e]
                focus:outline-none
                focus:ring-4
                focus:ring-[#e3e9d4]
                disabled:cursor-not-allowed
                disabled:border-[#d5cbb9]
                disabled:bg-[#d5cbb9]
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
                border-t border-[#ece5d9]
                pt-6
                text-center
                text-xs
                text-[#939486]
              "
            >
              <ShieldCheck size={15} />
              For authorized internal use only.
            </div>
          </form>

          {/* BOTTOM TEXT */}

          <p className="mt-6 text-center text-xs text-[#939486]">
            Verdi Driver Scheduler
          </p>
        </div>
      </section>
    </main>
  );
}
