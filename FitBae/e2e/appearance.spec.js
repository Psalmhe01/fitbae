import { test, expect } from './fixtures.js';

test('color and brightness persist independently, and workout settings have their own page', async ({ page, app }, testInfo) => {
  expect(app.profile).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings');
  const picker = page.getByRole('group', { name: 'Color theme', exact: true });
  for (const [label, id] of [['Coast', 'blue'], ['Rose', 'pink'], ['Iris', 'purple'], ['Cocoa', 'brown'], ['Original', 'green']]) {
    await picker.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-palette', id);
    await page.getByRole('button', { name: 'Use dark theme', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Use light theme', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await picker.getByRole('button', { name: 'Iris', exact: true }).click();
  await page.getByRole('button', { name: 'Use dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'purple');
  await expect(page.getByRole('heading', { name: 'Appearance', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('iris-dark.png'), animations: 'disabled' });
  await expect(page.getByText('Icon switching requires the updated Android app.', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Edit workout settings' }).click();
  await expect(page).toHaveURL(/settings\/workout/);
  await expect(page.getByRole('heading', { name: 'Training setup' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Appearance' })).toHaveCount(0);
});
