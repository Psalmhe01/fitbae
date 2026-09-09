import { test, expect } from "./fixtures.js";

test("account loading shows paired weights and hands off to the app", async ({ page, app }, testInfo) => {
  expect(app.profile).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let release;
  const ready = new Promise((resolve) => { release = resolve; });
  await page.route("**/rest/v1/profiles**", async (route) => { await ready; await route.fallback(); });
  try {
    await page.goto("/plan?day=Monday");
    const loading = page.getByRole("status").filter({ hasText: "Getting your space ready" });
    await expect(loading).toBeVisible();
    await expect(loading.getByText("Better together.")).toBeVisible();
    await expect(loading.locator(".fitbae-weight")).toHaveCount(2);
    expect(await loading.locator(".fitbae-weight-one").evaluate((node) => getComputedStyle(node).animationName)).toBe("fitbae-warmup");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("loading-phone.png"), animations: "disabled" });
  } finally { release(); }
  await expect(page.getByRole("heading", { name: "Your plan", exact: true })).toBeVisible();
  await expect(page.locator(".fitbae-loading-screen")).toHaveCount(0);
});

test("plan loading respects reduced motion and recovers from an error", async ({ page, app }, testInfo) => {
  app.planError = true;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("fitbae-color-scheme", "dark"));
  let release;
  const ready = new Promise((resolve) => { release = resolve; });
  await page.route("**/rest/v1/workout_plans**", async (route) => { await ready; await route.fallback(); });
  try {
    await page.goto("/plan?day=Monday");
    const loading = page.getByRole("status").filter({ hasText: "Getting your training week ready" });
    await expect(loading).toBeVisible();
    expect(await loading.locator(".fitbae-weight-one").evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
    await loading.screenshot({ path: testInfo.outputPath("loading-reduced-dark.png") });
  } finally { release(); }
  await expect(page.getByRole("button", { name: /Try again/i })).toBeVisible();
  app.planError = false;
  await page.getByRole("button", { name: /Try again/i }).click();
  await expect(page.getByRole("heading", { name: "Your plan", exact: true })).toBeVisible();
});
