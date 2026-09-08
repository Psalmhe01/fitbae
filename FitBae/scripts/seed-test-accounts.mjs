import { createClient } from "@supabase/supabase-js";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { adminEnvironment } from "./admin-env.mjs";
import { normalizeWorkoutPlan, WEEK_DAYS } from "../src/lib/workoutPlan.js";

// Explicitly requested QA accounts. They remain ordinary authenticated users:
// the "Admin" display names never confer administrator privileges.
const definitions = [
  { email: "adminboo@fitbae.test", name: "AdminBoo", passwordKey: "FITBAE_ADMINBOO_PASSWORD", avatar: "summit", goal: "strength", age: 29, weight: 175, height: 180 },
  { email: "adminbabe@fitbae.test", name: "AdminBabe", passwordKey: "FITBAE_ADMINBABE_PASSWORD", avatar: "botanical", goal: "muscle", age: 27, weight: 140, height: 167 },
];
const env = await adminEnvironment();
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY locally first.");
const mode = process.argv[2] || "--inspect";
if (!["--inspect", "--create"].includes(mode)) throw new Error("Unknown seed operation.");
if (mode === "--create") for (const definition of definitions) {
  if (!env[definition.passwordKey] || env[definition.passwordKey].length < 12) throw new Error(`Set ${definition.passwordKey} to a unique test password of at least 12 characters.`);
}
const client = createClient(env.VITE_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
const accounts = [];
try {
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  for (const definition of definitions) {
    let user = data.users.find((item) => item.email?.toLowerCase() === definition.email);
    if (user && !user.app_metadata?.fitbae_test_account) {
      console.log(`${definition.name}: existing unmarked account; left unchanged.`);
      continue;
    }
    if (!user && mode === "--create") {
      const created = await client.auth.admin.createUser({
        email: definition.email, password: env[definition.passwordKey], email_confirm: true,
        app_metadata: { fitbae_test_account: true },
        user_metadata: { name: definition.name, fitbae_avatar: { type: "preset", id: definition.avatar } },
      });
      if (created.error) throw created.error;
      user = created.data.user;
    }
    if (!user) { console.log(`${definition.name}: not created yet.`); continue; }
    console.log(`${definition.name}: ${user.email} (${mode === "--create" ? "available" : "exists"}).`);
    accounts.push(user);
    if (mode !== "--create") continue;
    const existing = await client.from("profiles").select("user_id").eq("user_id", user.id).maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) {
      const profile = await client.from("profiles").insert({
        user_id: user.id, email: definition.email, name: definition.name,
        age: definition.age, weight: definition.weight, weight_unit: "lbs", height_cm: definition.height,
        sex: "prefer_not_to_say", fitness_goal: definition.goal, experience_level: "beginner",
        gym_frequency: 3, workout_duration: 45, equipment: ["bodyweight", "dumbbells", "flat_bench"],
      });
      if (profile.error) throw profile.error;
    }
    const existingPlan = await client.from("workout_plans").select("id").eq("user_id", user.id).limit(1);
    if (existingPlan.error) throw existingPlan.error;
    if (!existingPlan.data?.length) {
      const plan = normalizeWorkoutPlan({
        overview: "A sample week for testing FitBae. Review any exercise before training.",
        goal_id: definition.goal,
        weekly_schedule: WEEK_DAYS.map((day, index) => ({
          day, rest: ![0, 2, 4].includes(index), type: [0, 2, 4].includes(index) ? "Full body foundations" : "Recovery",
          estimated_duration_mins: [0, 2, 4].includes(index) ? 45 : 0,
          warmup: "Ease into comfortable movement before the first set.", cooldown: "Finish with an easy walk.",
          exercises: [0, 2, 4].includes(index) ? [
            { name: "Goblet Squat", equipment_id: "dumbbells", sets: 2, reps: "8-10", rest_seconds: 60, starting_weight_lbs: 10 },
            { name: "Dumbbell Bench Press", equipment_id: "dumbbells", sets: 2, reps: "8-10", rest_seconds: 60, starting_weight_lbs: 10 },
            { name: "Dumbbell Romanian Deadlift", equipment_id: "dumbbells", sets: 2, reps: "8-10", rest_seconds: 60, starting_weight_lbs: 10 },
          ] : [],
        })),
      });
      const inserted = await client.from("workout_plans").insert({ user_id: user.id, plan_json: plan, fitness_goal: definition.goal, experience_level: "beginner" });
      if (inserted.error) throw inserted.error;
    }
  }
  if (mode === "--create" && accounts.length === 2) console.log("Both test profiles are ready. Connect them from Together to test the invitation/acceptance flow.");
  // Check the credentials file is ignored separately during setup; never print passwords.
  await access(new URL("../.env", import.meta.url), constants.R_OK);
} catch (error) {
  console.error(`Test-account setup failed (${error.code || error.status || "REQUEST_FAILED"}). No existing account passwords were changed.`);
  process.exitCode = 1;
}
