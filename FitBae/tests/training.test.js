import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTimestamp, formatTimestamp, mergeMessages, normalizeTimeZone } from "../src/lib/dates.js";
import { elapsedTrainingSeconds, restoreSessionClock, personalBests, repVolume, sessionsCsv, csvCell } from "../src/lib/training.js";

test("timestamps convert explicit offsets and legacy UTC exactly once", () => {
  for (const value of ["2026-09-08T18:30:00Z", "2026-09-08T13:30:00-05:00", "2026-09-08 18:30:00", "2026-09-08T18:30:00+00"]) assert.equal(parseTimestamp(value).toISOString(), "2026-09-08T18:30:00.000Z");
  assert.equal(parseTimestamp("not a date"), null);
  assert.equal(parseTimestamp(null), null);
  assert.equal(parseTimestamp("2026-09-08").toISOString(), "2026-09-08T00:00:00.000Z");
  assert.equal(normalizeTimeZone("fake/zone"), undefined);
  assert.match(formatTimestamp("2026-09-08T18:30:00Z", { hour12: false }, "America/Chicago"), /13:30/);
  assert.match(formatTimestamp("2026-01-08T18:30:00Z", { hour12: false }, "America/Chicago"), /12:30/);
  assert.match(formatTimestamp("2026-09-08T18:30:00Z", { hour12: false }, "Africa/Lagos"), /19:30/);
});

test("message refreshes and realtime events merge without duplicates in chronological order", () => {
  const messages = mergeMessages([{ id: "b", created_at: "2026-09-08T12:00:00Z", seen: false }], [{ id: "a", created_at: "2026-09-08T11:00:00Z" }, { id: "b", created_at: "2026-09-08T12:00:00Z", seen: true }]);
  assert.deepEqual(messages.map((m) => m.id), ["a", "b"]);
  assert.equal(messages[1].seen, true);
});

test("pausing excludes time away without rewriting the original workout start", () => {
  const clock = restoreSessionClock({ startedAt: 1000, elapsedSeconds: 300, updatedAt: 301000, paused: true }, 1_000_000);
  assert.equal(clock.startedAt, 1000);
  assert.equal(elapsedTrainingSeconds(clock, 1_010_000), 310);
  const reloaded = restoreSessionClock({ startedAt: 1000, elapsedSeconds: 310, updatedAt: 1_010_000, paused: false }, 1_020_000);
  assert.equal(elapsedTrainingSeconds(reloaded, 1_025_000), 325);
  assert.equal(reloaded.startedAt, 1000);
});

test("best sets and volume exclude skipped, timed and distance logs", () => {
  const logs = [
    { exercise_name: "Squat", actual_unit: "reps", actual_reps: 8, weight_lbs: 25 },
    { exercise_name: "Squat", actual_unit: "reps", actual_reps: 10, weight_lbs: 25 },
    { exercise_name: "Squat", actual_unit: "reps", actual_reps: 6, weight_lbs: 100, skipped: true },
    { exercise_name: "Carry", actual_unit: "meters", actual_reps: 20, weight_lbs: 50 },
    { exercise_name: "Invalid data", actual_unit: "reps", actual_reps: "invalid", weight_lbs: 50 },
  ];
  assert.equal(logs.reduce((sum, log) => sum + repVolume(log), 0), 450);
  assert.equal(personalBests([{ exercise_logs: logs }]).length, 1);
  assert.equal(personalBests([{ exercise_logs: logs }])[0].reps, 10);
});

test("CSV exports neutralize formulas and quote commas, quotes and newlines", () => {
  assert.equal(csvCell('=HYPERLINK("evil")'), '"\'=HYPERLINK(""evil"")"');
  assert.equal(csvCell("hello,\nworld"), '"hello,\nworld"');
  const csv = sessionsCsv([{ workout_type: "=unsafe", finished_at: "2026-09-08T18:00:00Z", duration_seconds: 120, notes: "a,b", exercise_logs: [{ exercise_name: "Squat", actual_reps: 8 }] }]);
  assert.match(csv, /'=unsafe/);
  assert.match(csv, /"a,b"/);
});
