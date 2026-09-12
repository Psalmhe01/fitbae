import { equipmentLibrary } from "./equipmentLibrary.js";
import { normalizePrescription } from "./workoutPlan.js";

export const WEEK_DAYS = Object.freeze([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

export const FITNESS_GOALS = Object.freeze({
  muscle: Object.freeze({
    id: "muscle",
    label: "Build muscle",
    guidance:
      "Prioritize controlled hypertrophy work, mostly 6-15 reps, progressive overload, and adequate recovery.",
  }),
  strength: Object.freeze({
    id: "strength",
    label: "Increase strength",
    guidance:
      "Prioritize technically sound compound patterns, longer rests, submaximal loading, and gradual progression.",
  }),
  lose: Object.freeze({
    id: "lose",
    label: "Lose weight",
    guidance:
      "Use sustainable full-body resistance training with moderate-density conditioning; never promise a rate of weight loss.",
  }),
  endurance: Object.freeze({
    id: "endurance",
    label: "Increase endurance",
    guidance:
      "Build work capacity progressively with moderate loads, higher repetitions, short rests, and scalable finishers.",
  }),
  flexibility: Object.freeze({
    id: "flexibility",
    label: "Improve flexibility",
    guidance:
      "Combine controlled strength through range, mobility work, and comfortable stretches without forcing painful positions.",
  }),
  maintain: Object.freeze({
    id: "maintain",
    label: "Maintain fitness",
    guidance:
      "Use a balanced, repeatable blend of strength, movement quality, and conditioning.",
  }),
});

export const FITNESS_GOAL_OPTIONS = Object.freeze(
  Object.values(FITNESS_GOALS).map(({ id, label }) => ({ value: id, label })),
);

const GOAL_ALIASES = Object.freeze({
  "build muscle": "muscle",
  hypertrophy: "muscle",
  "increase strength": "strength",
  "build strength": "strength",
  "lose weight": "lose",
  weight_loss: "lose",
  weightloss: "lose",
  flex: "flexibility",
  mobility: "flexibility",
  "improve flexibility": "flexibility",
  "increase endurance": "endurance",
  cardio: "endurance",
  "maintain fitness": "maintain",
  maintenance: "maintain",
});

export const EXPERIENCE_LEVELS = Object.freeze({
  beginner: Object.freeze({
    id: "beginner",
    label: "Beginner",
    guidance:
      "Favor simple, stable movements, conservative trial loads, and two or three concise technique cues.",
  }),
  intermediate: Object.freeze({
    id: "intermediate",
    label: "Intermediate",
    guidance:
      "Use a practical mix of compound and isolation work with moderate volume and clear progression targets.",
  }),
  advanced: Object.freeze({
    id: "advanced",
    label: "Advanced",
    guidance:
      "Use higher specificity and autoregulation, but avoid novelty or intensity that is not justified by the profile.",
  }),
});

export class WorkoutPlanValidationError extends Error {
  constructor(message, issues = []) {
    super(message);
    this.name = "WorkoutPlanValidationError";
    this.code = "INVALID_WORKOUT_PLAN";
    this.issues = issues;
  }
}

const normalizeKey = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, " ");

export function normalizeFitnessGoal(value) {
  const key = normalizeKey(value);
  const canonical = GOAL_ALIASES[key] || key.replace(/ /g, "_");
  return FITNESS_GOALS[canonical]?.id || null;
}

export function getFitnessGoal(value) {
  const id = normalizeFitnessGoal(value);
  return id ? FITNESS_GOALS[id] : null;
}

function asInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function requireRange(value, min, max, label) {
  const parsed = asInteger(value);
  if (parsed === null || parsed < min || parsed > max) {
    throw new WorkoutPlanValidationError(
      `${label} must be a whole number between ${min} and ${max}.`,
      [label],
    );
  }
  return parsed;
}

function getAgeBand(profile) {
  const suppliedBand = String(profile?.age_band || "").trim();
  if (["not provided", "under 18", "18-29", "30-44", "45-59", "60+"].includes(suppliedBand)) {
    return suppliedBand;
  }

  const age = asInteger(profile?.age);
  if (age === null) return "not provided";
  if (age < 18) return "under 18";
  if (age < 30) return "18-29";
  if (age < 45) return "30-44";
  if (age < 60) return "45-59";
  return "60+";
}

function selectedEquipmentFrom(profile) {
  const requested = Array.isArray(profile?.equipment)
    ? profile.equipment
    : Array.isArray(profile?.selected_equipment)
      ? profile.selected_equipment.map((item) =>
          typeof item === "string" ? item : item?.id,
        )
      : [];

  const requestedIds = new Set(requested.map((id) => String(id || "").trim()));
  const selected = equipmentLibrary
    .filter((item) => requestedIds.has(item.id))
    .map(({ id, name, category }) => ({ id, name, category }));

  if (selected.length === 0) {
    throw new WorkoutPlanValidationError(
      "Choose at least one available equipment option before generating a plan.",
      ["equipment"],
    );
  }

  return selected;
}

/**
 * Reduces a database profile to the training context needed by the model.
 * Names, emails, user IDs, exact birth dates, height, weight, and sex are
 * deliberately excluded from the generation request.
 */
export function createWorkoutGenerationContext(profile = {}) {
  const goalValue = profile.fitness_goal ?? profile.goal_id ?? profile.goal?.id;
  const goal = getFitnessGoal(goalValue);
  if (!goal) {
    throw new WorkoutPlanValidationError(
      "Choose a supported fitness goal before generating a plan.",
      ["fitness_goal"],
    );
  }

  const experienceValue = normalizeKey(
    profile.experience_level ?? profile.experience?.id,
  ).replace(/ /g, "_");
  const experience = EXPERIENCE_LEVELS[experienceValue];
  if (!experience) {
    throw new WorkoutPlanValidationError(
      "Choose a supported experience level before generating a plan.",
      ["experience_level"],
    );
  }

  return {
    goal,
    experience,
    training_days: requireRange(
      Array.isArray(profile.gym_frequency)
        ? profile.gym_frequency[0]
        : profile.gym_frequency ?? profile.training_days,
      1,
      6,
      "Training days",
    ),
    session_duration_minutes: requireRange(
      profile.workout_duration ?? profile.session_duration_minutes,
      20,
      120,
      "Session duration",
    ),
    age_band: getAgeBand(profile),
    selected_equipment: selectedEquipmentFrom(profile),
  };
}

export function toSafeGenerationProfile(profile) {
  const context = createWorkoutGenerationContext(profile);
  return {
    fitness_goal: context.goal.id,
    experience_level: context.experience.id,
    gym_frequency: context.training_days,
    workout_duration: context.session_duration_minutes,
    age_band: context.age_band,
    equipment: context.selected_equipment.map(({ id }) => id),
  };
}

const SPLITS = Object.freeze({
  1: "One full-body session",
  2: "Two full-body sessions with complementary movement emphases",
  3: "Three full-body sessions with rotating squat, hinge, push, and pull emphases",
  4: "Upper / Lower / Upper / Lower",
  5: "Upper / Lower / Full body / Upper / Lower",
  6: "Push / Pull / Legs / Push / Pull / Legs",
});

function recommendedStructure(context) {
  if (context.goal.id === "flexibility") {
    return `${context.training_days} mobility-strength sessions that cover the full body, rotate joint emphases, and avoid loading the same tissues hard on consecutive days`;
  }
  if (context.goal.id === "endurance") {
    return `${context.training_days} sessions that balance full-body strength, sustainable aerobic work, and at most two demanding interval days`;
  }
  if (context.goal.id === "lose") {
    return `${context.training_days} repeatable full-body resistance sessions with low-impact conditioning, distributed to support recovery and adherence`;
  }
  return SPLITS[context.training_days];
}

export function buildWorkoutPlanPrompt(profileOrContext) {
  const context = profileOrContext?.goal?.id
    ? profileOrContext
    : createWorkoutGenerationContext(profileOrContext);
  const equipment = context.selected_equipment
    .map((item) => `- ${item.id}: ${item.name} (${item.category})`)
    .join("\n");

  return `You are a careful strength-and-conditioning coach creating a realistic one-week plan. The plan may be completed alone, but each training day includes a short optional finisher for romantic partners to do together.

TRAINING CONTEXT (contains no direct personal identifiers)
- Goal: ${context.goal.label}. ${context.goal.guidance}
- Experience: ${context.experience.label}. ${context.experience.guidance}
- Training days: ${context.training_days} per week
- Session target: ${context.session_duration_minutes} minutes
- Age band: ${context.age_band}
- Recommended weekly structure: ${recommendedStructure(context)}

ALLOWED EQUIPMENT — THIS IS THE COMPLETE LIST
${equipment}

Equipment constraints:
- Never prescribe, mention, or imply equipment outside the allowed list.
- Each equipment-based exercise must use an equipment_id exactly as written above.
- A genuinely equipment-free bodyweight movement may use null for equipment_id.
- If the available selection is limited, prefer safe bodyweight movements instead of inventing equipment.
- Partner finishers must be equipment-free, with equipment_ids: [], including their solo alternative.

Programming and safety constraints:
- Return exactly seven days, Monday through Sunday, with exactly ${context.training_days} active days and ${7 - context.training_days} rest days.
- Space demanding sessions sensibly. Do not schedule more than three hard days consecutively.
- Fit warm-up, exercises, partner finisher, transitions, and cooldown inside roughly ${context.session_duration_minutes} minutes.
- Starting weights are conservative trial loads, not promises. Use 0 for bodyweight and include an RPE/form-based adjustment cue. Never prescribe maximal testing.
- Give movements a beginner-safe regression where appropriate. Avoid diagnosis, medical claims, punishment language, and guaranteed outcomes.
- Pain, dizziness, or loss of control is a stop signal; include that succinctly in safety_note.
- Use numeric integers for sets, rest_seconds, starting_weight_lbs, estimated_duration_mins, and partner-finisher duration_minutes.
- IDs must be lowercase kebab-case and unique. They will be normalized again by the application.
- Keep all coaching text concise: short sentences, three instructions per exercise, one cue, and one common mistake. Do not repeat guidance across fields. Return compact JSON without indentation.

Return raw JSON only, with no Markdown or comments, using this complete shape:
{
  "schema_version": 2,
  "overview": "Short explanation of the week",
  "progression": "Concrete guidance for progressing next week",
  "safety_note": "Short safety boundary",
  "weekly_schedule": [
    {
      "id": "day-monday",
      "day": "Monday",
      "type": "Push",
      "rest": false,
      "focus": "Chest, shoulders, triceps",
      "why": "Why this session is placed here and supports the goal",
      "estimated_duration_mins": 50,
      "warmup": "Specific 5-8 minute warm-up using only allowed equipment or bodyweight",
      "exercises": [
        {
          "id": "day-monday-exercise-1",
          "name": "Full exercise name",
          "equipment_id": null,
          "equipment": "Bodyweight",
          "movement_pattern": "push",
          "muscle_group": "Chest",
          "starting_weight_lbs": 0,
          "sets": 3,
          "reps": "8-10",
          "rest_seconds": 75,
          "tempo": "3-1-1",
          "why": "Why this exercise is in this session",
          "instructions": ["Setup step", "Execution step", "Finish/reset step"],
          "cues": ["One short actionable cue", "Another short cue"],
          "common_mistakes": ["A likely mistake and how to avoid it"],
          "note": "Regression or load-adjustment advice",
          "substitution_tags": ["push", "chest", "bodyweight"]
        }
      ],
      "partner_finisher": {
        "id": "day-monday-partner-finisher",
        "name": "Supportive partner finisher",
        "format": "Together or alternating",
        "duration_minutes": 6,
        "equipment_ids": [],
        "instructions": ["Clear step one", "Clear step two"],
        "solo_alternative": "Equivalent option if the partner is unavailable"
      },
      "cooldown": "Specific brief cooldown"
    },
    {
      "id": "day-tuesday",
      "day": "Tuesday",
      "type": "Rest",
      "rest": true,
      "focus": "Recovery",
      "why": "Why recovery is placed here",
      "estimated_duration_mins": 0,
      "warmup": "",
      "exercises": [],
      "partner_finisher": null,
      "cooldown": "Optional easy walk or comfortable mobility"
    }
  ]
}`;
}

function cleanText(value, path, { required = true, max = 600 } = {}) {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) {
    throw new WorkoutPlanValidationError(`The generated plan is missing ${path}.`, [path]);
  }
  return text.slice(0, max);
}

function cleanTextList(value, path, minimum = 1, maximum = 8) {
  if (!Array.isArray(value)) {
    throw new WorkoutPlanValidationError(`The generated plan has invalid ${path}.`, [path]);
  }
  const result = value
    .filter((item) => typeof item === "string" && item.trim())
    .slice(0, maximum)
    .map((item) => item.trim().slice(0, 280));
  if (result.length < minimum) {
    throw new WorkoutPlanValidationError(`The generated plan needs more detail in ${path}.`, [path]);
  }
  return result;
}

function generatedInteger(value, min, max, path, fallback = null) {
  const parsed = asInteger(value);
  if (parsed === null) {
    if (fallback !== null) return fallback;
    throw new WorkoutPlanValidationError(`The generated plan has invalid ${path}.`, [path]);
  }
  return Math.min(max, Math.max(min, parsed));
}

function slug(value) {
  return String(value || "item")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "item";
}

function normalizeExercise(raw, dayId, index, allowedEquipment) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new WorkoutPlanValidationError("The generated plan contains an invalid exercise.", [
      `${dayId}.exercises.${index}`,
    ]);
  }

  const path = `${dayId}.exercises.${index}`;
  const name = cleanText(raw.name, `${path}.name`, { max: 100 });
  const equipmentId = raw.equipment_id ? String(raw.equipment_id).trim() : null;
  if (equipmentId && !allowedEquipment.has(equipmentId)) {
    throw new WorkoutPlanValidationError(
      `The generated plan tried to use unavailable equipment (${equipmentId}).`,
      [`${path}.equipment_id`],
    );
  }

  const stableId = `${dayId}-exercise-${index + 1}-${slug(name)}`;
  const reps = cleanText(String(raw.reps ?? ""), `${path}.reps`, { max: 40 });
  const prescription = normalizePrescription({ reps });
  const instructions = cleanTextList(raw.instructions, `${path}.instructions`, 2, 8);
  const cues = cleanTextList(raw.cues ?? raw.form_cues, `${path}.cues`, 1, 6);
  const commonMistakes = cleanTextList(
    raw.common_mistakes,
    `${path}.common_mistakes`,
    1,
    6,
  );

  return {
    id: stableId,
    slot_id: stableId,
    exercise_id: slug(name),
    name,
    equipment_id: equipmentId,
    equipment_ids: equipmentId ? [equipmentId] : [],
    equipment: equipmentId ? allowedEquipment.get(equipmentId)?.name : "Bodyweight",
    movement_pattern: cleanText(raw.movement_pattern, `${path}.movement_pattern`, {
      max: 60,
    }),
    muscle_group: cleanText(raw.muscle_group, `${path}.muscle_group`, { max: 80 }),
    starting_weight_lbs: generatedInteger(
      raw.starting_weight_lbs,
      0,
      1000,
      `${path}.starting_weight_lbs`,
      0,
    ),
    sets: generatedInteger(raw.sets, 1, 8, `${path}.sets`),
    reps,
    prescription,
    rest_seconds: generatedInteger(raw.rest_seconds, 0, 300, `${path}.rest_seconds`),
    tempo: cleanText(raw.tempo || "controlled", `${path}.tempo`, { max: 40 }),
    why: cleanText(raw.why, `${path}.why`, { max: 280 }),
    instructions,
    cues,
    form_cues: cues,
    common_mistakes: commonMistakes,
    note: cleanText(raw.note, `${path}.note`, { max: 280 }),
    substitution_tags: Array.isArray(raw.substitution_tags)
      ? raw.substitution_tags
          .filter((tag) => typeof tag === "string" && tag.trim())
          .slice(0, 8)
          .map((tag) => slug(tag))
      : [],
  };
}

function normalizePartnerFinisher(raw, dayId, allowedEquipment) {
  const path = `${dayId}.partner_finisher`;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new WorkoutPlanValidationError(
      "Each active day needs an optional partner finisher.",
      [path],
    );
  }

  const equipmentIds = Array.isArray(raw.equipment_ids)
    ? [...new Set(raw.equipment_ids.map((id) => String(id || "").trim()).filter(Boolean))]
    : [];
  const unavailable = equipmentIds.find((id) => !allowedEquipment.has(id));
  if (unavailable) {
    throw new WorkoutPlanValidationError(
      `The partner finisher tried to use unavailable equipment (${unavailable}).`,
      [`${path}.equipment_ids`],
    );
  }

  return {
    id: `${dayId}-partner-finisher`,
    name: cleanText(raw.name, `${path}.name`, { max: 100 }),
    format: cleanText(raw.format, `${path}.format`, { max: 100 }),
    duration_minutes: generatedInteger(
      raw.duration_minutes,
      2,
      15,
      `${path}.duration_minutes`,
    ),
    equipment_ids: equipmentIds,
    instructions: cleanTextList(raw.instructions, `${path}.instructions`, 2, 6),
    solo_alternative: cleanText(raw.solo_alternative, `${path}.solo_alternative`, {
      max: 280,
    }),
  };
}

/**
 * Validates model output and returns the backwards-compatible shape consumed
 * by the existing pages, augmented with richer coaching metadata.
 */
export function normalizeWorkoutPlan(rawPlan, profileOrContext) {
  const context = profileOrContext?.goal?.id
    ? profileOrContext
    : createWorkoutGenerationContext(profileOrContext);
  const candidate = rawPlan?.plan && !rawPlan.weekly_schedule ? rawPlan.plan : rawPlan;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new WorkoutPlanValidationError("The generator did not return a workout plan.");
  }
  if (!Array.isArray(candidate.weekly_schedule) || candidate.weekly_schedule.length !== 7) {
    throw new WorkoutPlanValidationError(
      "The generated plan must contain exactly seven days.",
      ["weekly_schedule"],
    );
  }

  const allowedEquipment = new Map(
    context.selected_equipment.map((item) => [item.id, item]),
  );
  const rawByDay = new Map();
  for (const rawDay of candidate.weekly_schedule) {
    const canonicalDay = WEEK_DAYS.find(
      (day) => day.toLowerCase() === String(rawDay?.day || "").trim().toLowerCase(),
    );
    if (!canonicalDay || rawByDay.has(canonicalDay)) {
      throw new WorkoutPlanValidationError(
        "The generated plan has a missing, duplicate, or invalid weekday.",
        ["weekly_schedule.day"],
      );
    }
    rawByDay.set(canonicalDay, rawDay);
  }

  const weeklySchedule = WEEK_DAYS.map((day) => {
    const raw = rawByDay.get(day);
    const dayId = `day-${day.toLowerCase()}`;
    if (typeof raw.rest !== "boolean") {
      throw new WorkoutPlanValidationError(`The generated ${day} rest flag is invalid.`, [
        `${dayId}.rest`,
      ]);
    }
    if (!Array.isArray(raw.exercises)) {
      throw new WorkoutPlanValidationError(`The generated ${day} exercise list is invalid.`, [
        `${dayId}.exercises`,
      ]);
    }
    if (raw.rest && raw.exercises.length !== 0) {
      throw new WorkoutPlanValidationError(`The generated ${day} rest day contains exercises.`, [
        `${dayId}.exercises`,
      ]);
    }
    if (!raw.rest && (raw.exercises.length < 1 || raw.exercises.length > 12)) {
      throw new WorkoutPlanValidationError(
        `The generated ${day} workout needs between 1 and 12 exercises.`,
        [`${dayId}.exercises`],
      );
    }

    const warmup = cleanText(raw.warmup, `${dayId}.warmup`, {
      required: !raw.rest,
      max: 500,
    });
    const cooldown = cleanText(raw.cooldown, `${dayId}.cooldown`, { max: 500 });
    const partnerFinisher = raw.rest
      ? null
      : normalizePartnerFinisher(
          raw.partner_finisher ?? raw.shared_finisher,
          dayId,
          allowedEquipment,
        );

    return {
      id: dayId,
      day_id: dayId,
      day,
      type: cleanText(raw.type, `${dayId}.type`, { max: 80 }),
      rest: raw.rest,
      focus: cleanText(raw.focus, `${dayId}.focus`, { max: 140 }),
      why: cleanText(raw.why, `${dayId}.why`, { max: 300 }),
      estimated_duration_mins: raw.rest
        ? 0
        : generatedInteger(
            raw.estimated_duration_mins,
            10,
            120,
            `${dayId}.estimated_duration_mins`,
          ),
      warmup,
      warmup_steps: warmup ? [warmup] : [],
      exercises: raw.exercises.map((exercise, index) =>
        normalizeExercise(exercise, dayId, index, allowedEquipment),
      ),
      partner_finisher: partnerFinisher,
      shared_finisher: partnerFinisher,
      cooldown,
      cooldown_steps: cooldown ? [cooldown] : [],
    };
  });

  const activeDays = weeklySchedule.filter((day) => !day.rest).length;
  if (activeDays !== context.training_days) {
    throw new WorkoutPlanValidationError(
      `The generator returned ${activeDays} active days instead of ${context.training_days}.`,
      ["weekly_schedule.rest"],
    );
  }

  return {
    schema_version: 2,
    goal_id: context.goal.id,
    goal_label: context.goal.label,
    overview: cleanText(candidate.overview, "overview", { max: 600 }),
    progression: cleanText(candidate.progression, "progression", { max: 600 }),
    safety_note: cleanText(candidate.safety_note, "safety_note", { max: 400 }),
    weekly_schedule: weeklySchedule,
  };
}
