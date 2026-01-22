import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../assets/VerdiLogo.svg";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const WEEKDAYS = [
  { label: "Mon", value: "monday" },
  { label: "Tue", value: "tuesday" },
  { label: "Wed", value: "wednesday" },
  { label: "Thu", value: "thursday" },
  { label: "Fri", value: "friday" },
  { label: "Sat", value: "saturday" },
  { label: "Sun", value: "sunday" },
];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

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

function guessNameColumn(headers) {
  const lower = headers.map((h) =>
    String(h || "")
      .trim()
      .toLowerCase(),
  );
  const idx1 = lower.findIndex(
    (h) => h.includes("driver") && h.includes("name"),
  );
  if (idx1 !== -1) return headers[idx1];
  const idx2 = lower.findIndex(
    (h) => h === "driver" || h === "drivers" || h === "name" || h === "names",
  );
  return idx2 >= 0 ? headers[idx2] : headers[0];
}

function parseHolidayLines(text) {
  return text
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isErr = toast.type === "error";
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[92vw] max-w-md">
      <div
        className={classNames(
          "rounded-2xl border backdrop-blur-xl shadow-2xl px-4 py-3",
          isErr
            ? "border-red-500/25 bg-red-500/10"
            : "border-emerald-500/25 bg-emerald-500/10",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className={classNames(
                "font-semibold",
                isErr ? "text-red-200" : "text-emerald-200",
              )}
            >
              {isErr ? "Error" : "Success"}
            </div>
            <div className="text-sm text-white/70 break-words">
              {toast.message}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function CSVUpload({ onDrivers, embedded = false }) {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [nameCol, setNameCol] = useState("");

  function handleFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const data = result.data || [];
        const cols = result.meta?.fields || [];
        setHeaders(cols);
        setRows(data);
        setNameCol(cols.length ? guessNameColumn(cols) : "");
      },
      error: () => {
        setHeaders([]);
        setRows([]);
        setNameCol("");
      },
    });
  }

  useEffect(() => {
    if (!rows.length || !nameCol) return;
    const names = rows
      .map((r) => (r?.[nameCol] ?? "").toString().trim())
      .filter(Boolean);
    onDrivers(Array.from(new Set(names)));
  }, [rows, nameCol, onDrivers]);

  return (
    <div
      className={
        embedded
          ? "min-w-0"
          : "min-w-0 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-5 md:p-6"
      }
    >
      {!embedded && (
        <>
          <h3 className="text-base font-semibold">Upload CSV</h3>
          <p className="text-sm text-white/60 mt-1">
            Only required from the CSV: the <b>driver names</b> column.
          </p>
        </>
      )}

      <div
        className={classNames(
          embedded ? "grid gap-3" : "mt-4 grid gap-3",
          "min-w-0",
        )}
      >
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className={classNames(
            "block w-full text-sm text-white/70",
            "file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white hover:file:bg-white/15",
          )}
        />

        {headers.length > 0 && (
          <div className="grid gap-2 min-w-0">
            <label className="text-xs font-medium text-white/70">
              Driver name column
            </label>
            <select
              value={nameCol}
              onChange={(e) => setNameCol(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
            >
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            <div className="text-xs text-white/50">
              Parsed rows: <b className="text-white/80">{rows.length}</b>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DriverTypeEditor({
  drivers,
  types,
  setTypes,
  manualName,
  setManualName,
  onAddManual,
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return drivers;
    return drivers.filter((d) => d.toLowerCase().includes(s));
  }, [drivers, q]);

  function setAll(t) {
    const next = { ...types };
    drivers.forEach((d) => (next[d] = t));
    setTypes(next);
  }

  return (
    <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-5 md:p-6">
      {/* Title */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Employees</h3>
            <span className="text-xs text-white/50">({drivers.length})</span>
          </div>
          <p className="text-sm text-white/60 mt-1">
            Add drivers, search, then set type.
          </p>
        </div>
        {/* Right: bulk buttons */}
        <div className="flex flex-wrap gap-2 lg:justify-end lg:w-auto shrink-0">
          <button
            onClick={() => setAll("local")}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            All Local
          </button>
          <button
            onClick={() => setAll("overseas")}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            All Overseas
          </button>
        </div>
      </div>

      {/* Controls row */}
      <div className="mt-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 min-w-0 w-full">
        {/* Left: Add + Search (same row on lg, stacked on mobile) */}
        <div className="flex flex-col sm:flex-row gap-3 min-w-0 w-full">
          {/* Add driver (input + button always together) */}
          <div className="flex gap-2 min-w-0 w-full sm:w-1/2">
            <input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Add driver..."
              className="w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
            />
            <button
              onClick={onAddManual}
              className="shrink-0 rounded-2xl px-4 py-2 font-semibold bg-[#d3fb00] text-black hover:brightness-95 transition"
            >
              Add
            </button>
          </div>

          {/* Search (input + counter always together) */}
          <div className="flex gap-2 min-w-0 w-full sm:w-1/2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
            />
            <div className="shrink-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/60 whitespace-nowrap flex items-center">
              <b className="text-white/80">{filtered.length}</b>/
              {drivers.length}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 max-h-[420px] overflow-auto rounded-2xl border border-white/10 min-w-0">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-black/40 backdrop-blur border-b border-white/10">
            <tr>
              <th className="text-left p-3 font-semibold">Name</th>
              <th className="text-left p-3 font-semibold w-44">Type</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((name) => (
              <tr
                key={name}
                className="border-b border-white/10 last:border-b-0"
              >
                <td className="p-3 font-medium text-white/90 break-words">
                  {name}
                </td>
                <td className="p-3">
                  <select
                    value={types[name] || "local"}
                    onChange={(e) =>
                      setTypes((prev) => ({ ...prev, [name]: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                  >
                    <option value="local">local</option>
                    <option value="overseas">overseas</option>
                  </select>
                </td>
              </tr>
            ))}

            {!drivers.length && (
              <tr>
                <td className="p-3 text-white/50" colSpan={2}>
                  Upload a CSV first (from Rules) or add drivers above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function downloadExcelFromSchedule(
  schedule,
  filename = "driver_schedule.xlsx",
) {
  const wb = new ExcelJS.Workbook();

  const headerFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "111827" },
  };
  const greenFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "0B3B2E" },
  };
  const redFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "3B0B14" },
  };
  const center = { vertical: "middle", horizontal: "center", wrapText: true };

  const S = schedule?.sheets ?? {};
  const Matrix = S.Matrix;
  const ByDay = S.ByDay;
  const Summary = S.Summary;
  const Issues = S.Issues;

  if (Matrix?.columns && Matrix?.rows) {
    const ws = wb.addWorksheet("Matrix");
    ws.addRow(Matrix.columns);
    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = center;
    });
    for (const row of Matrix.rows) ws.addRow(row);

    for (let r = 2; r <= ws.rowCount; r++) {
      for (let c = 4; c <= ws.columnCount; c++) {
        const cell = ws.getRow(r).getCell(c);
        cell.alignment = center;
        cell.fill = cell.value === "OFF" ? redFill : greenFill;
        cell.font = { color: { argb: "FFFFFF" } };
      }
      ws.getRow(r).getCell(1).font = { bold: true, color: { argb: "FFFFFF" } };
    }

    ws.views = [{ state: "frozen", xSplit: 3, ySplit: 1 }];
    ws.getColumn(1).width = 22;
    ws.getColumn(2).width = 12;
    ws.getColumn(3).width = 8;
    for (let c = 4; c <= ws.columnCount; c++) ws.getColumn(c).width = 12;
  }

  if (ByDay?.columns && ByDay?.rows && ByDay?.status) {
    const ws = wb.addWorksheet("ByDay");
    ws.addRow(ByDay.columns);
    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = center;
    });

    for (let r = 0; r < ByDay.rows.length; r++) {
      ws.addRow(ByDay.rows[r]);
      const excelRow = ws.getRow(r + 2);
      for (let c = 0; c < ByDay.rows[r].length; c++) {
        const cell = excelRow.getCell(c + 1);
        const st = ByDay.status?.[r]?.[c] || "WORK";
        cell.fill = st === "OFF" ? redFill : greenFill;
        cell.font = { color: { argb: "FFFFFF" } };
      }
    }

    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (let c = 1; c <= ws.columnCount; c++) ws.getColumn(c).width = 24;
  }

  if (Summary?.columns && Summary?.rows) {
    const ws = wb.addWorksheet("Summary");
    ws.addRow(Summary.columns);
    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = center;
    });
    for (const row of Summary.rows) ws.addRow(row);
    for (let c = 1; c <= ws.columnCount; c++) ws.getColumn(c).width = 16;
  }

  if (Issues?.columns && Issues?.rows) {
    const ws = wb.addWorksheet("Issues");
    ws.addRow(Issues.columns);
    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = center;
    });
    for (const row of Issues.rows) ws.addRow(row);
    ws.getColumn(1).width = 120;
  }

  wb.xlsx.writeBuffer().then((buf) => {
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      filename,
    );
  });
}

function ResultsView({ schedule }) {
  if (!schedule) return null;

  const meta = schedule.meta || {};
  const issues = schedule.issues || [];

  const matrix = schedule.sheets?.Matrix;
  const summary = schedule.sheets?.Summary;

  return (
    <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Result</h3>
          <p className="text-sm text-white/60 mt-1">
            Generated at:{" "}
            <span className="font-mono text-white/70 break-words">
              {meta.generated_at_utc}
            </span>
          </p>
        </div>

        <button
          onClick={() =>
            downloadExcelFromSchedule(
              schedule,
              `driver_schedule_${meta.year}_${String(meta.month).padStart(2, "0")}.xlsx`,
            )
          }
          className="shrink-0 rounded-2xl px-4 py-2 font-semibold bg-[#d3fb00] text-black hover:brightness-95 transition"
        >
          Download Excel
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 min-w-0">
          <div className="text-xs text-white/50">Drivers</div>
          <div className="text-2xl font-bold">
            {meta.counts?.drivers ?? "-"}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 min-w-0">
          <div className="text-xs text-white/50">Cap / Day used</div>
          <div className="text-2xl font-bold">
            {meta.cap_per_day_used ?? "-"}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 min-w-0">
          <div className="text-xs text-white/50">Issues</div>
          <div
            className={classNames(
              "text-2xl font-bold",
              issues.length ? "text-red-300" : "",
            )}
          >
            {issues.length}
          </div>
        </div>
      </div>

      <div className="mt-4 min-w-0">
        <div className="text-sm font-semibold">Issues</div>
        <div className="mt-2 rounded-2xl border border-white/10 bg-black/20 p-3 max-h-44 overflow-auto min-w-0">
          {issues.length ? (
            <ul className="list-disc pl-5 text-sm text-white/70 break-words">
              {issues.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-white/70">No issues detected.</div>
          )}
        </div>
      </div>

      {/* ✅ Matrix: ONLY this area horizontal-scrolls */}
      {matrix?.columns && matrix?.rows && (
        <div className="mt-6 min-w-0">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Matrix</div>
            <div className="text-xs text-white/50">Scroll horizontally</div>
          </div>

          <div className="mt-2 max-w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-2xl border border-white/10">
            <table className="w-max min-w-max text-sm">
              <thead className="sticky top-0 bg-black/40 backdrop-blur border-b border-white/10">
                <tr>
                  {matrix.columns.map((c) => (
                    <th
                      key={c}
                      className="p-2 text-left font-semibold whitespace-nowrap"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.rows.slice(0, 200).map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b border-white/10 last:border-b-0"
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={classNames(
                          "p-2 whitespace-nowrap",
                          cIdx >= 3 &&
                            (cell === "OFF"
                              ? "text-red-300 bg-red-500/10"
                              : "text-emerald-300 bg-emerald-500/10"),
                        )}
                      >
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {matrix.rows.length > 200 && (
            <div className="mt-2 text-xs text-white/50">
              Showing first 200 rows in UI. Excel download contains full data.
            </div>
          )}
        </div>
      )}
    </div>
  );
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
  const [holidayText, setHolidayText] = useState("");

  const [drivers, setDrivers] = useState([]);
  const [types, setTypes] = useState({});
  const [manualName, setManualName] = useState("");

  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    setTypes((prev) => {
      const next = { ...prev };
      drivers.forEach((d) => {
        if (!next[d]) next[d] = "local";
      });
      Object.keys(next).forEach((k) => {
        if (!drivers.includes(k)) delete next[k];
      });
      return next;
    });
  }, [drivers]);

  // ✅ Prevent page-level horizontal scroll (tables still scroll horizontally)
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

  function addManualDriver() {
    const nm = manualName.trim();
    if (!nm) return;
    setDrivers((prev) => Array.from(new Set([...prev, nm])));
    setManualName("");
  }

  async function generate() {
    if (!token) return showToast("error", "You must login again.");
    if (!API_BASE) return showToast("error", "Missing VITE_API_BASE in .env");
    if (!drivers.length)
      return showToast(
        "error",
        "No drivers found. Upload a CSV or add drivers manually.",
      );

    const employees = drivers.reduce((acc, name) => {
      acc[name] = types[name] || "local";
      return acc;
    }, {});

    const payload = {
      year: Number(year),
      month,
      start_day: Number(startDay),
      employees,
      public_holidays: parseHolidayLines(holidayText),
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
      showToast("success", "Schedule generated");
    } catch (e) {
      showToast("error", e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

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
                Upload → rules → generate → export
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
          {/* ✅ RULES (FULL WIDTH) + CSV UPLOAD INSIDE */}
          <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Rules</h2>
                <p className="text-sm text-white/60 mt-1">
                  Upload employees, set rules, then generate.
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

            {/* ✅ CSV Upload lives here */}
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
              <div className="lg:col-span-4 min-w-0">
                <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        Upload employees
                      </div>
                      <div className="text-xs text-white/50 mt-1">
                        CSV only needs the driver names column.
                      </div>
                    </div>
                    <div className="text-xs text-white/50 shrink-0">
                      Loaded: <b className="text-white/80">{drivers.length}</b>
                    </div>
                  </div>

                  <div className="mt-3 min-w-0">
                    <CSVUpload onDrivers={setDrivers} embedded />
                  </div>
                </div>
              </div>

              {/* Rule inputs */}
              <div className="lg:col-span-8 min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
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
                <div className="text-sm font-semibold">Public holidays</div>
                <div className="mt-2 text-xs text-white/50">
                  Paste dates separated by commas/new lines. Accepts{" "}
                  <b>YYYY-MM-DD</b> or <b>DD/MM/YYYY</b>.
                </div>
                <textarea
                  value={holidayText}
                  onChange={(e) => setHolidayText(e.target.value)}
                  placeholder={"2026-02-25\n26/02/2026"}
                  className="mt-3 w-full min-w-0 min-h-[120px] rounded-2xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                />
              </div>
            </div>
          </div>
          <DriverTypeEditor
            drivers={drivers}
            types={types}
            setTypes={setTypes}
            manualName={manualName}
            setManualName={setManualName}
            onAddManual={addManualDriver}
          />
          {/* ✅ RESULTS BELOW (only shows after generate) */}
          {schedule && <ResultsView schedule={schedule} />}
        </div>
      </div>
    </div>
  );
}
