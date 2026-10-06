import { expect, test, type Locator } from '@playwright/test';

// Share of the strip's width a segment covers, after its transform.
function share(segment: Locator) {
  return segment.evaluate((el) => {
    const bar = el.parentElement?.getBoundingClientRect().width ?? 1;
    return el.getBoundingClientRect().width / bar;
  });
}

test('the colour strip and tab underline follow the selected tab', async ({ page }) => {
  await page.goto('/');
  const strip = page.locator('.colour-strip');
  const underline = page.locator('.type-underline');
  await expect(strip).toHaveAttribute('data-active', 'blue');

  for (const [tab, colour] of [
    ['Text', 'red'],
    ['Email', 'yellow'],
    ['Phone', 'green'],
    ['Wi-Fi', 'all'],
    ['Link', 'blue'],
  ] as const) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(strip).toHaveAttribute('data-active', colour);
    await expect(underline).toHaveAttribute('data-colour', colour);
  }

  await page.getByRole('tab', { name: 'Phone' }).click();
  await expect.poll(() => share(strip.locator('.strip-green'))).toBeCloseTo(0.5, 2);
  await expect.poll(() => share(strip.locator('.strip-blue'))).toBeCloseTo(1 / 6, 2);
  await expect(strip.locator('.strip-shimmer')).toHaveCount(0);

  // Wi-Fi: four equal segments and a shimmer.
  await page.getByRole('tab', { name: 'Wi-Fi' }).click();
  for (const colour of ['blue', 'red', 'yellow', 'green']) {
    await expect.poll(() => share(strip.locator(`.strip-${colour}`))).toBeCloseTo(0.25, 2);
  }
  await expect(strip.locator('.strip-shimmer')).toHaveCount(1);
  expect((await strip.boundingBox())?.height).toBe(4);
});

test('with reduced motion the strip changes instantly and has no shimmer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const strip = page.locator('.colour-strip');
  await page.getByRole('tab', { name: 'Text' }).click();
  expect(await share(strip.locator('.strip-red'))).toBeCloseTo(0.5, 2);
  await page.getByRole('tab', { name: 'Wi-Fi' }).click();
  await expect(strip.locator('.strip-shimmer')).toBeHidden();
});
