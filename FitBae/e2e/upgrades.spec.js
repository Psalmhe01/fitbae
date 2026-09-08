import { test, expect, signedOut, USER_ID, PARTNER_ID } from "./fixtures.js";

test("email sign-in handles bad credentials and retries successfully", async ({ page, app }) => {
  await signedOut(page); app.authError = true;
  await page.goto("/auth");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("adminboo@fitbae.test");
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("test-password-only");
  await page.getByRole("button", { name: "Sign in with email", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Email or password is incorrect");
  app.authError = false;
  await page.getByRole("button", { name: "Sign in with email", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  expect(app.authRequests).toHaveLength(2);
});

test("email signup validates passwords and shows confirmation instructions", async ({ page, app }) => {
  await signedOut(page);
  await page.goto("/auth?mode=signup");
  await page.getByLabel("Name or nickname").fill("AdminBabe");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("adminbabe@fitbae.test");
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("a-long-test-password");
  await page.getByRole("textbox", { name: "Confirm password", exact: true }).fill("mismatch");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("don't match");
  expect(app.authRequests).toHaveLength(0);
  await page.getByRole("textbox", { name: "Confirm password", exact: true }).fill("a-long-test-password");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  expect(app.authRequests[0].data.name).toBe("AdminBabe");
  expect(app.authRequests[0].type).toBe("signup");
});

test("forgot password requests a reset link without disclosing account existence", async ({ page, app }) => {
  await signedOut(page);
  await page.goto("/auth?mode=forgot");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("someone@example.test");
  await page.getByRole("button", { name: "Send reset link", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("If this email has an account");
  expect(app.authRequests[0].type).toBe("recover");
});

test("a recovered session can choose a new password", async ({ page, app }) => {
  await page.goto("/auth?mode=reset");
  await page.getByRole("textbox", { name: "New password", exact: true }).fill("new-test-passphrase");
  await page.getByRole("textbox", { name: "Confirm password", exact: true }).fill("new-test-passphrase");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Password updated");
  expect(app.authUpdates[0].password).toBe("new-test-passphrase");
});

test("chat renders legacy UTC in Chicago time, keeps order, and retries failed sends", async ({ page, app }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  app.connected = true;
  app.messages = [
    { id: "first", author_id: PARTNER_ID, recipient_id: USER_ID, content: "See you at the gym", created_at: "2026-09-08T18:30:00", seen: false },
    { id: "second", author_id: USER_ID, recipient_id: PARTNER_ID, content: "Ready when you are", created_at: "2026-09-08T18:31:00Z", seen: true },
  ];
  await page.goto("/together");
  const chat = page.getByRole("log", { name: "Partner conversation" });
  await expect(chat.getByText("See you at the gym", { exact: true })).toBeVisible();
  await expect(chat.locator("time").first()).toContainText("1:30");
  await expect(chat.locator("time").first()).toContainText("CDT");
  await expect(chat.locator("time").last()).toContainText("Read");
  app.messageError = true;
  await page.getByLabel("Message Sam", { exact: true }).fill("Let's go together!");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Message not sent");
  await expect(page.getByLabel("Message Sam", { exact: true })).toHaveValue("Let's go together!");
  app.messageError = false;
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(chat.getByText("Let's go together!", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(chat.getByText("Let's go together!", { exact: true })).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("together-chat.png"), fullPage: true, animations: "disabled" });
});

test("time zone preference changes chat display without changing message data", async ({ page, app }) => {
  app.connected = true;
  app.messages = [{ id: "timezone", author_id: PARTNER_ID, recipient_id: USER_ID, content: "Time check", created_at: "2026-09-08T18:30:00Z", seen: true }];
  await page.goto("/settings");
  await page.getByRole("combobox", { name: "Display time zone", exact: true }).fill("Africa/Lagos");
  await page.getByRole("option", { name: "Africa/Lagos", exact: true }).click();
  await page.getByRole("button", { name: "Save time zone", exact: true }).click();
  await expect(page.getByText("Time zone saved.", { exact: true })).toBeVisible();
  await page.goto("/together");
  await expect(page.getByRole("log").locator("time")).toContainText("7:30");
  expect(app.messages[0].created_at).toBe("2026-09-08T18:30:00Z");
});

test("previous weights and extra sets survive refresh without changing the plan", async ({ page, app }) => {
  app.exerciseLogs = [{ session_id: "previous", set_number: 1, weight_lbs: 35, actual_reps: 9, actual_value: 9, actual_unit: "reps", completed_at: "2026-09-07T18:00:00Z" }];
  await page.goto("/plan?day=Monday");
  await page.getByRole("button", { name: "Start this workout", exact: true }).click();
  await page.getByRole("button", { name: "Use last weights", exact: true }).click();
  await expect(page.getByLabel("Dumbbell Bench Press set 1 weight in pounds", { exact: true })).toHaveValue("35");
  await page.getByRole("button", { name: "Add set", exact: true }).click();
  await expect(page.getByLabel("Dumbbell Bench Press set 4 weight in pounds", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Dumbbell Bench Press set 4 weight in pounds", { exact: true })).toBeVisible();
  expect(app.plan.plan_json.weekly_schedule[0].exercises[0].sets).toBe(3);
  await page.getByRole("button", { name: "Remove last uncompleted set", exact: true }).click();
  await expect(page.getByLabel("Dumbbell Bench Press set 4 weight in pounds", { exact: true })).toHaveCount(0);
});

test("session save sends the actual sets and notes and clears its draft", async ({ page, app }) => {
  await page.goto("/plan?day=Monday");
  await page.getByRole("button", { name: "Start this workout", exact: true }).click();
  await page.getByRole("button", { name: "Complete set 1", exact: true }).click();
  await page.getByRole("button", { name: "Next exercise", exact: true }).click();
  await page.getByRole("button", { name: "Review & finish", exact: true }).click();
  await page.getByLabel("Session note (optional)").fill("Felt steady today.");
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Work logged. Nicely done.", exact: true })).toBeVisible();
  expect(app.workouts).toHaveLength(1);
  expect(app.workouts[0].p_logs.filter((log) => !log.skipped)).toHaveLength(1);
  expect(app.workouts[0].p_session.notes).toBe("Felt steady today.");
  expect(await page.evaluate(() => localStorage.getItem("fitbae-active-workout"))).toBeNull();
});

test("the library finds exercises and remembers private device favorites", async ({ page, app }, testInfo) => {
  expect(app.profile).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/library");
  await page.getByLabel("Search exercises", { exact: true }).fill("Goblet Squat");
  await page.getByRole("button", { name: "Save Dumbbell Goblet Squat", exact: true }).click();
  await page.getByRole("checkbox", { name: "Only favorites", exact: true }).check();
  await page.getByRole("button", { name: "View Dumbbell Goblet Squat guide", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await page.getByRole("checkbox", { name: "Only favorites", exact: true }).check();
  await expect(page.getByRole("heading", { name: "Dumbbell Goblet Squat", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("library-mobile.png"), fullPage: true });
});

test("Progress loads older sessions, searches exercises, shows best sets, and exports CSV", async ({ page, app }) => {
  app.history = Array.from({ length: 31 }, (_, index) => ({
    id: `history-${index}`, workout_type: `Session ${index}`, status: "completed", duration_seconds: 1800,
    finished_at: new Date(Date.UTC(2026, 8, 8 - index, 18)).toISOString(),
    exercise_logs: [{ exercise_name: index === 30 ? "Special row" : "Goblet Squat", actual_reps: 8, actual_unit: "reps", weight_lbs: 25, skipped: false }],
  }));
  await page.goto("/history");
  await expect(page.getByRole("heading", { name: "Best sets in this view", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Load older sessions", exact: true }).click();
  await page.getByLabel("Search loaded sessions", { exact: true }).fill("Special row");
  await expect(page.getByRole("link").filter({ hasText: "Session 30" })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export shown sessions", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/fitbae-workouts.*\.csv$/);
});

test("dashboard keeps weekly totals from an older plan", async ({ page, app }) => {
  app.history = [{ id: "old-plan-session", plan_id: "old-plan", day: "Monday", status: "completed", duration_seconds: 1800, finished_at: new Date().toISOString() }];
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "1 of 2 sessions done", exact: true })).toBeVisible();
});

test("a missing reset session offers a fresh link instead of a dead-end form", async ({ page, app }) => {
  await signedOut(page);
  await page.goto("/auth?mode=reset");
  await expect(page.getByRole("alert")).toContainText("missing or has expired");
  await expect(page.getByRole("button", { name: "Update password", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Request a new reset link", exact: true }).click();
  await expect(page).toHaveURL(/mode=forgot/);
  expect(app.authUpdates).toHaveLength(0);
});

test("missing workout RPC keeps the draft and a retry reuses its save identifier", async ({ page, app }) => {
  app.workoutError = { code: "PGRST202", message: "Could not find finalize_workout" };
  await page.goto("/plan?day=Monday");
  await page.getByRole("button", { name: "Start this workout", exact: true }).click();
  await page.getByRole("button", { name: "Complete set 1", exact: true }).click();
  await page.getByRole("button", { name: "Next exercise", exact: true }).click();
  await page.getByRole("button", { name: "Review & finish", exact: true }).click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(page.getByText(/Workout saving needs a database update/)).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("fitbae-active-workout")).completedSets)).toBe(1);
  app.workoutError = null;
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Work logged. Nicely done.", exact: true })).toBeVisible();
  expect(app.workouts).toHaveLength(2);
  expect(app.workouts[0].p_idempotency_key).toBe(app.workouts[1].p_idempotency_key);
});

test("a committed save stays successful if the browser cannot clear its draft", async ({ page, app }) => {
  await page.goto("/plan?day=Monday");
  await page.getByRole("button", { name: "Start this workout", exact: true }).click();
  await page.getByRole("button", { name: "Complete set 1", exact: true }).click();
  await page.getByRole("button", { name: "Next exercise", exact: true }).click();
  await page.getByRole("button", { name: "Review & finish", exact: true }).click();
  await page.evaluate(() => {
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (key) { if (key === "fitbae-active-workout") throw new Error("Storage unavailable"); return remove.call(this, key); };
  });
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Work logged. Nicely done.", exact: true })).toBeVisible();
  await expect(page.getByText("Workout not saved", { exact: true })).toHaveCount(0);
  expect(app.workouts).toHaveLength(1);
});
