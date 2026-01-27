export const MONTHS = [
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

export const WEEKDAYS = [
  { label: "Mon", value: "monday" },
  { label: "Tue", value: "tuesday" },
  { label: "Wed", value: "wednesday" },
  { label: "Thu", value: "thursday" },
  { label: "Fri", value: "friday" },
  { label: "Sat", value: "saturday" },
  { label: "Sun", value: "sunday" },
];

export function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export function normalizeKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

export function normalizeType(v) {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  if (s.includes("over")) return "overseas";
  if (s.includes("local")) return "local";
  if (s === "o") return "overseas";
  if (s === "l") return "local";
  return "";
}

export function guessNameColumn(headers) {
  const lower = (headers || []).map((h) =>
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
  return idx2 >= 0 ? headers[idx2] : headers?.[0] || "";
}

export function guessByAliases(headers, aliases) {
  const hs = headers || [];
  const norm = hs.map((h) => normalizeKey(h));
  const targets = (aliases || []).map((a) => normalizeKey(a));
  const idx = norm.findIndex((k) => targets.includes(k));
  return idx >= 0 ? hs[idx] : "";
}
