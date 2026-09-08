import { parseTimestamp } from "./dates.js";

export function restoreSessionClock(draft, now = Date.now()) {
  const startedAt = Number(draft?.startedAt) || now;
  const saved = Math.max(0, Number(draft?.elapsedSeconds) || 0);
  const since = Number(draft?.updatedAt);
  const elapsedBeforeResume = draft?.paused ? saved
    : draft && Number.isFinite(since) ? saved + Math.max(0, (now - since) / 1000)
    : Math.max(0, (now - startedAt) / 1000);
  return { startedAt, elapsedBeforeResume, runningSince: now };
}

export function elapsedTrainingSeconds(clock, now = Date.now()) {
  return Math.max(0, Math.floor(clock.elapsedBeforeResume + (now - clock.runningSince) / 1000));
}

export function repVolume(log) {
  if (log.skipped || (log.actual_unit && log.actual_unit !== "reps")) return 0;
  return Math.max(0, Number(log.weight_lbs) || 0) * Math.max(0, Number(log.actual_reps) || 0);
}

export function personalBests(sessions) {
  const best = new Map();
  for (const session of sessions) for (const log of session.exercise_logs || []) {
    if (log.skipped || (log.actual_unit && log.actual_unit !== "reps") || Number(log.actual_reps) <= 0 || Number(log.weight_lbs) <= 0) continue;
    const key = `${log.exercise_name}:${log.equipment_id || ""}`;
    const previous = best.get(key);
    if (!previous || Number(log.weight_lbs) > previous.weight || (Number(log.weight_lbs) === previous.weight && Number(log.actual_reps) > previous.reps)) {
      best.set(key, { key, name: log.exercise_name, weight: Number(log.weight_lbs), reps: Number(log.actual_reps), date: session.finished_at });
    }
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
}

export function csvCell(value) {
  let text = String(value ?? "");
  // Spreadsheet programs can execute formulas even in quoted CSV cells.
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function sessionsCsv(sessions) {
  const rows = [["Finished (UTC)", "Workout", "Minutes", "Exercise", "Set", "Value", "Unit", "Weight (lb)", "Skipped", "Session note"]];
  for (const session of sessions) {
    const logs = session.exercise_logs?.length ? session.exercise_logs : [{}];
    for (const log of logs) rows.push([
      parseTimestamp(session.finished_at)?.toISOString() || "", session.workout_type,
      Math.round((session.duration_seconds || 0) / 60), log.exercise_name,
      log.set_number, log.actual_value ?? log.actual_reps, log.actual_unit || "reps",
      log.weight_lbs, log.skipped === undefined ? "" : log.skipped ? "yes" : "no", session.notes,
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
