import { test, expect, photoFile, seedAvatar, USER_ID } from "./fixtures.js";

test("a populated Plan renders, opens guidance, swaps one movement, and supports undo", async ({ page, app }) => {
  await page.goto("/plan?day=Monday");
  await expect(page.getByRole("heading", { name: "Your plan", exact: true })).toBeVisible();
  await expect(page.getByText("Dumbbell Bench Press", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Form guide", exact: true }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Detailed steps", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Swap", exact: true }).first().click();
  await page.getByRole("button", { name: /Choose Incline Dumbbell Bench Press/ }).click();
  await page.getByRole("button", { name: "Use Incline Dumbbell Bench Press", exact: true }).click();
  await expect(page.getByText("Swap saved to this plan.")).toBeVisible();
  expect(app.plan.plan_json.weekly_schedule[0].exercises[0].name).toBe("Incline Dumbbell Bench Press");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByText("Dumbbell Bench Press", { exact: true })).toBeVisible();
  expect(app.plan.plan_json.weekly_schedule[0].exercises[0].sets).toBe(3);
});

test("Plan recovers from failed data loading", async ({ page, app }) => {
  app.planError = true;
  await page.goto("/plan");
  await expect(page.getByText("Your plan couldn't open", { exact: true })).toBeVisible();
  app.planError = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your plan", exact: true })).toBeVisible();
});

test("Plan handles malformed legacy data without a blank page", async ({ page, app }) => {
  app.plan.plan_json = "{broken-json";
  await page.goto("/plan");
  await expect(page.getByText("This saved plan couldn't be read. Rebuild it from Today.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
});

test("day selection survives reload and Plan fits a phone screen", async ({ page, app }, testInfo) => {
  expect(app.plan).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/plan?day=Monday");
  await page.getByRole("button", { name: "Thursday: Full body strength", exact: true }).click();
  await expect(page).toHaveURL(/day=Thursday/);
  await page.reload();
  await expect(page.getByRole("button", { name: "Thursday: Full body strength", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("plan-mobile.png"), fullPage: true });
});

test("avatar selection persists across routes and reloads", async ({ page, app }, testInfo) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Change picture", exact: true }).click();
  await page.getByRole("button", { name: "Choose Botanical avatar", exact: true }).click();
  await page.getByRole("dialog").evaluate((dialog) => { dialog.scrollTop = 0; });
  await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("avatar-picker.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Save picture", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(app.user.user_metadata.fitbae_avatar).toEqual({ type: "preset", id: "botanical" });
  await page.getByRole("link", { name: "Back to profile", exact: true }).click();
  await expect(page.getByRole("img", { name: "Botanical avatar", exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("img", { name: "Botanical avatar", exact: true }).first()).toBeVisible();
});

test("upload crops a photo and saves a private storage reference", async ({ page, app }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Change picture", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(await photoFile(page));
  await expect(page.getByRole("img", { name: "Cropped profile photo preview", exact: true })).toBeVisible();
  await page.getByRole("slider", { name: "Zoom", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Save picture", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(app.uploads).toHaveLength(1);
  expect(app.user.user_metadata.fitbae_avatar).toEqual({ type: "upload", path: app.uploads[0].path });
  expect(app.uploads[0].path).toMatch(new RegExp(`^${USER_ID}/avatar-.+\\.jpg$`));
  await expect(page.getByAltText("Alex Rivera profile picture").first()).toBeVisible();
});

test("a failed upload leaves the saved avatar intact and allows retry", async ({ page, app }) => {
  app.uploadError = true;
  await page.goto("/settings");
  await page.getByRole("button", { name: "Change picture", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(await photoFile(page));
  await expect(page.getByRole("img", { name: "Cropped profile photo preview", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save picture", exact: true }).click();
  await expect(page.getByText("Your photo couldn't be uploaded. Try again, or choose a built-in avatar.")).toBeVisible();
  expect(app.authUpdates).toHaveLength(0);
  app.uploadError = false;
  await page.getByRole("button", { name: "Save picture", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("invalid photo types are rejected and cancel never writes metadata", async ({ page, app }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Change picture", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "avatar.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  await expect(page.getByText("Choose a JPG, PNG, or WebP photo.")).toBeVisible();
  await page.getByRole("button", { name: "Choose Daybreak avatar", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(app.authUpdates).toHaveLength(0);
  expect(app.uploads).toHaveLength(0);
});

test("workout edits and session identity survive a hard refresh", async ({ page, app }) => {
  expect(app.plan).toBeTruthy();
  await page.goto("/plan?day=Monday");
  await page.getByRole("button", { name: "Start this workout", exact: true }).click();
  const reps = page.getByRole("textbox", { name: "Dumbbell Bench Press set 1 completed reps", exact: true });
  await reps.fill("7");
  await page.getByRole("button", { name: "Complete set 1", exact: true }).click();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("fitbae-active-workout")));
  await page.reload();
  await expect(reps).toHaveValue("7");
  await expect(page.getByRole("button", { name: "Mark set 1 incomplete", exact: true })).toBeVisible();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("fitbae-active-workout")));
  expect(after.idempotencyKey).toBe(before.idempotencyKey);
  expect(after.startedAt).toBe(before.startedAt);
});

test("Together uses the connected partner's chosen avatar", async ({ page, app }) => {
  app.connected = true;
  await page.goto("/together");
  await expect(page.getByRole("img", { name: "Tide avatar", exact: true })).toBeVisible();
});

test("onboarding reaches the equipment step without crashing", async ({ page, app }) => {
  expect(app.user).toBeTruthy();
  await page.goto("/onboarding");
  await page.getByRole("textbox", { name: "Age", exact: true }).fill("28");
  await page.getByRole("textbox", { name: "Weight in lbs", exact: true }).fill("150");
  await page.getByRole("textbox", { name: "Feet", exact: true }).fill("5");
  await page.getByRole("textbox", { name: "Inches", exact: true }).fill("9");
  await page.getByRole("button", { name: "Choose training goals", exact: true }).click();
  await page.getByRole("button", { name: "Choose equipment", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What can you use?", exact: true })).toBeVisible();
  await expect(page.getByText("38 selected", { exact: true })).toBeVisible();
});

test("a failed avatar metadata save cleans up the new photo without changing the old choice", async ({ page, app }) => {
  app.metadataError = true;
  await seedAvatar(page, app, { type: "preset", id: "orbit" });
  await page.getByRole("button", { name: "Change picture", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(await photoFile(page));
  await expect(page.getByRole("img", { name: "Cropped profile photo preview", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save picture", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Could not update your picture" })).toBeVisible();
  expect(app.removed).toEqual([app.uploads[0].path]);
  expect(app.user.user_metadata.fitbae_avatar).toEqual({ type: "preset", id: "orbit" });
});

test("replacing an uploaded photo with initials removes only the previous owned file", async ({ page, app }) => {
  const previous = `${USER_ID}/avatar-previous.jpg`;
  await seedAvatar(page, app, { type: "upload", path: previous });
  await page.getByRole("button", { name: "Change picture", exact: true }).click();
  await page.getByRole("button", { name: "Use my initials", exact: true }).click();
  await page.getByRole("button", { name: "Save picture", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect.poll(() => app.removed).toEqual([previous]);
  expect(app.user.user_metadata.fitbae_avatar).toEqual({ type: "initials" });
});

test("mobile Preferences saves cleanly and keeps controls above navigation", async ({ page, app }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("  Alex  ");
  const save = page.getByRole("button", { name: "Save profile", exact: true });
  await save.click();
  await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("Alex");
  await expect(save).toBeDisabled();
  expect(app.profile.name).toBe("Alex");
  const saveRect = await save.boundingBox();
  const navRect = await page.getByRole("navigation", { name: "Primary navigation", exact: true }).last().boundingBox();
  expect(saveRect.y + saveRect.height).toBeLessThan(navRect.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Use dark theme", exact: true }).click();
  await page.getByRole("button", { name: "Change picture", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
  await expect(page.getByRole("dialog")).toHaveCSS("background-color", "rgb(30, 35, 28)");
  await page.screenshot({ path: testInfo.outputPath("avatar-mobile-dark.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Choose Tide avatar", exact: true }).click();
  await page.getByRole("button", { name: "Save picture", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("Plan has a usable empty state and a two-column tablet layout", async ({ page, app }, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/plan?day=Monday");
  await expect(page.getByRole("heading", { name: "Your plan", exact: true })).toBeVisible();
  const main = await page.locator(".plan-main").boundingBox();
  const side = await page.locator(".plan-side").boundingBox();
  expect(side.x).toBeGreaterThan(main.x);
  expect(Math.abs(main.y - side.y)).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("plan-tablet.png"), fullPage: true });
  app.plan = null;
  await page.reload();
  await expect(page.getByRole("heading", { name: "No active plan yet", exact: true })).toBeVisible();
});
