const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function generateWorkoutPlan(profile) {
  if (!API_KEY) {
    throw new Error(
      "VITE_GEMINI_API_KEY is not set in your environment variables.",
    );
  }

  const prompt = `
You are an elite NSCA-certified personal trainer writing a program for a member of the Southeastern Louisiana University (SLU) Recreation Center in Hammond, LA.

USER PROFILE:
- Name: ${profile.name}
- Goal: ${profile.fitness_goal}
- Experience Level: ${profile.experience_level}
- Training Days: ${profile.gym_frequency} days/week
- Session Duration: ${profile.workout_duration} minutes
- Available Equipment: ${profile.equipment.join(", ")}
- Sex: ${profile.sex}
- Age: ${profile.age} years old
- Weight: ${profile.weight} lbs
- Height: ${profile.height_cm} cm (This is for context, do not use for equipment selection)

GYM CONTEXT — SLU Recreation Center, Hammond, LA:
Only use equipment from this exact list. For each exercise, you MUST provide the 'equipment_id' from this list.

EQUIPMENT LIBRARY (ID: Name, Category, Notes):

BARS & PLATES:
  - olympic_barbell: Olympic Barbell (45 lbs base weight)
  - ez_bar: EZ Bar (22 lbs base weight)
  - landmine: Landmine attachment
  - plates: Plates (1.25, 2.5, 5, 10, 15, 20, 25, 35, 45, 50 lbs)

BENCHES & RACKS:
  - squat_rack: Squat Rack (with J-hooks)
  - smith_machine: Smith Machine (22 lbs base weight)
  - flat_bench: Flat Bench
  - incline_bench: Incline Bench
  - decline_bench: Decline Bench
  - preacher_curl_bench: Preacher Curl Bench
  - pull_up_bar: Pull Up Bar

DUMBBELLS:
  - dumbbells: Dumbbells (Available in: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60 lbs and beyond)

PLATED MACHINES (include the machine's base weight when programming):
  - hack_squat_machine: Hack Squat Machine (22 lb sled base weight)
  - leg_press_machine: Leg Press Machine (45 lb sled base weight)
  - chest_supported_row_machine: Plate-Loaded Chest Supported Row Machine (22 lb base weight)

SELECTORIZED / WEIGHT STACK MACHINES (starting stack weight: 10 lbs, recommend a specific weight):
  - lat_pulldown_machine: Lat Pulldown Machine
  - seated_leg_curl_machine: Seated Leg Curl Machine
  - calf_extension_machine: Calf Extension Machine
  - incline_chest_press_machine: Incline Chest Press Machine
  - abductor_machine: Abductor Machine
  - adductor_machine: Adductor Machine
  - fly_machine: Fly Machine
  - leg_extension_machine: Leg Extension Machine
  - preacher_curl_machine: Preacher Curl Machine
  - lateral_raise_machine: Lateral Raise Machine
  - row_machine: Row Machine

CABLE MACHINES (starting weight: 10 lbs):
  - crossover_cable: Crossover Cable
  - hi_lo_pull_cable: Hi Lo Pull Cable
  - lat_pulldown_cable: Lat Pulldown Cable
  - row_cable: Row Cable

BALLS & ACCESSORIES:
  - ab_wheel: Ab Wheel
  - stability_ball: Stability Ball
  - foam_roller: Foam Roller
  - trx: TRX Suspension Trainer
  - tire: Workout Tire (for flips or slams)
  - sissy_squat_machine: Sissy Squat Machine
  - battle_ropes: Battle Ropes
  - loop_bands: Loop Resistance Bands

EQUIPMENT RULES:
- NEVER reference equipment not on this list (e.g., no kettlebells, no functional trainer, no assisted pull-up machine)
- For barbells, always specify total weight including the bar (e.g., "45 lb bar + 25 lbs each side = 95 lbs total")
- For plated machines, factor in the machine's base sled weight when giving starting_weight_lbs
- For selectorized machines, recommend a specific stack weight in lbs
- For cable machines, recommend a specific stack weight in lbs
- For dumbbells, always pick the closest available increment from the list above

GOAL-SPECIFIC INSTRUCTIONS:
- If goal is 'Build Muscle': Use 3–5 sets of 8–12 reps. Progressive overload focus. 60–90s rest. Include compound lifts first, isolation last.
- If goal is 'Lose Weight': Use 3–4 sets of 12–20 reps. Include supersets and circuits. 30–45s rest. Elevate heart rate throughout.
- If goal is 'Increase Strength': Use 4–5 sets of 3–6 reps. Heavy compound lifts (Squat, Deadlift, Bench, OHP, Row). 2–3 min rest. Add percentage of bodyweight or RPE guidance.
- If goal is 'Increase Endurance': Use 2–4 sets of 15–25 reps or time-based. 20–30s rest. Include cardio finishers.
- If goal is 'Improve Flexibility': Include dynamic warm-up, mobility flows, and static stretching. Hold times in seconds.
- If goal is 'Maintain Fitness': Balanced mix of strength and cardio. Moderate reps and sets.

EXPERIENCE-SPECIFIC INSTRUCTIONS:
- Beginner: Use machines over free weights where possible. Lighter starting weights. Focus on form cues.
- Intermediate: Mix of machines and free weights. Moderate weights. Include technique progressions.
- Advanced: Prioritize free weights and compound movements. Heavier loads. Include advanced techniques (drop sets, tempo, RPE).

EXERCISE DETAIL REQUIREMENTS — For EVERY exercise include:
1. Full official exercise name (e.g., "Barbell Back Squat", not just "Squats")
2. Specific equipment used (e.g., "45 lb plates on each side of barbell")
3. The 'equipment_id' from the EQUIPMENT LIBRARY that best represents the primary equipment for this exercise.
3. Starting weight recommendation in lbs based on the user's weight, sex, and experience level
4. Sets and reps (or time in seconds for holds/cardio)
5. Rest period in seconds
6. Tempo if relevant (e.g., "3-1-2" = 3s down, 1s pause, 2s up)
7. Step-by-step "instructions" as an array of strings.
8. A brief coaching "note" for a quick tip.
8. The primary muscle group targeted (e.g., "Chest", "Quads", "Biceps")

PROGRAM SPLIT RULES:
You MUST use a specific split based on the Training Days (${profile.gym_frequency} days/week). Do NOT generate Full Body workouts for frequencies of 3 days or more:
- 1-2 days: Full Body (Compound focus).
- 3 days: MANDATORY Push / Pull / Legs.
- 4 days: MANDATORY Upper / Lower / Upper / Lower.
- 5 days: MANDATORY Push / Pull / Legs / Upper / Lower.
- 6 days: MANDATORY Push / Pull / Legs / Push / Pull / Legs.

MUSCLE GROUPING REQUIREMENTS:
- Push: Focus ONLY on Chest, Shoulders, and Triceps.
- Pull: Focus ONLY on Back, Biceps, and Rear Delts.
- Legs: Focus ONLY on Quads, Hamstrings, Glutes, and Calves.
- Upper: Balanced focus on all upper body muscle groups.
- Lower: Balanced focus on Legs and Core.

Spread active days intelligently (avoid 3 consecutive hard days without rest).
Mark exactly ${7 - profile.gym_frequency} days as rest days.

FORMATTING RULES:
- Output MUST be valid raw JSON only. No markdown, no backticks, no explanation.
- Root key: "weekly_schedule" — array of exactly 7 day objects.
- Days must be in order: Monday through Sunday.

JSON STRUCTURE (follow exactly):
{
  "weekly_schedule": [
    {
      "day": "Monday",
      "type": "Push",
      "rest": false,
      "focus": "Chest, Shoulders, Triceps",
      "estimated_duration_mins": 55,
      "warmup": "5 min treadmill at 3.5 mph, then arm circles and band pull-aparts",
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "equipment_id": "olympic_barbell", // This is the ID from the EQUIPMENT LIBRARY
          "equipment": "Barbell, Flat Bench, 45 lb plates",
          "starting_weight_lbs": 95,
          "sets": 4,
          "reps": "8-10",
          "rest_seconds": 90,
          "tempo": "3-1-2",
          "muscle_group": "Chest",
          "instructions": [
            "Lie flat on the bench with feet pressed into the floor.",
            "Grip the bar slightly wider than shoulder-width.",
            "Lower the bar slowly to mid-chest while tucking elbows at 45 degrees.",
            "Press the bar back up to the starting position."
          ],
          "note": "Keep shoulder blades pinched and retracted throughout."
        }
      ],
      "cooldown": "5 min light stretching, focus on chest and shoulders"
    },
    {
      "day": "Tuesday",
      "type": "Rest",
      "rest": true,
      "focus": "Recovery",
      "estimated_duration_mins": 0,
      "warmup": "",
      "exercises": [],
      "cooldown": "Optional: 10 min foam rolling or light walk"
    }
  ]
}

Return ONLY the raw JSON. No other text.
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" },
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Gemini API Error Response:", errorData);
    throw new Error(
      `Gemini API Error: ${response.status} ${response.statusText}. Check console for details.`,
    );
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    console.error("Unexpected Gemini response structure:", data);
    throw new Error(
      "Gemini returned an empty or invalid response. Check if content was blocked.",
    );
  }

  try {
    return JSON.parse(textResponse);
  } catch (e) {
    console.error("Failed to parse Gemini JSON:", textResponse);
    throw new Error("Failed to parse the workout plan JSON returned by AI.");
  }
}
