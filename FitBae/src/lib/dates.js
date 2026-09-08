// Legacy Postgres timestamp-without-zone values in FitBae represent UTC.
// Explicit offsets are preserved; formatting converts exactly once for the viewer.
export function parseTimestamp(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? new Date(value) : null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  let input = value;
  if (typeof input === "string") {
    input = input.trim().replace(" ", "T");
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(input)) input += "Z";
    if (input.includes("T")) input = input.replace(/([+-]\d{2})$/, "$1:00");
  }
  const date = new Date(input);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function normalizeTimeZone(value) {
  if (!value || value === "device") return undefined;
  try { return new Intl.DateTimeFormat("en", { timeZone: value }).resolvedOptions().timeZone; }
  catch { return undefined; }
}

export function userTimeZone(user) {
  return normalizeTimeZone(user?.user_metadata?.fitbae_timezone);
}

export function formatTimestamp(value, options = {}, timeZone) {
  const date = parseTimestamp(value);
  return date ? new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", ...options,
    timeZone: normalizeTimeZone(timeZone),
  }).format(date) : "Time unavailable";
}

export function timestampMs(value) { return parseTimestamp(value)?.getTime() || 0; }

export function mergeMessages(...lists) {
  return [...new Map(lists.flat().filter((item) => item?.id).map((item) => [item.id, item])).values()]
    .sort((a, b) => timestampMs(a.created_at) - timestampMs(b.created_at) || String(a.id).localeCompare(String(b.id)));
}
