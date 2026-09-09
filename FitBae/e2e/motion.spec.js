import { test, expect } from "./fixtures.js";

async function watchAnimations(page) {
  await page.addInitScript(() => {
    window.fitbaeMotionCalls = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (options?.id === "fitbae-content") window.fitbaeMotionCalls.push({ frames, id: this.id, className: this.className });
      return animate.call(this, frames, options);
    };
  });
}

test("plan day transitions keep the existing DOM and do not animate on unrelated changes", async ({ page, app }) => {
  expect(app.plan).toBeTruthy();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await watchAnimations(page);
  await page.goto("/plan?day=Monday");
  await expect(page.getByRole("button", { name: "Start this workout", exact: true })).toBeVisible();
  await page.locator(".plan-layout").evaluate((node) => { node.dataset.identity = "same-node"; });
  await page.getByRole("button", { name: /Tuesday/ }).click();
  await expect(page.locator(".plan-layout")).toHaveAttribute("data-identity", "same-node");
  await expect.poll(() => page.evaluate(() => window.fitbaeMotionCalls.filter((call) => call.className.includes("plan-layout")).length)).toBeGreaterThanOrEqual(2);
  const calls = await page.evaluate(() => window.fitbaeMotionCalls.length);
  await page.getByRole("button", { name: "Use dark theme", exact: true }).click();
  expect(await page.evaluate(() => window.fitbaeMotionCalls.length)).toBe(calls);
});

test("workout feedback preserves set entries and the viewport-fixed timer", async ({ page, app }) => {
  expect(app.plan).toBeTruthy();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/plan?day=Monday");
  await page.getByRole("button", { name: "Start this workout", exact: true }).click();
  await page.getByLabel("Dumbbell Bench Press set 1 weight in pounds", { exact: true }).fill("35");
  await page.getByRole("button", { name: "Complete set 1", exact: true }).click();
  await expect(page.locator(".workout-set").first()).toHaveAttribute("data-complete", "true");
  expect(await page.locator(".set-check svg").first().evaluate((node) => getComputedStyle(node).animationName)).toBe("fitbae-confirm");
  await page.getByRole("button", { name: "Next exercise", exact: true }).click();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByLabel("Dumbbell Bench Press set 1 weight in pounds", { exact: true })).toHaveValue("35");
  await expect(page.getByRole("button", { name: "Mark set 1 incomplete", exact: true })).toBeVisible();
  const dock = await page.locator(".workout-dock").boundingBox();
  expect(Math.abs(dock.x + dock.width / 2 - 195)).toBeLessThan(2);
  expect(dock.y + dock.height).toBeLessThanOrEqual(844);
  expect(await page.locator("#main-content").evaluate((node) => getComputedStyle(node).transform)).toBe("none");
});

test("reduced motion disables custom movement while keeping navigation and workouts usable", async ({ page, app }) => {
  expect(app.plan).toBeTruthy();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await watchAnimations(page);
  await page.goto("/plan?day=Monday");
  await page.getByRole("button", { name: "Start this workout", exact: true }).click();
  await page.getByRole("button", { name: "Complete set 1", exact: true }).click();
  expect(await page.locator(".set-check svg").first().evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  expect(await page.evaluate(() => window.fitbaeMotionCalls)).toHaveLength(0);
  await page.getByRole("button", { name: "Form guide", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
