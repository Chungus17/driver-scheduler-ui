/* eslint-disable react-hooks/static-components */
import { classNames, guessByAliases, guessNameColumn, normalizeKey, normalizeType } from "./helpers";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useEffect, useMemo, useState } from "react";

// eslint-disable-next-line react-refresh/only-export-components
export function rowToArray(row, columns) {
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

// eslint-disable-next-line react-refresh/only-export-components
export function findStatusStartIndex(columns) {
  const cols = columns || [];
  const reqIdx = cols.findIndex((c) => normalizeKey(c) === "reqoff");
  if (reqIdx >= 0) return reqIdx + 1;

  const typeIdx = cols.findIndex((c) => normalizeKey(c) === "type");
  if (typeIdx >= 0) return typeIdx + 2;

  return 3;
}

export function Toast({ toast, onClose }) {
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

export function CSVImportSection({
  employeesCount,
  onImportedEmployees,
  onImportedTypes,
}) {
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

export function EmployeesSection({
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

  // ✅ NEW: type filter ("all" | "local" | "overseas")
  const [typeFilter, setTypeFilter] = useState("all");

  const counts = useMemo(() => {
    let local = 0;
    let overseas = 0;
    for (const e of employees) {
      const t = types[e.name] || "local";
      if (t === "overseas") overseas++;
      else local++;
    }
    return { all: employees.length, local, overseas };
  }, [employees, types]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return employees.filter((e) => {
      const t = types[e.name] || "local";
      if (typeFilter !== "all" && t !== typeFilter) return false;

      if (!s) return true;
      const hay = `${e.name} ${e.civil_id || ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [employees, q, types, typeFilter]);

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

  // ✅ NEW: delete a row
  function deleteEmployee(name) {
    setEmployees((prev) => prev.filter((e) => e.name !== name));
    setTypes((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  const FilterPill = ({ id, label, count }) => {
    const active = typeFilter === id;
    return (
      <button
        type="button"
        onClick={() => setTypeFilter(id)}
        className={classNames(
          "rounded-2xl border px-3 py-2 text-sm transition inline-flex items-center gap-2",
          active
            ? "border-[#d3fb00]/30 bg-[#d3fb00] text-black"
            : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
        )}
      >
        <span>{label}</span>
        <span
          className={classNames(
            "text-xs rounded-full px-2 py-0.5",
            active ? "bg-black/15" : "bg-black/30",
          )}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
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

      {/* ✅ Manual add */}
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

      {/* ✅ Search + Type filters */}
      <div className="mt-4 flex flex-col lg:flex-row lg:items-center gap-3 min-w-0">
        <div className="flex gap-2 min-w-0 w-full">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name / civil..."
            className="w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d3fb00]/20 focus:border-[#d3fb00]/30"
          />
          <div className="shrink-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/60 whitespace-nowrap flex items-center">
            <b className="text-white/80">{filtered.length}</b>/
            {employees.length}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <FilterPill id="all" label="All" count={counts.all} />
          <FilterPill id="local" label="Local" count={counts.local} />
          <FilterPill id="overseas" label="Overseas" count={counts.overseas} />
        </div>
      </div>

      {/* ✅ Table */}
      <div className="mt-4 max-h-[420px] overflow-auto rounded-2xl border border-white/10 min-w-0">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-black/40 backdrop-blur border-b border-white/10">
            <tr>
              <th className="text-left p-3 font-semibold">Name</th>
              <th className="text-left p-3 font-semibold w-[220px]">
                Civil ID
              </th>
              <th className="text-left p-3 font-semibold w-44">Type</th>
              <th className="text-right p-3 font-semibold w-[110px]">
                Actions
              </th>
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

                {/* ✅ Delete button */}
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => deleteEmployee(emp.name)}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/15"
                    title="Delete"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {!employees.length && (
              <tr>
                <td className="p-3 text-white/50" colSpan={4}>
                  Import CSV above or add employees manually.
                </td>
              </tr>
            )}

            {employees.length > 0 && filtered.length === 0 && (
              <tr>
                <td className="p-3 text-white/50" colSpan={4}>
                  No employees match your filters/search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function downloadExcelFromSchedule(
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
    fgColor: { argb: "16fc05" },
  };
  const redFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "fa4343" },
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
        cell.font = { color: { argb: "000000" } };
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

export function ResultsView({ schedule }) {
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

export function PublicHolidaysPicker({ value, onChange }) {
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
          <div className="text-xs text-white/50 mt-1">
            Pick dates and add them
          </div>
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