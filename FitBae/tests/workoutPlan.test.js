import test from "node:test";
import assert from "node:assert/strict";
import {
  WEEK_DAYS,
  normalizeAndValidateWorkoutPlan,
  normalizePrescription,
  substitutePlanExercise,
} from "../src/lib/workoutPlan.js";
import {
  getExerciseAlternatives,
  getExerciseById,
  isExerciseAvailable,
} from "../src/lib/exerciseCatalog.js";
import {
  createWorkoutGenerationContext,
  normalizeFitnessGoal,
  toSafeGenerationProfile,
} from "../src/lib/fitnessConfig.js";

const selectedEquipment = ["dumbbells", "flat_bench", "incline_bench"];

function samplePlan() {
  return {
    schema_version: 2,
    overview: "A simple full-body week.",
    progression: "Add one rep when every set is controlled.",
    safety_note: "Stop for sharp pain or dizziness.",
    weekly_schedule: WEEK_DAYS.map((day, index) => ({
      day,
      rest: index !== 0,
      type: index === 0 ? "Full body" : "Rest",
      focus: index === 0 ? "Balanced strength" : "Recovery",
      estimated_duration_mins: index === 0 ? 45 : 0,
      warmup: index === 0 ? "Five minutes of easy movement." : "",
      cooldown: "Move and breathe comfortably.",
      exercises: index === 0 ? [{
        name: "Dumbbell Bench Press",
        equipment_id: "dumbbells",
        equipment_ids: ["dumbbells", "flat_bench"],
        muscle_group: "Chest",
        movement_pattern: "horizontal_push",
        sets: 3,
        reps: "8-10",
        rest_seconds: 75,
        starting_weight_lbs: 20,
        instructions: ["Set your feet.", "Lower with control.", "Press smoothly."],
        cues: ["Keep the shoulders set."],
        common_mistakes: ["Do not bounce the weights."],
      }] : [],
    })),
  };
}

test("legacy goal aliases resolve to one canonical goal", () => {
  assert.equal(normalizeFitnessGoal("flex"), "flexibility");
  assert.equal(normalizeFitnessGoal("Build Strength"), "strength");
});

test("generation context excludes direct personal identifiers", () => {
  const profile = {
    name: "Private Name",
    email: "private@example.com",
    user_id: "private-id",
    age: 31,
    fitness_goal: "muscle",
    experience_level: "intermediate",
    gym_frequency: 4,
    workout_duration: 60,
    equipment: selectedEquipment,
  };
  const context = createWorkoutGenerationContext(profile);
  const safe = toSafeGenerationProfile(profile);
  assert.equal(context.age_band, "30-44");
  assert.equal("name" in safe, false);
  assert.equal("email" in safe, false);
  assert.equal("user_id" in safe, false);
});

test("plans normalize to stable day and slot identifiers and validate", () => {
  const result = normalizeAndValidateWorkoutPlan(samplePlan(), {
    selectedEquipment,
    expectedFrequency: 1,
  });
  assert.equal(result.valid, true, result.errors.map((issue) => issue.message).join("\n"));
  assert.equal(result.plan.weekly_schedule.length, 7);
  assert.match(result.plan.weekly_schedule[0].day_id, /^day_monday_/);
  assert.match(result.plan.weekly_schedule[0].exercises[0].slot_id, /^slot_/);
});

test("a single exercise can be replaced without changing its prescription", () => {
  const { plan } = normalizeAndValidateWorkoutPlan(samplePlan(), {
    selectedEquipment,
    expectedFrequency: 1,
  });
  const original = plan.weekly_schedule[0].exercises[0];
  const replacement = getExerciseById("incline_dumbbell_bench_press");
  const changed = substitutePlanExercise(plan, {
    dayId: plan.weekly_schedule[0].day_id,
    slotId: original.slot_id,
    replacement,
  });
  const next = changed.weekly_schedule[0].exercises[0];
  assert.equal(next.name, "Incline Dumbbell Bench Press");
  assert.equal(next.sets, original.sets);
  assert.equal(next.reps, original.reps);
  assert.equal(next.slot_id, original.slot_id);
});

test("suggested alternatives honor the selected equipment", () => {
  const alternatives = getExerciseAlternatives(
    "dumbbell_bench_press",
    selectedEquipment,
    { limit: 6 },
  );
  assert.ok(alternatives.length > 0);
  assert.ok(alternatives.every((exercise) => isExerciseAvailable(exercise, selectedEquipment)));
});

test("timed and distance prescriptions keep their real training units", () => {
  assert.deepEqual(
    normalizePrescription({ reps: "30-45 seconds" }),
    { kind: "duration", unit: "seconds", min: 30, max: 45, per_side: false, display: "30-45 seconds" },
  );
  const distance = normalizePrescription({ reps: "400 meters" });
  assert.equal(distance.kind, "distance");
  assert.equal(distance.unit, "meters");
  assert.equal(distance.min, 400);
});
