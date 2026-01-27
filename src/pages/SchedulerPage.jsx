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

function normalizeKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function normalizeType(v) {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return "";
  if (s.includes("over")) return "overseas";
  if (s.includes("local")) return "local";
  if (s === "o") return "overseas";
  if (s === "l") return "local";
  return "";
}

function guessNameColumn(headers) {
  const lower = (headers || []).map((h) =>
    String(h || "").trim().toLowerCase(),
  );
  const idx1 = lower.findIndex((h) => h.includes("driver") && h.includes("name"));
  if (idx1 !== -1) return headers[idx1];
  const idx2 = lower.findIndex(
    (h) => h === "driver" || h === "drivers" || h === "name" || h === "names",
  );
  return idx2 >= 0 ? headers[idx2] : headers?.[0] || "";
}

function guessByAliases(headers, aliases) {
  const hs = headers || [];
  const norm = hs.map((h) => normalizeKey(h));
  const targets = (aliases || []).map((a) => normalizeKey(a));
  const idx = norm.findIndex((k) => targets.includes(k));
  return idx >= 0 ? hs[idx] : "";
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

function rowToArray(row, columns) {
  if (Array.isArray(row)) {
    const arr = row.map((v) => (v == null ? "" : String(v)));
    if (!columns?.length) return arr;
    if (arr.length < columns.length)
      return [...arr, ...Array(columns.length - arr.length).fill("")];
    if (arr.length > columns.length) return arr.slice(0, columns.length);
    return arr;
  }

  if (row && typeof row === "object") {
    const normMap = {};
    for (const k of Object.keys(row)) {
      normMap[normalizeKey(k)] = row[k];
    }
    return (columns || []).map((c) => {
      const v = normMap[normalizeKey(c)];
      return v == null ? "" : String(v);
    });
  }

  return (columns || []).map(() => "");
}

function findStatusStartIndex(columns) {
  const cols = columns || [];
  const reqIdx = cols.findIndex((c) => normalizeKey(c) === "reqoff");
  if (reqIdx >= 0) return reqIdx + 1;

  const typeIdx = cols.findIndex((c) => normalizeKey(c) === "type");
  if (typeIdx >= 0) return typeIdx + 2;

  return 3;
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

/**
 * CSV Import section
 * Reads:
 * - name (required)
 * - civil_id (optional)
 * - origin/type (optional): local/overseas -> will auto-set type map
 *
 * Calls:
 * - onImportedEmployees(employeesArray)
 * - onImportedTypes(typesByName)
 */
function CSVImportSection({ employeesCount, onImportedEmployees, onImportedTypes }) {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);

  const [nameCol, setNameCol] = useState("");
  const [civilCol, setCivilCol] = useState("");
  const [originCol, setOriginCol] = useState("");

  function handleFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const data = result.data || [];
        const cols = result.meta?.fields || [];

        setHeaders(cols);
        setRows(data);

        const guessedName = cols.length ? guessNameColumn(cols) : "";
        const guessedCivil = guessByAliases(cols, [
          "civil_id",
          "civil id",
          "civilid",
          "cid",
        ]);

        const guessedOrigin = guessByAliases(cols, [
          "origin",
          "type",
          "employee_type",
          "driver_type",
          "local/overseas",
        ]);

        setNameCol(guessedName);
        setCivilCol(guessedCivil);
        setOriginCol(guessedOrigin);
      },
      error: () => {
        setHeaders([]);
        setRows([]);
        setNameCol("");
        setCivilCol("");
        setOriginCol("");
      },
    });
  }

  function emitImport() {
    if (!rows.length || !nameCol) return;

    const map = new Map();
    const typesFromCsv = {};

    for (const r of rows) {
      const name = (r?.[nameCol] ?? "").toString().trim();
      if (!name) continue;

      const civil_id = civilCol ? (r?.[civilCol] ?? "").toString().trim() : "";

      const originRaw = originCol ? r?.[originCol] : "";
      const t = normalizeType(originRaw);

      const prev = map.get(name);
      map.set(name, {
        name,
        civil_id: prev?.civil_id || civil_id || "",
      });

      if (t) typesFromCsv[name] = t;
    }

    onImportedEmployees(Array.from(map.values()));
    onImportedTypes(typesFromCsv);
  }

  useEffect(() => {
    emitImport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, nameCol, civilCol, originCol]);

  return (
    <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">CSV Import</h3>
          <div className="text-sm text-white/60 mt-1">
            Required: <b>Name</b>. Optional: <b>Civil ID</b>, <b>Origin</b>{" "}
            (local/overseas).
          </div>
        </div>
        <div className="text-xs text-white/50 shrink-0">
          Total loaded: <b className="text-white/80">{employeesCount}</b>
        </div>
      </div>

      <div className="mt-4 grid gap-3 min-w-0">
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
          <div className="grid gap-3 min-w-0">
            <div className="grid gap-2 min-w-0">
              <label className="text-xs font-medium text-white/70">
                Name column
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <div className="grid gap-2 min-w-0">
                <label className="text-xs font-medium text-white/70">
                  Civil ID column (optional)
                </label>
                <select
                  value={civilCol}
                  onChange={(e) => setCivilCol(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                >
                  <option value="">— none —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2 min-w-0">
                <label className="text-xs font-medium text-white/70">
                  Origin / Type column (optional)
                </label>
                <select
                  value={originCol}
                  onChange={(e) => setOriginCol(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                >
                  <option value="">— none —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs text-white/50">
              Parsed rows: <b className="text-white/80">{rows.length}</b>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Employees section: manual add + search + table
 */
function EmployeesSection({
  employees,
  setEmployees,
  types,
  setTypes,

  manualName,
  setManualName,
  manualCivil,
  setManualCivil,

  onAddManual,
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return employees;
    return employees.filter((e) => {
      const hay = `${e.name} ${e.civil_id || ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [employees, q]);

  function setAll(t) {
    const next = { ...types };
    employees.forEach((e) => (next[e.name] = t));
    setTypes(next);
  }

  function patchEmployee(name, patch) {
    setEmployees((prev) =>
      prev.map((e) => (e.name === name ? { ...e, ...patch } : e)),
    );
  }

  return (
    <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Employees</h3>
            <span className="text-xs text-white/50">({employees.length})</span>
          </div>
          <p className="text-sm text-white/60 mt-1">
            Add manually here. CSV import is a separate section.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
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

      {/* Manual add */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-3 min-w-0">
        <div className="lg:col-span-6 min-w-0">
          <input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Name..."
            className="w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
          />
        </div>
        <div className="lg:col-span-4 min-w-0">
          <input
            value={manualCivil}
            onChange={(e) => setManualCivil(e.target.value)}
            placeholder="Civil ID..."
            className="w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
          />
        </div>
        <div className="lg:col-span-2 min-w-0">
          <button
            onClick={onAddManual}
            className="w-full rounded-2xl px-4 py-2 font-semibold bg-[#d3fb00] text-black hover:brightness-95 transition"
          >
            Add
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mt-3 flex gap-2 min-w-0 w-full">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name / civil..."
          className="w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
        />
        <div className="shrink-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/60 whitespace-nowrap flex items-center">
          <b className="text-white/80">{filtered.length}</b>/{employees.length}
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 max-h-[420px] overflow-auto rounded-2xl border border-white/10 min-w-0">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-black/40 backdrop-blur border-b border-white/10">
            <tr>
              <th className="text-left p-3 font-semibold">Name</th>
              <th className="text-left p-3 font-semibold w-[220px]">
                Civil ID
              </th>
              <th className="text-left p-3 font-semibold w-44">Type</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr
                key={emp.name}
                className="border-b border-white/10 last:border-b-0"
              >
                <td className="p-3 font-medium text-white/90 break-words">
                  {emp.name}
                </td>

                <td className="p-3">
                  <input
                    value={emp.civil_id || ""}
                    onChange={(e) =>
                      patchEmployee(emp.name, { civil_id: e.target.value })
                    }
                    placeholder="Civil ID..."
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                  />
                </td>

                <td className="p-3">
                  <select
                    value={types[emp.name] || "local"}
                    onChange={(e) =>
                      setTypes((prev) => ({
                        ...prev,
                        [emp.name]: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                  >
                    <option value="local">local</option>
                    <option value="overseas">overseas</option>
                  </select>
                </td>
              </tr>
            ))}

            {!employees.length && (
              <tr>
                <td className="p-3 text-white/50" colSpan={3}>
                  Import CSV above or add employees manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function downloadExcelFromSchedule(schedule, filename = "driver_schedule.xlsx") {
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
    const cols = Matrix.columns;
    const statusStart = findStatusStartIndex(cols);
    const statusStartCol = statusStart + 1;
    const freezeCols = Math.max(0, statusStartCol - 1);

    const ws = wb.addWorksheet("Matrix");
    ws.addRow(cols);

    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = center;
    });

    for (const row of Matrix.rows) ws.addRow(rowToArray(row, cols));

    for (let r = 2; r <= ws.rowCount; r++) {
      for (let c = statusStartCol; c <= ws.columnCount; c++) {
        const cell = ws.getRow(r).getCell(c);
        cell.alignment = center;
        cell.fill = cell.value === "OFF" ? redFill : greenFill;
        cell.font = { color: { argb: "FFFFFF" } };
      }

      // Name cell should be visible (don't force white on white)
      const nameCell = ws.getRow(r).getCell(1);
      nameCell.font = { bold: true };
      nameCell.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };
    }

    ws.views = [{ state: "frozen", xSplit: freezeCols, ySplit: 1 }];

    // NOTE: widths assume your Matrix columns now are:
    // [Name, Civil ID, Type, ReqOff, ...dates]
    ws.getColumn(1).width = 22; // Name
    ws.getColumn(2).width = 22; // Civil ID
    ws.getColumn(3).width = 12; // Type
    ws.getColumn(4).width = 8; // ReqOff
    for (let c = 5; c <= ws.columnCount; c++) ws.getColumn(c).width = 12;
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
      ws.addRow(rowToArray(ByDay.rows[r], ByDay.columns));
      const excelRow = ws.getRow(r + 2);

      for (let c = 0; c < ByDay.columns.length; c++) {
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

    for (const row of Summary.rows) ws.addRow(rowToArray(row, Summary.columns));
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

    for (const row of Issues.rows) ws.addRow(rowToArray(row, Issues.columns));
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
          <div className="text-2xl font-bold">{meta.counts?.drivers ?? "-"}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 min-w-0">
          <div className="text-xs text-white/50">Cap / Day used</div>
          <div className="text-2xl font-bold">{meta.cap_per_day_used ?? "-"}</div>
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

      {/* Matrix only */}
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
                {matrix.rows.slice(0, 200).map((row, rIdx) => {
                  const arr = rowToArray(row, matrix.columns);
                  const statusStart = findStatusStartIndex(matrix.columns);
                  return (
                    <tr
                      key={rIdx}
                      className="border-b border-white/10 last:border-b-0"
                    >
                      {arr.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={classNames(
                            "p-2 whitespace-nowrap",
                            cIdx >= statusStart &&
                              (cell === "OFF"
                                ? "text-red-300 bg-red-500/10"
                                : "text-emerald-300 bg-emerald-500/10"),
                          )}
                        >
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
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

function PublicHolidaysPicker({ value, onChange }) {
  const [draft, setDraft] = useState("");
  const holidays = Array.isArray(value) ? value : [];

  function addDate() {
    const d = (draft || "").trim();
    if (!d) return;
    const next = Array.from(new Set([...holidays, d])).sort();
    onChange(next);
    setDraft("");
  }

  function removeDate(date) {
    onChange(holidays.filter((x) => x !== date));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Public holidays</div>
          <div className="text-xs text-white/50 mt-1">Pick dates and add them</div>
        </div>

        <button
          type="button"
          onClick={clearAll}
          disabled={!holidays.length}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      <div className="mt-3 flex flex-col sm:flex-row gap-2 min-w-0">
        <input
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="date-white-icon w-full sm:w-[220px] min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
        />
        <button
          type="button"
          onClick={addDate}
          disabled={!draft}
          className="shrink-0 rounded-2xl px-4 py-2 font-semibold bg-[#d3fb00] text-black hover:brightness-95 transition disabled:opacity-50"
        >
          Add
        </button>

        <div className="sm:ml-auto text-xs text-white/50 flex items-center">
          Total: <b className="text-white/80 ml-1">{holidays.length}</b>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {holidays.length ? (
          holidays.map((d) => (
            <span
              key={d}
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80"
            >
              <span className="font-mono text-xs text-white/70">{d}</span>
              <button
                type="button"
                onClick={() => removeDate(d)}
                className="rounded-full px-1 text-white/60 hover:text-white"
                aria-label={`Remove ${d}`}
              >
                ✕
              </button>
            </span>
          ))
        ) : (
          <div className="text-sm text-white/50">No holidays added yet.</div>
        )}
      </div>
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
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
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
      return showToast("error", "Please enter Name and Civil ID before adding.");
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
                <label className="text-xs font-medium text-white/70">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="mt-1 w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
                />
              </div>

              <div className="min-w-0">
                <label className="text-xs font-medium text-white/70">Month</label>
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
                  Driver percentage cap <span className="text-white/40">(0..1)</span>
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
                            if (checked) return prev.filter((x) => x !== d.value);
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
                <PublicHolidaysPicker value={publicHolidays} onChange={setPublicHolidays} />
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
