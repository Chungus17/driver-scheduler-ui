import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import logo from "../assets/VerdiLogo.svg"; 
import { classNames, MONTHS, WEEKDAYS,  } from "../components/helpers.js";
import { Toast } from "../components/helpers.jsx";
import { CSVImportSection } from "../components/helpers.jsx";
import { PublicHolidaysPicker } from "../components/helpers.jsx";
import { EmployeesSection } from "../components/helpers.jsx";
import { ResultsView } from "../components/helpers.jsx";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

async function apiFetch(path, { token, ...opts } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const isJson = (res.headers.get("content-type") || "").includes(
    "application/json",
  );
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = body?.detail || body?.message || JSON.stringify(body);
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return body;
}

export default function SchedulerPage() {
  const nav = useNavigate();
  const [token] = useState(() => localStorage.getItem("jwt") || "");
  const [toast, setToast] = useState(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [startDay, setStartDay] = useState(1);

  const [localOffDays, setLocalOffDays] = useState(2);
  const [overseasOffDays, setOverseasOffDays] = useState(2);

  const [cap, setCap] = useState(0.5);
  const [excluded, setExcluded] = useState(["friday"]);
  const [publicHolidays, setPublicHolidays] = useState([]);

  const [employees, setEmployees] = useState([]); // [{name,civil_id}]
  const [types, setTypes] = useState({}); // { [name]: local|overseas }

  const [manualName, setManualName] = useState("");
  const [manualCivil, setManualCivil] = useState("");

  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    setTypes((prev) => {
      const next = { ...prev };
      employees.forEach((e) => {
        if (!next[e.name]) next[e.name] = "local";
      });
      Object.keys(next).forEach((k) => {
        if (!employees.some((e) => e.name === k)) delete next[k];
      });
      return next;
    });
  }, [employees]);

  useEffect(() => {
    document.documentElement.classList.add("overflow-x-hidden");
    document.body.classList.add("overflow-x-hidden");
    return () => {
      document.documentElement.classList.remove("overflow-x-hidden");
      document.body.classList.remove("overflow-x-hidden");
    };
  }, []);

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  function logout() {
    localStorage.removeItem("jwt");
    nav("/login", { replace: true });
  }

  function mergeImportedEmployees(imported) {
    setEmployees((prev) => {
      const map = new Map(prev.map((e) => [e.name, { ...e }]));
      for (const e of imported || []) {
        if (!e?.name) continue;
        const existing = map.get(e.name);
        map.set(e.name, {
          name: e.name,
          civil_id: existing?.civil_id || e.civil_id || "",
        });
      }
      return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    });
  }

  function applyImportedTypes(typesFromCsv) {
    if (!typesFromCsv) return;
    setTypes((prev) => {
      const next = { ...prev };
      for (const [name, t] of Object.entries(typesFromCsv)) {
        if (!next[name]) next[name] = t;
      }
      return next;
    });
  }

  function addManualEmployee() {
    const name = manualName.trim();
    const civil_id = manualCivil.trim();

    if (!name || !civil_id) {
      return showToast(
        "error",
        "Please enter Name and Civil ID before adding.",
      );
    }

    setEmployees((prev) => {
      const exists = prev.find((e) => e.name === name);
      if (exists) {
        return prev.map((e) => (e.name === name ? { ...e, civil_id } : e));
      }
      return [...prev, { name, civil_id }];
    });

    setTypes((prev) => ({ ...prev, [name]: prev[name] || "local" }));

    setManualName("");
    setManualCivil("");
  }

  async function generate() {
    if (!token) return showToast("error", "You must login again.");
    if (!API_BASE) return showToast("error", "Missing VITE_API_BASE in .env");
    if (!employees.length)
      return showToast(
        "error",
        "No employees found. Upload a CSV or add employees manually.",
      );

    const missing = employees.filter((e) => !String(e.civil_id || "").trim());
    if (missing.length) {
      return showToast(
        "error",
        `Missing Civil ID for ${missing.length} employee(s). Please fill them in Employees table.`,
      );
    }

    const payload = {
      year: Number(year),
      month,
      start_day: Number(startDay),
      employees: employees.map((e) => ({
        name: String(e.name || "").trim(),
        type: types[e.name] || "local",
        civil_id: String(e.civil_id || "").trim(),
      })),
      public_holidays: publicHolidays,
      excluded_weekdays: excluded,
      local_off_days: Number(localOffDays),
      overseas_off_days: Number(overseasOffDays),
      driver_percentage_cap: Number(cap),
    };

    setLoading(true);
    setSchedule(null);

    try {
      const data = await apiFetch("/schedule/generate", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });
      setSchedule(data);
      console.log("Generated schedule:", data);
      showToast("success", "Schedule generated");
    } catch (e) {
      showToast("error", e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  const showEmployeesSection = !schedule;

  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-[#150327] via-[#1c0533] to-[#22093b] overflow-x-hidden">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logo} alt="Verdi" className="h-8 shrink-0" />
            <div className="leading-tight min-w-0">
              <div className="font-bold truncate">Driver Schedule</div>
              <div className="text-xs text-white/50 truncate">
                Import → rules → generate → export
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 shrink-0"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Page */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 min-w-0">
        <div className="grid gap-4 min-w-0">
          {showEmployeesSection && (
            <CSVImportSection
              employeesCount={employees.length}
              onImportedEmployees={mergeImportedEmployees}
              onImportedTypes={applyImportedTypes}
            />
          )}

          {/* Rules */}
          <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Rules</h2>
                <p className="text-sm text-white/60 mt-1">
                  Set rules then generate.
                </p>
              </div>

              <button
                onClick={generate}
                disabled={loading || !token}
                className="shrink-0 rounded-2xl px-5 py-2 font-semibold bg-[#d3fb00] text-black hover:brightness-95 transition disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate Schedule"}
              </button>
            </div>

            {/* Rule inputs */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
              <div className="min-w-0">
                <label className="text-xs font-medium text-white/70">
                  Year
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="mt-1 w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                />
              </div>

              <div className="min-w-0">
                <label className="text-xs font-medium text-white/70">
                  Month
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="mt-1 w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m[0].toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="text-xs font-medium text-white/70">
                  Start day
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={startDay}
                  onChange={(e) => setStartDay(e.target.value)}
                  className="mt-1 w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                />
              </div>

              <div className="min-w-0">
                <label className="text-xs font-medium text-white/70">
                  Local off days
                </label>
                <input
                  type="number"
                  min={0}
                  max={31}
                  value={localOffDays}
                  onChange={(e) => setLocalOffDays(e.target.value)}
                  className="mt-1 w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                />
              </div>

              <div className="min-w-0">
                <label className="text-xs font-medium text-white/70">
                  Overseas off days
                </label>
                <input
                  type="number"
                  min={0}
                  max={31}
                  value={overseasOffDays}
                  onChange={(e) => setOverseasOffDays(e.target.value)}
                  className="mt-1 w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                />
              </div>

              <div className="min-w-0">
                <label className="text-xs font-medium text-white/70">
                  Driver percentage cap{" "}
                  <span className="text-white/40">(0..1)</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={cap}
                  onChange={(e) => setCap(e.target.value)}
                  className="mt-1 w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                />
              </div>
            </div>

            {/* Excluded + Holidays */}
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
              <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-semibold">Excluded weekdays</div>
                <div className="mt-3 grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {WEEKDAYS.map((d) => {
                    const checked = excluded.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() =>
                          setExcluded((prev) => {
                            if (checked)
                              return prev.filter((x) => x !== d.value);
                            return Array.from(new Set([...prev, d.value]));
                          })
                        }
                        className={classNames(
                          "rounded-xl border px-3 py-2 text-sm transition",
                          checked
                            ? "border-[#d3fb00]/30 bg-[#d3fb00] text-black"
                            : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
                        )}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-white/50">
                  These weekdays cannot be OFF days.
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
                <PublicHolidaysPicker
                  value={publicHolidays}
                  onChange={setPublicHolidays}
                />
              </div>
            </div>
          </div>

          {showEmployeesSection && (
            <EmployeesSection
              employees={employees}
              setEmployees={setEmployees}
              types={types}
              setTypes={setTypes}
              manualName={manualName}
              setManualName={setManualName}
              manualCivil={manualCivil}
              setManualCivil={setManualCivil}
              onAddManual={addManualEmployee}
            />
          )}

          {schedule && <ResultsView schedule={schedule} />}
        </div>
      </div>
    </div>
  );
}
