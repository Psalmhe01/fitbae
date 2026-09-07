import {
  getExerciseById,
  isExerciseAvailable,
  resolveExercise,
} from "./exerciseCatalog.js";

export const WORKOUT_PLAN_SCHEMA_VERSION = 2;

export const WEEK_DAYS = Object.freeze([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

export const WORKOUT_LIMITS = Object.freeze({
  exercisesPerDay: Object.freeze({ min: 1, max: 16 }),
  sets: Object.freeze({ min: 1, max: 10 }),
  reps: Object.freeze({ min: 1, max: 100 }),
  durationSeconds: Object.freeze({ min: 1, max: 7_200 }),
  restSeconds: Object.freeze({ min: 0, max: 600 }),
  startingWeightLbs: Object.freeze({ min: 0, max: 2_000 }),
  estimatedDurationMinutes: Object.freeze({ min: 0, max: 240 }),
});

const DAY_ALIASES = new Map(
  WEEK_DAYS.flatMap((day) => [
    [day.toLowerCase(), day],
    [day.slice(0, 3).toLowerCase(), day],
  ]),
);

const PRESCRIPTION_KINDS = new Set([
  "reps",
  "duration",
  "distance",
  "interval",
]);

function asText(value, fallback = "", maxLength = 240) {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  const normalized = String(value).replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : fallback;
}

function asFiniteNumber(value) {
  if (typeof value === "string" && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampNumber(value, min, max, fallback, integer = false) {
  const direct = asFiniteNumber(value);
  const embedded =
    direct === null && typeof value === "string"
      ? value.match(/-?\d+(?:\.\d+)?/)?.[0]
      : null;
  const parsed = direct ?? asFiniteNumber(embedded);
  if (parsed === null) return fallback;
  const bounded = Math.min(max, Math.max(min, parsed));
  return integer ? Math.round(bounded) : bounded;
}

function asBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return fallback;
}

function asStringArray(value, maxItems = 10, maxLength = 240) {
  const source = Array.isArray(value) ? value : value ? [value] : [];
  return source
    .map((item) => asText(item, "", maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function uniqueStrings(value) {
  return [...new Set(asStringArray(value, 20, 80))];
}

function titleFromId(value) {
  return asText(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function canonicalDayName(value, fallbackIndex = 0) {
  const text = asText(value).toLowerCase().replace(/[^a-z]/g, "");
  return DAY_ALIASES.get(text) || WEEK_DAYS[fallbackIndex] || WEEK_DAYS[0];
}

function isUsableId(value) {
  return (
    typeof value === "string" &&
    /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value)
  );
}

function hashText(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function slugifyWorkoutValue(value, fallback = "item") {
  const slug = asText(value, "", 160)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

export function createStableWorkoutId(prefix, ...parts) {
  const safePrefix = slugifyWorkoutValue(prefix, "item").replace(/-/g, "_");
  const seed = parts.map((part) => asText(part, "", 160)).join("|");
  const readable = slugifyWorkoutValue(parts.find(Boolean), safePrefix).slice(0, 32);
  return `${safePrefix}_${readable}_${hashText(seed || safePrefix)}`;
}

function normalizePrescriptionKind(value) {
  const kind = asText(value).toLowerCase();
  if (kind === "time" || kind === "seconds") return "duration";
  if (kind === "meters" || kind === "miles") return "distance";
  return PRESCRIPTION_KINDS.has(kind) ? kind : "reps";
}

function parseRange(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  return { min: Math.min(first, second), max: Math.max(first, second) };
}

/**
 * Converts legacy free-text reps and newer typed prescriptions into one safe,
 * display-ready shape. `display` is retained for compatibility with the current UI.
 */
export function normalizePrescription(exercise = {}) {
  const raw =
    exercise.prescription && typeof exercise.prescription === "object"
      ? exercise.prescription
      : {};
  const legacyDisplay = asText(
    raw.display ?? exercise.reps ?? exercise.duration ?? exercise.distance,
    "8-12",
    80,
  );
  const lower = legacyDisplay.toLowerCase();

  let kind = normalizePrescriptionKind(raw.kind ?? raw.type);
  if (/\b(sec|secs|second|seconds|min|mins|minute|minutes)\b/.test(lower)) {
    kind = /\bon\s*\/\s*|\boff\b|interval/.test(lower)
      ? "interval"
      : "duration";
  } else if (/\b(meter|meters|metre|metres|mile|miles|km)\b/.test(lower)) {
    kind = "distance";
  }

  const range = parseRange(lower);
  const firstNumber = lower.match(/\d+(?:\.\d+)?/);
  let min = asFiniteNumber(raw.min ?? raw.minimum);
  let max = asFiniteNumber(raw.max ?? raw.maximum);

  if (min === null) min = range?.min ?? (firstNumber ? Number(firstNumber[0]) : null);
  if (max === null) max = range?.max ?? min;

  let unit = asText(raw.unit).toLowerCase();
  if (!unit) {
    if (kind === "duration" || kind === "interval") {
      unit = /\bmin/.test(lower) ? "minutes" : "seconds";
    } else if (kind === "distance") {
      if (/\bkm\b/.test(lower)) unit = "kilometers";
      else if (/\bmile/.test(lower)) unit = "miles";
      else unit = "meters";
    } else {
      unit = "reps";
    }
  }

  const maxTarget =
    kind === "reps"
      ? WORKOUT_LIMITS.reps.max
      : kind === "duration" || kind === "interval"
        ? unit === "minutes"
          ? WORKOUT_LIMITS.durationSeconds.max / 60
          : WORKOUT_LIMITS.durationSeconds.max
        : 100_000;
  const minTarget = kind === "reps" ? WORKOUT_LIMITS.reps.min : 0;

  if (min !== null) min = Math.min(maxTarget, Math.max(minTarget, min));
  if (max !== null) max = Math.min(maxTarget, Math.max(min ?? minTarget, max));

  return {
    kind,
    unit,
    min,
    max,
    per_side: asBoolean(raw.per_side, /per\s+(side|leg|arm)/i.test(lower)),
    display: legacyDisplay,
  };
}

function catalogValue(entry, camelKey, snakeKey, fallback) {
  return entry?.[camelKey] ?? entry?.[snakeKey] ?? fallback;
}

/** Normalize one generated or catalog exercise while retaining legacy fields. */
export function normalizePlanExercise(exercise = {}, context = {}) {
  const source = exercise && typeof exercise === "object" ? exercise : {};
  const catalogExercise = resolveExercise(source);
  const dayId = asText(context.dayId, "day");
  const slotIndex = clampNumber(context.slotIndex, 0, 99, 0, true);
  const rawName = asText(source.name, catalogExercise?.name || "Untitled exercise", 100);
  const suppliedExerciseId =
    source.exercise_id || source.exerciseId || source.canonical_exercise_id;
  const exerciseId =
    catalogExercise?.id ||
    (isUsableId(suppliedExerciseId) ? suppliedExerciseId : null) ||
    createStableWorkoutId("exercise", rawName);
  const suppliedSlotId =
    source.slot_id ||
    source.slotId ||
    (suppliedExerciseId && source.id ? source.id : null);
  const slotId = isUsableId(suppliedSlotId)
    ? suppliedSlotId
    : createStableWorkoutId("slot", dayId, String(slotIndex + 1));

  const catalogEquipment = catalogValue(
    catalogExercise,
    "equipmentIds",
    "equipment_ids",
    [],
  );
  const suppliedEquipment = source.equipment_ids ??
    source.equipmentIds ??
    (source.equipment_id ? [source.equipment_id] : []);
  const equipmentIds = uniqueStrings([
    ...(Array.isArray(suppliedEquipment) ? suppliedEquipment : [suppliedEquipment]),
    ...(Array.isArray(catalogEquipment) ? catalogEquipment : []),
  ]);
  const prescription = normalizePrescription(source);
  const instructions = asStringArray(
    source.instructions ?? catalogExercise?.instructions,
    10,
    280,
  );

  const cues = asStringArray(
    source.cues ?? source.form_cues ?? catalogExercise?.cues,
    8,
    180,
  );

  return {
    id: slotId,
    slot_id: slotId,
    slotId,
    exercise_id: exerciseId,
    exerciseId,
    name: rawName,
    movement_pattern: asText(
      source.movement_pattern ??
        catalogValue(catalogExercise, "movementPattern", "movement_pattern", "other"),
      "other",
      60,
    ).toLowerCase(),
    muscle_group: asText(
      source.muscle_group ??
        catalogValue(catalogExercise, "primaryMuscle", "primary_muscle", "General"),
      "General",
      60,
    ),
    secondary_muscles: uniqueStrings(
      source.secondary_muscles ??
        catalogValue(catalogExercise, "secondaryMuscles", "secondary_muscles", []),
    ),
    difficulty: asText(source.difficulty ?? catalogExercise?.difficulty, "intermediate", 24),
    equipment_id: equipmentIds[0] || null,
    equipment_ids: equipmentIds,
    equipment: asText(source.equipment, "", 160),
    starting_weight_lbs: clampNumber(
      source.starting_weight_lbs,
      WORKOUT_LIMITS.startingWeightLbs.min,
      WORKOUT_LIMITS.startingWeightLbs.max,
      0,
    ),
    sets: clampNumber(
      source.sets,
      WORKOUT_LIMITS.sets.min,
      WORKOUT_LIMITS.sets.max,
      3,
      true,
    ),
    reps: prescription.display,
    prescription,
    rest_seconds: clampNumber(
      source.rest_seconds ?? source.rest,
      WORKOUT_LIMITS.restSeconds.min,
      WORKOUT_LIMITS.restSeconds.max,
      60,
      true,
    ),
    tempo: asText(source.tempo, "", 32),
    instructions,
    why: asText(source.why ?? source.rationale, "", 280),
    cues,
    form_cues: cues,
    common_mistakes: asStringArray(
      source.common_mistakes ?? source.commonMistakes ??
        catalogValue(catalogExercise, "commonMistakes", "common_mistakes", []),
      8,
      180,
    ),
    note: asText(source.note, "", 280),
    substitution_tags: uniqueStrings(
      source.substitution_tags ?? [
        source.movement_pattern ??
          catalogValue(catalogExercise, "movementPattern", "movement_pattern", ""),
        source.muscle_group ??
          catalogValue(catalogExercise, "primaryMuscle", "primary_muscle", ""),
        source.difficulty ?? catalogExercise?.difficulty,
      ],
    ),
  };
}

export function normalizePartnerFinisher(value, dayId = "day") {
  if (!value) return null;
  const source = typeof value === "object" ? value : { instructions: [value] };
  const name = asText(source.name ?? source.title, "Partner finisher", 100);
  const instructions = asStringArray(
    source.instructions ?? source.steps ?? source.description,
    10,
    280,
  );
  if (!instructions.length && !name) return null;
  const equipmentIds = uniqueStrings(
    source.equipment_ids ?? source.equipmentIds ??
      (source.equipment_id ? [source.equipment_id] : []),
  );

  return {
    id: isUsableId(source.id)
      ? source.id
      : createStableWorkoutId("finisher", dayId, name),
    name,
    format: asText(source.format, "together", 60),
    duration_minutes: clampNumber(
      source.duration_minutes ?? source.duration_mins,
      1,
      60,
      5,
      true,
    ),
    equipment_ids: equipmentIds,
    instructions,
    solo_alternative: asText(source.solo_alternative, "", 280),
  };
}

function normalizeDay(rawDay, dayName, dayIndex) {
  const source = rawDay && typeof rawDay === "object" ? rawDay : {};
  const rest = asBoolean(source.rest, !rawDay);
  const dayId = isUsableId(source.day_id || source.dayId || source.id)
    ? source.day_id || source.dayId || source.id
    : createStableWorkoutId("day", dayName);
  const sourceExercises = Array.isArray(source.exercises) ? source.exercises : [];
  const exercises = rest
    ? []
    : sourceExercises
        .slice(0, WORKOUT_LIMITS.exercisesPerDay.max)
        .map((exercise, slotIndex) =>
          normalizePlanExercise(exercise, { dayId, slotIndex }),
        );
  const warmupSteps = asStringArray(source.warmup_steps ?? source.warmup, 8, 280);
  const cooldownSteps = asStringArray(
    source.cooldown_steps ?? source.cooldown,
    8,
    280,
  );
  const partnerFinisher = rest
    ? null
    : normalizePartnerFinisher(
        source.partner_finisher ?? source.shared_finisher,
        dayId,
      );

  return {
    id: dayId,
    day_id: dayId,
    dayId,
    day: dayName,
    day_index: dayIndex,
    type: asText(source.type, rest ? "Recovery" : "Workout", 80),
    rest,
    focus: asText(source.focus, rest ? "Recovery" : "General fitness", 140),
    why: asText(source.why ?? source.rationale, "", 280),
    estimated_duration_mins: clampNumber(
      source.estimated_duration_mins,
      WORKOUT_LIMITS.estimatedDurationMinutes.min,
      WORKOUT_LIMITS.estimatedDurationMinutes.max,
      rest ? 0 : 45,
      true,
    ),
    warmup: warmupSteps.join(" "),
    warmup_steps: warmupSteps,
    exercises,
    partner_finisher: partnerFinisher,
    shared_finisher: partnerFinisher,
    cooldown: cooldownSteps.join(" "),
    cooldown_steps: cooldownSteps,
  };
}

function unwrapPlan(input) {
  if (!input || typeof input !== "object") return {};
  return input.plan_json && typeof input.plan_json === "object"
    ? { ...input.plan_json, id: input.plan_json.id || input.id }
    : input;
}

/**
 * Returns a safe seven-day plan. Missing days become explicit recovery days;
 * duplicate/unknown day labels cannot create duplicate day IDs.
 */
export function normalizeWorkoutPlan(input) {
  const source = unwrapPlan(input);
  const sourceSchedule = Array.isArray(source.weekly_schedule)
    ? source.weekly_schedule
    : Array.isArray(source.days)
      ? source.days
      : [];
  const byDay = new Map();

  sourceSchedule.slice(0, 14).forEach((day, index) => {
    const dayName = canonicalDayName(day?.day ?? day?.name, index);
    if (!byDay.has(dayName)) byDay.set(dayName, day);
  });

  const normalized = {
    schema_version: WORKOUT_PLAN_SCHEMA_VERSION,
    goal_id: asText(
      source.goal_id ?? source.fitness_goal ?? source.goal,
      "maintain",
      60,
    ).toLowerCase(),
    goal_label: asText(
      source.goal_label,
      titleFromId(source.goal_id ?? source.fitness_goal ?? source.goal ?? "Maintain"),
      100,
    ),
    overview: asText(source.overview, "", 600),
    progression: asText(source.progression, "", 600),
    safety_note: asText(source.safety_note, "", 600),
    weekly_schedule: WEEK_DAYS.map((dayName, dayIndex) =>
      normalizeDay(byDay.get(dayName), dayName, dayIndex),
    ),
  };

  if (isUsableId(source.id || source.plan_id)) {
    normalized.id = source.id || source.plan_id;
  }
  const weekStart = asText(source.week_start, "", 32);
  if (weekStart) normalized.week_start = weekStart;

  return normalized;
}

function validationIssue(code, path, message, severity = "error") {
  return { code, path, message, severity };
}

/** Validate either a generated plan or a plan returned by normalizeWorkoutPlan. */
export function validateWorkoutPlan(input, options = {}) {
  const source = unwrapPlan(input);
  const schedule = source.weekly_schedule;
  const errors = [];
  const warnings = [];
  const add = (issue) => {
    (issue.severity === "warning" ? warnings : errors).push(issue);
  };

  if (!Array.isArray(schedule)) {
    add(validationIssue("schedule.required", "weekly_schedule", "Weekly schedule must be an array."));
    return { valid: false, errors, warnings };
  }
  if (
    source.schema_version !== undefined &&
    asFiniteNumber(source.schema_version) !== WORKOUT_PLAN_SCHEMA_VERSION
  ) {
    add(
      validationIssue(
        "schema.version",
        "schema_version",
        `Expected workout schema version ${WORKOUT_PLAN_SCHEMA_VERSION}.`,
        "warning",
      ),
    );
  }
  if (!asText(source.goal_id ?? source.fitness_goal ?? source.goal)) {
    add(
      validationIssue(
        "goal.missing",
        "goal_id",
        "Plan should identify the fitness goal it was built for.",
        "warning",
      ),
    );
  }
  if (schedule.length !== WEEK_DAYS.length) {
    add(
      validationIssue(
        "schedule.length",
        "weekly_schedule",
        "A workout plan must contain exactly seven days.",
      ),
    );
  }

  const seenDays = new Set();
  const seenDayIds = new Set();
  const seenSlotIds = new Set();
  let activeDayCount = 0;

  schedule.forEach((day, dayIndex) => {
    const path = `weekly_schedule[${dayIndex}]`;
    if (!day || typeof day !== "object") {
      add(validationIssue("day.invalid", path, "Each day must be an object."));
      return;
    }
    const dayName = canonicalDayName(day.day, dayIndex);
    const rawDayName = asText(day.day).toLowerCase();
    if (!DAY_ALIASES.has(rawDayName)) {
      add(
        validationIssue(
          "day.name",
          `${path}.day`,
          "Day must be Monday through Sunday.",
        ),
      );
    } else if (dayName !== WEEK_DAYS[dayIndex]) {
      add(
        validationIssue(
          "day.order",
          `${path}.day`,
          "Days must be ordered Monday through Sunday.",
        ),
      );
    }
    if (seenDays.has(dayName)) {
      add(validationIssue("day.duplicate", `${path}.day`, `${dayName} appears more than once.`));
    }
    seenDays.add(dayName);

    const dayId = day.day_id || day.dayId || day.id;
    if (!isUsableId(dayId)) {
      add(validationIssue("day.id", `${path}.day_id`, "Day must have a stable ID."));
    } else if (seenDayIds.has(dayId)) {
      add(validationIssue("day.id_duplicate", `${path}.day_id`, "Day IDs must be unique."));
    }
    if (dayId) seenDayIds.add(dayId);

    const rest = asBoolean(day.rest);
    const exercises = day.exercises;
    if (!Array.isArray(exercises)) {
      add(validationIssue("exercises.required", `${path}.exercises`, "Exercises must be an array."));
      return;
    }
    if (rest && exercises.length > 0) {
      add(
        validationIssue(
          "rest.exercises",
          `${path}.exercises`,
          "Recovery days should not contain logged workout exercises.",
          "warning",
        ),
      );
    }
    if (!rest) {
      activeDayCount += 1;
      if (
        exercises.length < WORKOUT_LIMITS.exercisesPerDay.min ||
        exercises.length > WORKOUT_LIMITS.exercisesPerDay.max
      ) {
        add(
          validationIssue(
            "exercises.length",
            `${path}.exercises`,
            `Active days need ${WORKOUT_LIMITS.exercisesPerDay.min}-${WORKOUT_LIMITS.exercisesPerDay.max} exercises.`,
          ),
        );
      }
    }

    const estimatedDuration = asFiniteNumber(day.estimated_duration_mins);
    if (
      estimatedDuration !== null &&
      (estimatedDuration < WORKOUT_LIMITS.estimatedDurationMinutes.min ||
        estimatedDuration > WORKOUT_LIMITS.estimatedDurationMinutes.max)
    ) {
      add(
        validationIssue(
          "duration.bounds",
          `${path}.estimated_duration_mins`,
          "Estimated duration must be between 0 and 240 minutes.",
        ),
      );
    }

    const partnerFinisher = day.partner_finisher ?? day.shared_finisher;
    if (partnerFinisher !== undefined && partnerFinisher !== null) {
      if (typeof partnerFinisher !== "object" || Array.isArray(partnerFinisher)) {
        add(
          validationIssue(
            "finisher.invalid",
            `${path}.partner_finisher`,
            "Partner finisher must be an object or null.",
          ),
        );
      } else {
        const finisherDuration = asFiniteNumber(
          partnerFinisher.duration_minutes ?? partnerFinisher.duration_mins,
        );
        if (
          finisherDuration === null ||
          finisherDuration < 1 ||
          finisherDuration > 60
        ) {
          add(
            validationIssue(
              "finisher.duration",
              `${path}.partner_finisher.duration_minutes`,
              "Partner finisher duration must be 1-60 minutes.",
            ),
          );
        }
        if (!asStringArray(partnerFinisher.instructions).length) {
          add(
            validationIssue(
              "finisher.instructions",
              `${path}.partner_finisher.instructions`,
              "Partner finisher needs at least one instruction.",
              "warning",
            ),
          );
        }
        if (options.selectedEquipment != null) {
          const available = new Set(uniqueStrings(options.selectedEquipment));
          const missing = uniqueStrings(partnerFinisher.equipment_ids).some(
            (equipmentId) => !available.has(equipmentId),
          );
          if (missing) {
            add(
              validationIssue(
                "finisher.equipment_unavailable",
                `${path}.partner_finisher.equipment_ids`,
                "Partner finisher requires unavailable equipment.",
              ),
            );
          }
        }
      }
    }

    exercises.forEach((exercise, exerciseIndex) => {
      const exercisePath = `${path}.exercises[${exerciseIndex}]`;
      if (!exercise || typeof exercise !== "object") {
        add(validationIssue("exercise.invalid", exercisePath, "Exercise must be an object."));
        return;
      }
      if (!asText(exercise.name)) {
        add(validationIssue("exercise.name", `${exercisePath}.name`, "Exercise name is required."));
      }
      const exerciseId =
        exercise.exercise_id || exercise.exerciseId || exercise.canonical_exercise_id;
      if (!isUsableId(exerciseId)) {
        add(
          validationIssue(
            "exercise.id",
            `${exercisePath}.exercise_id`,
            "Exercise must have a stable catalog or custom ID.",
          ),
        );
      } else if (!getExerciseById(exerciseId) && options.requireCatalogExercises) {
        add(
          validationIssue(
            "exercise.unknown",
            `${exercisePath}.exercise_id`,
            "Exercise is not in the approved catalog.",
          ),
        );
      } else if (!getExerciseById(exerciseId)) {
        add(
          validationIssue(
            "exercise.unknown",
            `${exercisePath}.exercise_id`,
            "Exercise is not in the curated catalog; review its instructions before use.",
            "warning",
          ),
        );
      }

      const slotId = exercise.slot_id || exercise.slotId || exercise.id;
      if (!isUsableId(slotId)) {
        add(validationIssue("slot.id", `${exercisePath}.slot_id`, "Exercise slot needs a stable ID."));
      } else if (seenSlotIds.has(slotId)) {
        add(validationIssue("slot.id_duplicate", `${exercisePath}.slot_id`, "Slot IDs must be unique."));
      }
      if (slotId) seenSlotIds.add(slotId);

      const sets = asFiniteNumber(exercise.sets);
      if (
        sets === null ||
        !Number.isInteger(sets) ||
        sets < WORKOUT_LIMITS.sets.min ||
        sets > WORKOUT_LIMITS.sets.max
      ) {
        add(validationIssue("sets.bounds", `${exercisePath}.sets`, "Sets must be a whole number from 1 to 10."));
      }
      const restSeconds = asFiniteNumber(exercise.rest_seconds);
      if (
        restSeconds === null ||
        restSeconds < WORKOUT_LIMITS.restSeconds.min ||
        restSeconds > WORKOUT_LIMITS.restSeconds.max
      ) {
        add(validationIssue("rest.bounds", `${exercisePath}.rest_seconds`, "Rest must be 0-600 seconds."));
      }
      const weight = asFiniteNumber(exercise.starting_weight_lbs);
      if (
        weight !== null &&
        (weight < WORKOUT_LIMITS.startingWeightLbs.min ||
          weight > WORKOUT_LIMITS.startingWeightLbs.max)
      ) {
        add(
          validationIssue(
            "weight.bounds",
            `${exercisePath}.starting_weight_lbs`,
            "Starting weight must be between 0 and 2,000 lb.",
          ),
        );
      }

      if (exercise.prescription !== undefined) {
        const prescription = exercise.prescription;
        if (
          !prescription ||
          typeof prescription !== "object" ||
          !PRESCRIPTION_KINDS.has(
            normalizePrescriptionKind(prescription.kind ?? prescription.type),
          )
        ) {
          add(
            validationIssue(
              "prescription.invalid",
              `${exercisePath}.prescription`,
              "Prescription must identify a supported reps, duration, distance, or interval target.",
            ),
          );
        } else {
          const minimum = asFiniteNumber(prescription.min);
          const maximum = asFiniteNumber(prescription.max);
          if (minimum !== null && maximum !== null && maximum < minimum) {
            add(
              validationIssue(
                "prescription.range",
                `${exercisePath}.prescription`,
                "Prescription maximum cannot be less than its minimum.",
              ),
            );
          }
        }
      }

      const catalogExercise = getExerciseById(exerciseId);
      const requiredEquipment = uniqueStrings(
        exercise.equipment_ids ??
          (exercise.equipment_id
            ? [exercise.equipment_id]
            : catalogValue(catalogExercise, "equipmentIds", "equipment_ids", [])),
      );
      const availableEquipment =
        options.selectedEquipment == null
          ? null
          : new Set(uniqueStrings(options.selectedEquipment));
      if (
        availableEquipment &&
        requiredEquipment.some((equipmentId) => !availableEquipment.has(equipmentId))
      ) {
        add(
          validationIssue(
            "equipment.unavailable",
            `${exercisePath}.equipment_ids`,
            "Exercise requires equipment outside the selected equipment list.",
          ),
        );
      } else if (
        options.selectedEquipment !== undefined &&
        catalogExercise &&
        !isExerciseAvailable(catalogExercise, options.selectedEquipment)
      ) {
        add(
          validationIssue(
            "equipment.unavailable",
            `${exercisePath}.equipment_ids`,
            "Exercise is not compatible with the selected equipment.",
          ),
        );
      }
      if (!asStringArray(exercise.instructions).length) {
        add(
          validationIssue(
            "instructions.missing",
            `${exercisePath}.instructions`,
            "Add form instructions before this exercise is prescribed.",
            "warning",
          ),
        );
      }
    });
  });

  if (!options.allowAllRest && (activeDayCount < 1 || activeDayCount > 6)) {
    add(
      validationIssue(
        "schedule.active_days",
        "weekly_schedule",
        "A weekly plan must contain between one and six active workout days.",
      ),
    );
  }

  if (options.expectedFrequency !== undefined) {
    const expected = clampNumber(options.expectedFrequency, 1, 6, null, true);
    if (expected !== null && activeDayCount !== expected) {
      add(
        validationIssue(
          "schedule.frequency",
          "weekly_schedule",
          `Plan has ${activeDayCount} active days; expected ${expected}.`,
        ),
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Normalize first, then validate the exact object consumers will render. */
export function normalizeAndValidateWorkoutPlan(input, options = {}) {
  const plan = normalizeWorkoutPlan(input);
  const validation = validateWorkoutPlan(plan, options);
  return { plan, ...validation };
}

export function findPlanExercise(plan, dayId, slotId) {
  const schedule = plan?.weekly_schedule;
  if (!Array.isArray(schedule)) return null;
  const day = schedule.find(
    (candidate) => candidate.day_id === dayId || candidate.day === dayId,
  );
  if (!day) return null;
  const exercise = day.exercises?.find(
    (candidate) => candidate.slot_id === slotId || candidate.exercise_id === slotId,
  );
  return exercise ? { day, exercise } : null;
}

/**
 * Immutably swaps a plan slot. Programming is retained by default, while load is
 * reset unless the caller explicitly supplies a replacement starting weight.
 */
export function substitutePlanExercise(
  plan,
  { dayId, slotId, replacement, preservePrescription = true } = {},
) {
  if (!replacement) return plan;
  const schedule = plan?.weekly_schedule;
  if (!Array.isArray(schedule)) return plan;
  let changed = false;

  const weeklySchedule = schedule.map((day) => {
    if (day.day_id !== dayId && day.day !== dayId) return day;
    const exercises = (day.exercises || []).map((exercise, slotIndex) => {
      if (exercise.slot_id !== slotId && exercise.exercise_id !== slotId) return exercise;
      const replacementSource =
        typeof replacement === "string"
          ? resolveExercise(replacement) || { name: replacement }
          : replacement;
      const normalized = normalizePlanExercise(replacementSource, {
        dayId: day.day_id,
        slotIndex,
      });
      changed = true;
      return {
        ...normalized,
        slot_id: exercise.slot_id,
        ...(preservePrescription
          ? {
              sets: exercise.sets,
              reps: exercise.reps,
              prescription: exercise.prescription,
              rest_seconds: exercise.rest_seconds,
              tempo: exercise.tempo,
            }
          : {}),
        starting_weight_lbs:
          replacementSource?.starting_weight_lbs === undefined
            ? 0
            : normalized.starting_weight_lbs,
        substituted_from_exercise_id:
          exercise.substituted_from_exercise_id || exercise.exercise_id,
      };
    });
    return exercises === day.exercises ? day : { ...day, exercises };
  });

  return changed ? { ...plan, weekly_schedule: weeklySchedule } : plan;
}
