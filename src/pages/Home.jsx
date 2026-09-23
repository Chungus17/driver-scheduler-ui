/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

import {
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileUp,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Users,
  X,
} from "lucide-react";

// ============================================================
// CONFIGURATION
// ============================================================

// Uses the Vite /api proxy during local development.
// If needed, set VITE_API_BASE_URL in your frontend .env file.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);

const WEEKDAYS = [
  { label: "Monday", value: "monday" },
  { label: "Tuesday", value: "tuesday" },
  { label: "Wednesday", value: "wednesday" },
  { label: "Thursday", value: "thursday" },
  { label: "Friday", value: "friday" },
  { label: "Saturday", value: "saturday" },
  { label: "Sunday", value: "sunday" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// The backend accepts local, foreign, and overseas.
// Overseas is normalized to foreign before generating.
const normalizeDriverType = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "local") {
    return "local";
  }

  if (normalized === "foreign" || normalized === "overseas") {
    return "foreign";
  }

  return null;
};

const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

const formatDate = (year, month, day) => {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
};

const getWeekdayName = (year, month, day) => {
  const date = new Date(year, month - 1, day);

  return WEEKDAYS[(date.getDay() + 6) % 7].value;
};

const getErrorMessage = (data, fallback) => {
  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((item) => {
        const location = item.loc?.join(" → ");

        return `${location || "Validation"}: ${item.msg}`;
      })
      .join("\n");
  }

  return fallback;
};

// ============================================================
// REUSABLE UI COMPONENTS
// ============================================================

function SectionHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f1e5] text-[#65724b]">
          <Icon size={20} />
        </div>

        <div>
          <h2 className="text-base font-bold text-[#2f342b] sm:text-lg">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-sm text-[#797b6f]">{subtitle}</p>
          )}
        </div>
      </div>

      {action}
    </div>
  );
}

function InputField({ label, helper, error, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-[#555849]">
        {label}
      </span>

      <input
        {...props}
        className={`w-full rounded-xl border bg-[#fffdf8] px-3.5 py-2.5 text-sm text-[#2f342b] outline-none transition placeholder:text-[#939486] focus:ring-4 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
            : "border-[#d9d0bf] hover:border-[#bdb29f] focus:border-[#65724b] focus:ring-[#e3e9d4]"
        } ${props.className || ""}`}
      />

      {helper && <p className="mt-1.5 text-xs text-[#797b6f]">{helper}</p>}

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </label>
  );
}

function SelectField({ label, children, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-[#555849]">
        {label}
      </span>

      <div className="relative">
        <select
          {...props}
          className={`w-full appearance-none rounded-xl border border-[#d9d0bf] bg-[#fffdf8] px-3.5 py-2.5 pr-10 text-sm text-[#2f342b] outline-none transition hover:border-[#bdb29f] focus:border-[#65724b] focus:ring-4 focus:ring-[#e3e9d4] ${
            props.className || ""
          }`}
        >
          {children}
        </select>

        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#939486]"
        />
      </div>
    </label>
  );
}

function StatCard({ label, value, icon: Icon, color = "blue" }) {
  const colors = {
    blue: "bg-[#f0f1e5] text-[#65724b]",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-[#f2edf3] text-[#7b627d]",
    amber: "bg-[#fbf3de] text-amber-600",
  };

  return (
    <div className="rounded-2xl border border-[#d8cfbf] bg-[#fffdf8] p-4 shadow-[0_3px_12px_rgba(69,58,39,0.045)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#797b6f] sm:text-sm">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-[#2f342b]">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            colors[color]
          }`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN HOME COMPONENT
// ============================================================

export default function Home({ onLogout }) {
  const today = new Date();

  const fileInputRef = useRef(null);
  const holidayInputRef = useRef(null);

  // ----------------------------------------------------------
  // IMPORTED FILE STATE
  // ----------------------------------------------------------

  const [fileName, setFileName] = useState("");

  const [fileHeaders, setFileHeaders] = useState([]);

  const [fileRows, setFileRows] = useState([]);

  const [columnMapping, setColumnMapping] = useState({
    name: "",
    id: "",
    type: "",
  });

  const [importError, setImportError] = useState("");

  const [isDragging, setIsDragging] = useState(false);

  const [driverSearch, setDriverSearch] = useState("");

  // ----------------------------------------------------------
  // SCHEDULING CONFIGURATION STATE
  // ----------------------------------------------------------

  const [year, setYear] = useState(today.getFullYear());

  const [month, setMonth] = useState(today.getMonth() + 1);

  const [startDay, setStartDay] = useState(1);

  const [localDaysOff, setLocalDaysOff] = useState(4);

  const [foreignDaysOff, setForeignDaysOff] = useState(3);

  const [driverCap, setDriverCap] = useState(10);

  const [excludedWeekdays, setExcludedWeekdays] = useState([
    "saturday",
    "sunday",
  ]);

  const [publicHolidays, setPublicHolidays] = useState([]);

  const [holidayDate, setHolidayDate] = useState("");

  // ----------------------------------------------------------
  // GENERATED SCHEDULE STATE
  // ----------------------------------------------------------

  const [schedule, setSchedule] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  const [scheduleError, setScheduleError] = useState("");

  const [scheduleSearch, setScheduleSearch] = useState("");

  const [showOnlyOff, setShowOnlyOff] = useState(false);

  // ----------------------------------------------------------
  // DERIVED VALUES
  // ----------------------------------------------------------

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const dailyCapCount = useMemo(() => {
    const estimatedDrivers = fileRows.length;

    return Math.floor((estimatedDrivers * driverCap) / 100);
  }, [fileRows.length, driverCap]);

  // Automatically keep start_day within the selected month.
  useEffect(() => {
    if (startDay > daysInMonth) {
      setStartDay(daysInMonth);
    }
  }, [daysInMonth, startDay]);

  // Remove holidays that belong to a previously selected month.
  useEffect(() => {
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}-`;

    setPublicHolidays((previous) =>
      previous.filter((holiday) => holiday.startsWith(monthPrefix)),
    );

    setHolidayDate("");
  }, [year, month]);

  // Invalidate previously generated results when settings change.
  useEffect(() => {
    setSchedule(null);
    setScheduleError("");
  }, [
    fileRows,
    columnMapping,
    year,
    month,
    startDay,
    localDaysOff,
    foreignDaysOff,
    driverCap,
    excludedWeekdays,
    publicHolidays,
  ]);

  // ----------------------------------------------------------
  // FILE IMPORT
  // ----------------------------------------------------------

  const handleFileUpload = async (file) => {
    if (!file) return;

    setImportError("");
    setSchedule(null);

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["csv", "xlsx", "xls"].includes(extension)) {
      setImportError(
        "Please upload a valid CSV or Excel file (.csv, .xlsx, .xls).",
      );

      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();

      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
        cellDates: false,
        raw: false,
      });

      if (!workbook.SheetNames.length) {
        throw new Error("The uploaded file does not contain any worksheets.");
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      });

      if (!data.length) {
        throw new Error("The uploaded file is empty.");
      }

      const headers = data[0].map((header, index) => {
        const normalized = String(header ?? "").trim();

        return normalized || `Column ${index + 1}`;
      });

      if (headers.length < 3) {
        throw new Error("The file must contain at least three columns.");
      }

      const rows = data
        .slice(1)
        .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));

      if (!rows.length) {
        throw new Error("The file does not contain any driver records.");
      }

      // Auto-detect common column names.
      const findColumn = (possibleNames) => {
        const index = headers.findIndex((header) =>
          possibleNames.includes(header.toLowerCase()),
        );

        return index === -1 ? "" : String(index);
      };

      setFileHeaders(headers);
      setFileRows(rows);
      setFileName(file.name);

      setColumnMapping({
        name: findColumn([
          "name",
          "driver name",
          "driver_name",
          "employee name",
          "employee_name",
          "full name",
        ]),

        id: findColumn([
          "id",
          "driver id",
          "driver_id",
          "employee id",
          "employee_id",
          "staff id",
        ]),

        type: findColumn([
          "type",
          "driver type",
          "driver_type",
          "employee type",
          "nationality type",
        ]),
      });
    } catch (error) {
      setImportError(error.message || "Unable to read the uploaded file.");

      setFileName("");
      setFileHeaders([]);
      setFileRows([]);

      setColumnMapping({
        name: "",
        id: "",
        type: "",
      });
    }
  };

  const handleFileInputChange = async (event) => {
    const file = event.target.files?.[0];

    await handleFileUpload(file);

    // Allow selecting the same file again.
    event.target.value = "";
  };

  const handleDrop = async (event) => {
    event.preventDefault();

    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    await handleFileUpload(file);
  };

  const clearImportedFile = () => {
    setFileName("");
    setFileHeaders([]);
    setFileRows([]);

    setColumnMapping({
      name: "",
      id: "",
      type: "",
    });

    setImportError("");
    setDriverSearch("");
    setSchedule(null);
  };

  // ----------------------------------------------------------
  // NORMALIZE IMPORTED DRIVERS
  // ----------------------------------------------------------

  const mappedDrivers = useMemo(() => {
    const { name: nameColumn, id: idColumn, type: typeColumn } = columnMapping;

    if (nameColumn === "" || idColumn === "" || typeColumn === "") {
      return [];
    }

    return fileRows.map((row, index) => {
      const name = String(row[Number(nameColumn)] ?? "").trim();

      const id = String(row[Number(idColumn)] ?? "").trim();

      const originalType = String(row[Number(typeColumn)] ?? "").trim();

      return {
        rowNumber: index + 2,
        id,
        name,
        type: normalizeDriverType(originalType),
        originalType,
      };
    });
  }, [fileRows, columnMapping]);

  const mappingError = useMemo(() => {
    const values = Object.values(columnMapping);

    if (values.some((value) => value === "")) {
      return "";
    }

    if (new Set(values).size !== 3) {
      return "Name, ID, and Type must use three different columns.";
    }

    return "";
  }, [columnMapping]);

  const driverValidation = useMemo(() => {
    const errors = [];

    if (mappingError) {
      errors.push(mappingError);
    }

    const seenIds = new Set();

    mappedDrivers.forEach((driver) => {
      if (!driver.id) {
        errors.push(`Row ${driver.rowNumber}: Driver ID is missing.`);
      } else if (seenIds.has(driver.id)) {
        errors.push(`Row ${driver.rowNumber}: Duplicate ID "${driver.id}".`);
      } else {
        seenIds.add(driver.id);
      }

      if (!driver.name) {
        errors.push(`Row ${driver.rowNumber}: Driver name is missing.`);
      }

      if (!driver.type) {
        errors.push(
          `Row ${driver.rowNumber}: Invalid driver type "${driver.originalType}". Use local, foreign, or overseas.`,
        );
      }
    });

    return errors;
  }, [mappedDrivers, mappingError]);

  const localDriverCount = mappedDrivers.filter(
    (driver) => driver.type === "local",
  ).length;

  const foreignDriverCount = mappedDrivers.filter(
    (driver) => driver.type === "foreign",
  ).length;

  const filteredDrivers = useMemo(() => {
    const search = driverSearch.trim().toLowerCase();

    if (!search) return mappedDrivers;

    return mappedDrivers.filter((driver) =>
      [driver.name, driver.id, driver.type]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search)),
    );
  }, [mappedDrivers, driverSearch]);

  // ----------------------------------------------------------
  // WEEKDAYS
  // ----------------------------------------------------------

  const toggleWeekday = (weekday) => {
    setExcludedWeekdays((previous) => {
      if (previous.includes(weekday)) {
        return previous.filter((day) => day !== weekday);
      }

      return [...previous, weekday];
    });
  };

  // ----------------------------------------------------------
  // PUBLIC HOLIDAYS
  // ----------------------------------------------------------

  const addPublicHoliday = () => {
    if (!holidayDate) return;

    const expectedPrefix = `${year}-${String(month).padStart(2, "0")}-`;

    if (!holidayDate.startsWith(expectedPrefix)) {
      setScheduleError("The public holiday must belong to the selected month.");

      return;
    }

    if (publicHolidays.includes(holidayDate)) {
      setHolidayDate("");
      return;
    }

    setPublicHolidays((previous) => [...previous, holidayDate].sort());

    setHolidayDate("");
    setScheduleError("");
  };

  const removePublicHoliday = (holiday) => {
    setPublicHolidays((previous) =>
      previous.filter((date) => date !== holiday),
    );
  };

  // ----------------------------------------------------------
  // ELIGIBLE DATES
  // ----------------------------------------------------------

  const eligibleDates = useMemo(() => {
    const dates = [];

    for (let day = startDay; day <= daysInMonth; day++) {
      const dateString = formatDate(year, month, day);

      const weekday = getWeekdayName(year, month, day);

      if (excludedWeekdays.includes(weekday)) {
        continue;
      }

      if (publicHolidays.includes(dateString)) {
        continue;
      }

      dates.push(dateString);
    }

    return dates;
  }, [year, month, startDay, daysInMonth, excludedWeekdays, publicHolidays]);

  const totalRequiredDaysOff =
    localDriverCount * localDaysOff + foreignDriverCount * foreignDaysOff;

  const availableCapacity =
    eligibleDates.length * Math.floor((mappedDrivers.length * driverCap) / 100);

  // ----------------------------------------------------------
  // GENERATE SCHEDULE
  // ----------------------------------------------------------

  const handleGenerateSchedule = async () => {
    setScheduleError("");

    if (!mappedDrivers.length) {
      setScheduleError(
        "Please import a driver file and map the required columns.",
      );

      return;
    }

    if (mappingError || driverValidation.length) {
      setScheduleError(
        "Please fix the imported driver data before generating the schedule.",
      );

      return;
    }

    if (
      !Number.isInteger(localDaysOff) ||
      localDaysOff < 0 ||
      !Number.isInteger(foreignDaysOff) ||
      foreignDaysOff < 0
    ) {
      setScheduleError("Days off must be valid non-negative whole numbers.");

      return;
    }

    if (!Number.isInteger(driverCap) || driverCap < 1 || driverCap > 100) {
      setScheduleError("Driver cap must be between 1% and 100%.");

      return;
    }

    if (totalRequiredDaysOff > 0 && dailyCapCount === 0) {
      setScheduleError(
        `The current ${driverCap}% cap allows zero drivers off per day with ${mappedDrivers.length} drivers. Increase the percentage.`,
      );

      return;
    }

    if (totalRequiredDaysOff > availableCapacity) {
      setScheduleError(
        `This schedule requires ${totalRequiredDaysOff} days off, but only ${availableCapacity} assignments are available. Increase the driver cap or allow more scheduling dates.`,
      );

      return;
    }

    const payload = {
      year: Number(year),
      month: Number(month),
      start_day: Number(startDay),

      days_off: {
        local: Number(localDaysOff),
        foreign: Number(foreignDaysOff),
      },

      driver_cap_percentage: Number(driverCap),

      excluded_weekdays: excludedWeekdays,

      public_holidays: publicHolidays,

      drivers: mappedDrivers.map((driver) => ({
        id: driver.id,
        name: driver.name,
        type: driver.type,
      })),
    };

    setIsGenerating(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/driver-scheduler/generate`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to generate the schedule."),
        );
      }

      if (!Array.isArray(data.columns) || !Array.isArray(data.rows)) {
        throw new Error("The backend returned an invalid schedule format.");
      }

      setSchedule(data);
      setScheduleSearch("");
      setShowOnlyOff(false);

      // Scroll to the result after the state updates.
      window.setTimeout(() => {
        document.getElementById("schedule-results")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (error) {
      setScheduleError(
        error.message || "Unable to connect to the scheduling service.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // ----------------------------------------------------------
  // EXCEL EXPORT
  // ----------------------------------------------------------

  const handleDownloadExcel = async () => {
    if (!schedule || isExporting) return;

    setIsExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();

      workbook.creator = "Driver Scheduler";

      const worksheet = workbook.addWorksheet("Driver Schedule");

      worksheet.addRow(schedule.columns);

      schedule.rows.forEach((row) => {
        worksheet.addRow(row);
      });

      // Header styling.
      const headerRow = worksheet.getRow(1);

      headerRow.height = 30;

      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF65724B" },
        };

        cell.font = {
          name: "Calibri",
          bold: true,
          color: { argb: "FFFFFFFF" },
          size: 11,
        };

        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      });

      worksheet.getColumn(1).width = 26;
      worksheet.getColumn(2).width = 16;
      worksheet.getColumn(3).width = 15;

      for (let col = 4; col <= schedule.columns.length; col++) {
        worksheet.getColumn(col).width = 11;
      }

      // Format driver information and WORK/OFF cells.
      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);

        row.height = 23;

        for (let col = 1; col <= 3; col++) {
          const cell = row.getCell(col);

          cell.font = {
            name: "Calibri",
            size: 11,
            color: { argb: "FF334155" },
            bold: col === 1,
          };

          cell.alignment = {
            vertical: "middle",
          };
        }

        for (let col = 4; col <= schedule.columns.length; col++) {
          const cell = row.getCell(col);

          const isOff = cell.value === "OFF";

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: isOff ? "FFFEE2E2" : "FFDCFCE7",
            },
          };

          cell.font = {
            name: "Calibri",
            size: 10,
            bold: isOff,
            color: {
              argb: isOff ? "FFB91C1C" : "FF166534",
            },
          };

          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        }
      }

      worksheet.views = [
        {
          state: "frozen",
          xSplit: 3,
          ySplit: 1,
        },
      ];

      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: {
          row: 1,
          column: schedule.columns.length,
        },
      };

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `Driver_Schedule_${schedule.year}_${String(
        schedule.month,
      ).padStart(2, "0")}.xlsx`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      // Revoke after the download has been initiated.
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      setScheduleError(error.message || "Unable to export the Excel file.");
    } finally {
      setIsExporting(false);
    }
  };

  // ----------------------------------------------------------
  // SCHEDULE PREVIEW
  // ----------------------------------------------------------

  const filteredScheduleRows = useMemo(() => {
    if (!schedule?.rows) return [];

    const search = scheduleSearch.trim().toLowerCase();

    return schedule.rows.filter((row) => {
      const matchesSearch =
        !search ||
        row
          .slice(0, 3)
          .some((value) => String(value).toLowerCase().includes(search));

      const matchesOffFilter =
        !showOnlyOff || row.slice(3).some((value) => value === "OFF");

      return matchesSearch && matchesOffFilter;
    });
  }, [schedule, scheduleSearch, showOnlyOff]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-[#f3eee4] text-[#2f342b]">
      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="sticky top-0 z-40 border-b border-[#d9d0bf] bg-[#fffdf8]/95 backdrop-blur">
        <div className="mx-auto flex min-h-20 max-w-350 items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#485338] bg-[#65724b] text-[#fffdf8] shadow-[0_2px_6px_rgba(60,70,43,0.12)] sm:h-12 sm:w-12">
              <CalendarDays size={23} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h1 className="text-xl font-extrabold tracking-[-0.045em] text-[#343b2c] sm:text-2xl">
                  VERDI
                </h1>
                <span
                  className="hidden h-4 w-px bg-[#c7bdad] sm:block"
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold tracking-wide text-[#65724b] sm:text-sm">
                  Driver Scheduler
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#858274] sm:text-xs">
                Internal workforce planning
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#d9d0bf] bg-[#fffdf8] px-3.5 py-2.5 text-sm font-semibold text-[#555849] transition hover:border-[#bbaea0] hover:bg-[#f4efe5] focus:outline-none focus:ring-4 focus:ring-[#e3e9d4]"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* ====================================================
          MAIN CONTENT
      ==================================================== */}

      <main className="mx-auto max-w-350 space-y-7 px-4 py-7 sm:px-6 lg:px-8">
        {/* PAGE INTRODUCTION */}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#2f342b] sm:text-3xl">
              Create driver schedules
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#797b6f]">
              Import your drivers, configure days off, and generate a monthly
              schedule with a single click.
            </p>
          </div>
        </div>

        {/* ==================================================
            SECTION 1: IMPORT DRIVERS
        ================================================== */}

        <section className="rounded-2xl border border-[#d8cfbf] bg-[#fffdf8] p-5 shadow-[0_3px_12px_rgba(69,58,39,0.045)] sm:p-6">
          <SectionHeader
            icon={FileUp}
            title="Import drivers"
            subtitle="Upload a CSV or Excel file containing your driver records."
            action={
              fileName && (
                <button
                  type="button"
                  onClick={clearImportedFile}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={15} />
                  Clear file
                </button>
              )
            }
          />

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* UPLOAD AREA */}

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed p-7 text-center transition sm:p-10 ${
              isDragging
                ? "border-[#65724b] bg-[#f0f1e5]"
                : fileName
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-[#d9d0bf] bg-[#f7f2e9]/80 hover:border-[#a9b78a] hover:bg-[#f0f1e5]/40"
            }`}
          >
            <div
              className={`mx-auto flex h-13 w-13 items-center justify-center rounded-2xl ${
                fileName
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-[#e3e9d4] text-[#65724b]"
              }`}
            >
              {fileName ? <FileSpreadsheet size={26} /> : <FileUp size={26} />}
            </div>

            {fileName ? (
              <>
                <h3 className="mt-4 font-bold text-[#2f342b]">{fileName}</h3>

                <p className="mt-1 text-sm text-[#797b6f]">
                  {fileRows.length} driver records imported
                </p>
              </>
            ) : (
              <>
                <h3 className="mt-4 font-bold text-[#2f342b]">
                  Drag and drop your driver file here
                </h3>

                <p className="mt-1 text-sm text-[#797b6f]">
                  Supports CSV, XLSX and XLS files
                </p>
              </>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#65724b] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(72,62,42,0.035)] transition hover:bg-[#53613e] focus:outline-none focus:ring-4 focus:ring-[#e3e9d4]"
            >
              <FileUp size={17} />

              {fileName ? "Replace file" : "Browse files"}
            </button>
          </div>

          {importError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {importError}
            </div>
          )}

          {/* COLUMN MAPPING */}

          {fileHeaders.length > 0 && (
            <div className="mt-7">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eee8dc] text-[#64675b]">
                  <Settings2 size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#2f342b]">
                    Map imported columns
                  </h3>

                  <p className="mt-1 text-xs text-[#797b6f]">
                    Select which columns contain the driver's name, unique ID,
                    and type.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    key: "name",
                    label: "Driver name",
                  },
                  {
                    key: "id",
                    label: "Driver ID",
                  },
                  {
                    key: "type",
                    label: "Driver type",
                  },
                ].map((field) => (
                  <SelectField
                    key={field.key}
                    label={field.label}
                    value={columnMapping[field.key]}
                    onChange={(event) =>
                      setColumnMapping((previous) => ({
                        ...previous,
                        [field.key]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select a column</option>

                    {fileHeaders.map((header, index) => (
                      <option key={index} value={String(index)}>
                        {header}
                      </option>
                    ))}
                  </SelectField>
                ))}
              </div>

              {mappingError && (
                <p className="mt-3 text-sm text-red-600">{mappingError}</p>
              )}
            </div>
          )}

          {/* DRIVER PREVIEW */}

          {mappedDrivers.length > 0 && (
            <div className="mt-7">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#2f342b]">Driver preview</h3>

                  <p className="mt-1 text-xs text-[#797b6f]">
                    Review the imported records before generating the schedule.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#939486]"
                  />

                  <input
                    type="text"
                    value={driverSearch}
                    onChange={(event) => setDriverSearch(event.target.value)}
                    placeholder="Search drivers..."
                    className="w-full rounded-xl border border-[#d9d0bf] bg-[#fffdf8] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#65724b] focus:ring-4 focus:ring-[#e3e9d4]"
                  />
                </div>
              </div>

              {/* VALIDATION STATUS */}

              {driverValidation.length === 0 ? (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <Check size={17} />
                  Driver data is valid and ready for scheduling.
                </div>
              ) : (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-bold text-red-700">
                    Found {driverValidation.length} issue(s) in the imported
                    data.
                  </p>

                  <ul className="mt-2 max-h-36 list-inside list-disc space-y-1 overflow-y-auto text-xs text-red-600">
                    {driverValidation.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* DRIVER TABLE */}

              <div className="overflow-hidden rounded-xl border border-[#d9d0bf]">
                <div className="max-h-88 overflow-auto">
                  <table className="w-full min-w-125 border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-[#f5f0e7]">
                      <tr className="border-b border-[#d9d0bf]">
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#797b6f]">
                          #
                        </th>

                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#797b6f]">
                          Name
                        </th>

                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#797b6f]">
                          Driver ID
                        </th>

                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#797b6f]">
                          Type
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredDrivers.map((driver) => (
                        <tr
                          key={driver.rowNumber}
                          className="hover:bg-[#f5f0e7]"
                        >
                          <td className="px-4 py-3 text-[#939486]">
                            {driver.rowNumber - 1}
                          </td>

                          <td className="px-4 py-3 font-semibold text-[#45483d]">
                            {driver.name || (
                              <span className="text-red-500">Missing name</span>
                            )}
                          </td>

                          <td className="px-4 py-3 font-mono text-xs text-[#64675b]">
                            {driver.id || (
                              <span className="text-red-500">Missing ID</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {driver.type ? (
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                                  driver.type === "local"
                                    ? "bg-[#f0f1e5] text-[#4f6037]"
                                    : "bg-[#f2edf3] text-violet-700"
                                }`}
                              >
                                {driver.type}
                              </span>
                            ) : (
                              <span className="text-xs text-red-600">
                                Invalid: {driver.originalType || "Empty"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}

                      {filteredDrivers.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-sm text-[#939486]"
                          >
                            No matching drivers found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="mt-3 text-xs text-[#797b6f]">
                Showing {filteredDrivers.length} of {mappedDrivers.length}{" "}
                drivers
              </p>
            </div>
          )}
        </section>

        {/* ==================================================
            SECTION 2: SCHEDULING CONFIGURATION
        ================================================== */}

        <section className="rounded-2xl border border-[#d8cfbf] bg-[#fffdf8] p-5 shadow-[0_3px_12px_rgba(69,58,39,0.045)] sm:p-6">
          <SectionHeader
            icon={Settings2}
            title="Scheduling configuration"
            subtitle="Configure the rules for assigning driver days off."
          />
          {/* YEAR, MONTH, START DAY */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InputField
              label="Year"
              type="number"
              min={1}
              max={9999}
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            />

            <SelectField
              label="Month"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {MONTHS.map((monthName, index) => (
                <option key={monthName} value={index + 1}>
                  {monthName}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Start scheduling from"
              value={startDay}
              onChange={(event) => setStartDay(Number(event.target.value))}
            >
              {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(
                (day) => (
                  <option key={day} value={day}>
                    Day {day}
                  </option>
                ),
              )}
            </SelectField>
          </div>

          {/* DAYS OFF AND DRIVER CAP */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InputField
              label="Local driver days off"
              type="number"
              min={0}
              max={31}
              value={localDaysOff}
              onChange={(event) => setLocalDaysOff(Number(event.target.value))}
              helper="Days off required for each local driver."
            />

            <InputField
              label="Foreign driver days off"
              type="number"
              min={0}
              max={31}
              value={foreignDaysOff}
              onChange={(event) =>
                setForeignDaysOff(Number(event.target.value))
              }
              helper="Days off required for each foreign driver."
            />

            <InputField
              label="Daily driver cap (%)"
              type="number"
              min={1}
              max={100}
              value={driverCap}
              onChange={(event) => setDriverCap(Number(event.target.value))}
              helper={`Currently allows up to ${dailyCapCount} driver(s) off per day.`}
            />
          </div>

          {/* ================================================== EXCLUDED WEEKDAYS & PUBLIC HOLIDAYS ================================================== */}
          <div className="mt-7 grid grid-cols-1 items-stretch gap-5 border-t border-[#ece5d9] pt-6 lg:grid-cols-2">
            {/* ================================================== EXCLUDED WEEKDAYS ================================================== */}
            <div className="flex h-full flex-col rounded-xl border border-[#d8cfbf] bg-[#faf7f0] p-5">
              <div>
                <h3 className="text-sm font-bold text-[#2f342b]">
                  Excluded weekdays
                </h3>
                <p className="mt-1 text-xs leading-5 text-[#797b6f]">
                  Drivers cannot be assigned OFF on these weekdays.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap content-start gap-2">
                {WEEKDAYS.map((weekday) => {
                  const selected = excludedWeekdays.includes(weekday.value);
                  return (
                    <button
                      key={weekday.value}
                      type="button"
                      onClick={() => toggleWeekday(weekday.value)}
                      aria-pressed={selected}
                      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-semibold transition ${selected ? "border-[#ccd5b5] bg-[#e8ecd9] text-[#4f6037]" : "border-[#d9d0bf] bg-[#fffdf8] text-[#797b6f] hover:border-[#bdb29f] hover:bg-[#f5f0e7]"}`}
                    >
                      {selected && <Check size={14} />} {weekday.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-auto pt-5">
                <p className="text-xs text-[#939486]">
                  {excludedWeekdays.length} of 7 weekdays excluded
                </p>
              </div>
            </div>
            {/* ================================================== PUBLIC HOLIDAYS ================================================== */}
            <div className="flex h-full flex-col rounded-xl border border-[#d8cfbf] bg-[#faf7f0] p-5">
              <div>
                <h3 className="text-sm font-bold text-[#2f342b]">
                  Public holidays
                </h3>
                <p className="mt-1 text-xs leading-5 text-[#797b6f]">
                  Add dates that must be excluded from day-off scheduling.
                </p>
              </div>
              {/* HOLIDAY DATE INPUT */}
              <div className="mt-5 flex flex-wrap items-end gap-3">
                <InputField
                  label="Holiday date"
                  type="date"
                  min={formatDate(year, month, 1)}
                  max={formatDate(year, month, daysInMonth)}
                  value={holidayDate}
                  onChange={(event) => setHolidayDate(event.target.value)}
                  className="min-w-0 flex-1"
                />
                <button
                  type="button"
                  onClick={addPublicHoliday}
                  disabled={!holidayDate}
                  className="inline-flex h-10.5 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#343b2c] px-4 text-sm font-semibold text-white transition hover:bg-[#454d3b] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={16} /> Add holiday
                </button>
              </div>
              {/* ADDED HOLIDAYS */}
              {publicHolidays.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {publicHolidays.map((holiday) => (
                    <div
                      key={holiday}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#e6d5aa] bg-[#fbf3de] py-2 pl-3 pr-2 text-xs font-semibold text-amber-800"
                    >
                      <CalendarDays size={14} /> {holiday}
                      <button
                        type="button"
                        onClick={() => removePublicHoliday(holiday)}
                        aria-label={`Remove holiday ${holiday}`}
                        className="rounded p-0.5 transition hover:bg-amber-100"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs text-[#939486]">
                  No public holidays added.
                </p>
              )}
              <div className="mt-auto pt-5">
                <p className="text-xs text-[#939486]">
                  {publicHolidays.length} public holiday
                  {publicHolidays.length !== 1 ? "s" : ""} added
                </p>
              </div>
            </div>
          </div>
          {/* CAPACITY SUMMARY */}
          <div className="mt-7 grid gap-3 rounded-xl border border-[#dce1ca] bg-[#f0f1e5]/80 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-[#797b6f]">Eligible scheduling days</p>

              <p className="mt-1 text-xl font-bold text-[#2f342b]">
                {eligibleDates.length}
              </p>
            </div>

            <div>
              <p className="text-xs text-[#797b6f]">Required OFF assignments</p>

              <p className="mt-1 text-xl font-bold text-[#2f342b]">
                {totalRequiredDaysOff}
              </p>
            </div>

            <div>
              <p className="text-xs text-[#797b6f]">Available OFF capacity</p>

              <p
                className={`mt-1 text-xl font-bold ${
                  mappedDrivers.length &&
                  totalRequiredDaysOff > availableCapacity
                    ? "text-red-600"
                    : "text-[#2f342b]"
                }`}
              >
                {availableCapacity}
              </p>
            </div>
          </div>
          {/* GENERATE BUTTON */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#ece5d9] pt-6">
            <p className="max-w-xl text-xs leading-5 text-[#797b6f]">
              Each driver will receive the required number of days off without
              exceeding the daily percentage cap. Dates before the selected
              start day remain WORK.
            </p>

            <button
              type="button"
              onClick={handleGenerateSchedule}
              disabled={
                isGenerating ||
                !mappedDrivers.length ||
                driverValidation.length > 0 ||
                Boolean(mappingError)
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#65724b] px-6 py-3 text-sm font-bold text-white shadow-[0_2px_8px_rgba(72,62,42,0.035)] transition hover:bg-[#53613e] focus:outline-none focus:ring-4 focus:ring-[#e3e9d4] disabled:cursor-not-allowed disabled:bg-[#d5cbb9] disabled:shadow-none sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Generating schedule...
                </>
              ) : (
                <>
                  <CalendarDays size={18} />
                  Generate schedule
                </>
              )}
            </button>
          </div>
          {scheduleError && (
            <div
              role="alert"
              className="mt-5 whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
            >
              {scheduleError}
            </div>
          )}
        </section>

        {/* ==================================================
            SECTION 3: GENERATED SCHEDULE
        ================================================== */}

        {schedule && (
          <section
            id="schedule-results"
            className="scroll-mt-24 rounded-2xl border border-[#d8cfbf] bg-[#fffdf8] p-5 shadow-[0_3px_12px_rgba(69,58,39,0.045)] sm:p-6"
          >
            <SectionHeader
              icon={CalendarDays}
              title="Generated schedule"
              subtitle={`${MONTHS[schedule.month - 1]} ${
                schedule.year
              } · ${schedule.rows.length} drivers`}
              action={
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(72,62,42,0.035)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isExporting ? (
                    <RefreshCw size={17} className="animate-spin" />
                  ) : (
                    <Download size={17} />
                  )}

                  {isExporting ? "Exporting..." : "Download Excel"}
                </button>
              }
            />

            {/* RESULT SUMMARY */}

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl bg-[#f5f0e7] p-4">
                <p className="text-xs text-[#797b6f]">Total drivers</p>

                <p className="mt-1 text-xl font-bold text-[#2f342b]">
                  {schedule.summary?.total_drivers ?? schedule.rows.length}
                </p>
              </div>

              <div className="rounded-xl bg-[#f5f0e7] p-4">
                <p className="text-xs text-[#797b6f]">Eligible dates</p>

                <p className="mt-1 text-xl font-bold text-[#2f342b]">
                  {schedule.summary?.eligible_days ?? "—"}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs text-emerald-700">Total OFF assigned</p>

                <p className="mt-1 text-xl font-bold text-emerald-700">
                  {schedule.summary?.total_assigned_days_off ?? "—"}
                </p>
              </div>

              <div className="rounded-xl bg-[#f0f1e5] p-4">
                <p className="text-xs text-[#4f6037]">Daily OFF limit</p>

                <p className="mt-1 text-xl font-bold text-[#4f6037]">
                  {schedule.summary?.max_drivers_off_per_day ?? "—"}
                </p>
              </div>
            </div>

            {/* SEARCH AND FILTER */}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#939486]"
                />

                <input
                  type="text"
                  value={scheduleSearch}
                  onChange={(event) => setScheduleSearch(event.target.value)}
                  placeholder="Search generated schedule..."
                  className="w-full rounded-xl border border-[#d9d0bf] bg-[#fffdf8] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#65724b] focus:ring-4 focus:ring-[#e3e9d4]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="h-3 w-3 rounded-sm bg-emerald-100 ring-1 ring-emerald-200" />
                    WORK
                  </span>

                  <span className="flex items-center gap-1.5 text-red-700">
                    <span className="h-3 w-3 rounded-sm bg-red-100 ring-1 ring-red-200" />
                    OFF
                  </span>
                </div>
              </div>
            </div>

            {/* MONTHLY SCHEDULE TABLE */}

            <div className="relative overflow-hidden rounded-xl border border-[#d9d0bf]">
              <div className="max-h-145 overflow-auto">
                <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
                  <thead className="sticky top-0 z-30">
                    <tr>
                      {schedule.columns.map((column, columnIndex) => {
                        const isDriverColumn = columnIndex < 3;

                        const day = columnIndex - 2;

                        const weekday = !isDriverColumn
                          ? getWeekdayName(schedule.year, schedule.month, day)
                          : null;

                        const dateString = !isDriverColumn
                          ? formatDate(schedule.year, schedule.month, day)
                          : null;

                        const isExcluded =
                          !isDriverColumn && excludedWeekdays.includes(weekday);

                        const isHoliday =
                          !isDriverColumn &&
                          publicHolidays.includes(dateString);

                        return (
                          <th
                            key={columnIndex}
                            className={`border-b border-r border-[#d9d0bf] px-3 py-3 text-center font-bold ${
                              columnIndex === 0
                                ? "sticky left-0 z-40 min-w-44 bg-[#eee8dc] text-left"
                                : columnIndex === 1
                                  ? "sticky left-44 z-40 min-w-28 bg-[#eee8dc] text-left"
                                  : columnIndex === 2
                                    ? "sticky left-72 z-40 min-w-25 bg-[#eee8dc] text-left"
                                    : "min-w-18"
                            } ${
                              isHoliday
                                ? "bg-amber-100 text-amber-800"
                                : isExcluded
                                  ? "bg-[#e7dece] text-[#797b6f]"
                                  : isDriverColumn
                                    ? "text-[#555849]"
                                    : "bg-[#f5f0e7] text-[#555849]"
                            }`}
                          >
                            {isDriverColumn ? (
                              column
                            ) : (
                              <div>
                                <div className="text-sm">{column}</div>

                                <div className="mt-1 text-[10px] font-medium uppercase">
                                  {weekday.slice(0, 3)}
                                </div>
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredScheduleRows.map((row, rowIndex) => (
                      <tr key={`${row[1]}-${rowIndex}`} className="group">
                        {row.map((value, columnIndex) => {
                          const isDriverColumn = columnIndex < 3;

                          const isOff = value === "OFF";

                          const isWork = value === "WORK";

                          const stickyPosition =
                            columnIndex === 0
                              ? "sticky left-0 z-20 min-w-44"
                              : columnIndex === 1
                                ? "sticky left-44 z-20 min-w-28"
                                : columnIndex === 2
                                  ? "sticky left-72 z-20 min-w-25"
                                  : "";

                          return (
                            <td
                              key={columnIndex}
                              className={`border-b border-r border-[#ece5d9] px-3 py-3 text-center ${
                                isDriverColumn
                                  ? `${stickyPosition} bg-[#fffdf8] text-left group-hover:bg-[#f5f0e7]`
                                  : isOff
                                    ? "bg-red-50 font-bold text-red-700"
                                    : isWork
                                      ? "bg-emerald-50 font-medium text-emerald-700"
                                      : "bg-[#fffdf8] text-[#64675b]"
                              } ${
                                columnIndex === 0
                                  ? "font-semibold text-[#45483d]"
                                  : columnIndex === 1
                                    ? "font-mono text-[#797b6f]"
                                    : columnIndex === 2
                                      ? "capitalize text-[#64675b]"
                                      : ""
                              }`}
                            >
                              {value}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {filteredScheduleRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={schedule.columns.length}
                          className="bg-[#fffdf8] px-6 py-12 text-center text-sm text-[#797b6f]"
                        >
                          No matching schedule records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#797b6f]">
                Showing {filteredScheduleRows.length} of {schedule.rows.length}{" "}
                drivers. Scroll horizontally to view the entire month.
              </p>

              <p className="text-xs text-[#797b6f]">
                All {schedule.days_in_month} calendar days are included in the
                export.
              </p>
            </div>
          </section>
        )}

        {/* ==================================================
            FOOTER
        ================================================== */}

        <footer className="pb-5 text-center text-xs text-[#939486]">
          VERDI · Driver Scheduler · Internal workspace
        </footer>
      </main>
    </div>
  );
}
