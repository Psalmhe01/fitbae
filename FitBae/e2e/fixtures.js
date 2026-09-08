import { test as base, expect } from "@playwright/test";
import { normalizeWorkoutPlan, WEEK_DAYS } from "../src/lib/workoutPlan.js";

export const USER_ID = "11111111-1111-4111-8111-111111111111";
export const PLAN_ID = "22222222-2222-4222-8222-222222222222";
export const PARTNER_ID = "33333333-3333-4333-8333-333333333333";

export const plan = normalizeWorkoutPlan({
  goal_id: "strength",
  overview: "A balanced week to build strength together.",
  progression: "Add a rep when the current weight feels comfortable.",
  weekly_schedule: WEEK_DAYS.map((day, index) => ({
    day, rest: index !== 0 && index !== 3,
    type: index === 0 || index === 3 ? "Full body strength" : "Recovery",
    focus: "Build consistency",
    estimated_duration_mins: 45,
    warmup: "Five minutes of gentle movement.",
    cooldown: "Easy walking and breathing.",
    exercises: index === 0 || index === 3 ? [{
      name: "Dumbbell Bench Press", equipment_id: "dumbbells", muscle_group: "Chest",
      sets: 3, reps: "8-10", rest_seconds: 60, starting_weight_lbs: 20,
    }, {
      name: "Goblet Squat", equipment_id: "dumbbells", muscle_group: "Quadriceps",
      sets: 2, reps: "10-12", rest_seconds: 60, starting_weight_lbs: 15,
    }] : [],
    partner_finisher: index === 0 || index === 3 ? {
      name: "A walk together", duration_minutes: 5, format: "Together",
      instructions: ["Walk at an easy pace.", "Check in with each other."],
      solo_alternative: "Enjoy a short walk on your own.",
    } : null,
  })),
});

export const test = base.extend({
  app: async ({ page }, provideApp) => {
    const state = {
      user: { id: USER_ID, aud: "authenticated", role: "authenticated", email: "alex@example.test", app_metadata: { provider: "google" }, user_metadata: { name: "Alex Rivera" }, created_at: new Date().toISOString() },
      profile: { user_id: USER_ID, name: "Alex Rivera", email: "alex@example.test", age: 28, weight: 150, height_cm: 175, fitness_goal: "strength", experience_level: "intermediate", gym_frequency: 2, workout_duration: 45, equipment: ["dumbbells", "flat_bench", "incline_bench", "bodyweight"] },
      plan: { id: PLAN_ID, user_id: USER_ID, created_at: new Date().toISOString(), plan_json: structuredClone(plan) },
      planError: false, uploadError: false, metadataError: false,
      uploads: [], removed: [], authUpdates: [], workouts: [], connected: false,
    };
    const session = { access_token: "e2e-access-token", refresh_token: "e2e-refresh-token", token_type: "bearer", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, user: state.user };
    await page.addInitScript((initialSession) => {
      const key = "sb-fitbae-e2e-auth-token";
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initialSession));
      localStorage.setItem("fitbae-color-scheme", "light");
    }, session);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.routeWebSocket(/fitbae-e2e\.supabase\.co/, (socket) => socket.close());
    await page.route("https://fitbae-e2e.supabase.co/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      const method = request.method();
      if (url.pathname.endsWith("/auth/v1/user")) {
        if (method === "PUT") {
          if (state.metadataError) return json({ message: "Could not update your picture" }, 500);
          state.authUpdates.push(request.postDataJSON());
          state.user = { ...state.user, user_metadata: { ...state.user.user_metadata, ...request.postDataJSON().data } };
        }
        return json(state.user);
      }
      if (url.pathname.includes("/storage/v1/object/sign/")) {
        if (method === "POST") return json({ signedURL: `${url.pathname.replace("/storage/v1", "")}?token=test` });
        return route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1sAAAAASUVORK5CYII=", "base64") });
      }
      if (url.pathname.includes("/storage/v1/object/")) {
        if (method === "DELETE") { state.removed.push(...request.postDataJSON().prefixes); return json([]); }
        if (state.uploadError) return json({ statusCode: "403", message: "Upload denied", error: "Unauthorized" }, 403);
        const path = url.pathname.split("/avatar-photos/")[1];
        state.uploads.push({ path, bytes: request.postDataBuffer()?.length });
        return json({ Key: `avatar-photos/${path}` });
      }
      if (url.pathname.endsWith("/rpc/get_connected_partner")) return json(state.connected ? [{ user_id: PARTNER_ID, name: "Sam", gym_frequency: 2 }] : []);
      if (url.pathname.endsWith("/rpc/get_partner_weekly_momentum")) return json([{ session_count: 1, total_minutes: 42 }]);
      if (url.pathname.endsWith("/rpc/get_partner_avatar")) return json({ type: "preset", id: "tide" });
      if (url.pathname.endsWith("/rpc/finalize_workout")) { state.workouts.push(request.postDataJSON()); return json("44444444-4444-4444-8444-444444444444"); }
      if (url.pathname.endsWith("/profiles")) {
        if (method === "PATCH") state.profile = { ...state.profile, ...request.postDataJSON() };
        return json(state.profile);
      }
      if (url.pathname.endsWith("/workout_plans")) {
        if (state.planError) return json({ message: "Database unavailable" }, 500);
        if (method === "PATCH") { state.plan = { ...state.plan, ...request.postDataJSON() }; return json({ id: PLAN_ID }); }
        return json(state.plan);
      }
      if (url.pathname.endsWith("/partnerships")) return json(state.connected ? [{ id: "connection", requester_id: USER_ID, recipient_id: PARTNER_ID, status: "accepted" }] : []);
      if (/\/(workout_sessions|exercise_logs|partner_notes|partner_reactions)$/.test(url.pathname)) return json([]);
      return json({ message: `Unexpected test request: ${url.pathname}` }, 404);
    });
    await provideApp(state);
    expect(errors, "The browser should have no uncaught rendering errors").toEqual([]);
  },
});

export { expect };

export async function seedAvatar(page, app, choice) {
  app.user.user_metadata.fitbae_avatar = choice;
  await page.goto("/settings");
  await page.evaluate((savedChoice) => {
    const key = "sb-fitbae-e2e-auth-token";
    const session = JSON.parse(localStorage.getItem(key));
    session.user.user_metadata.fitbae_avatar = savedChoice;
    localStorage.setItem(key, JSON.stringify(session));
  }, choice);
  await page.reload();
}

export async function photoFile(page) {
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 320; canvas.height = 480;
    const context = canvas.getContext("2d");
    context.fillStyle = "#8cab76"; context.fillRect(0, 0, 320, 480);
    context.fillStyle = "#e6ba97"; context.fillRect(70, 80, 180, 250);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  return { name: "profile.png", mimeType: "image/png", buffer: Buffer.from(data, "base64") };
}
