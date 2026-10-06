import { expect, test, type Locator, type Page } from '@playwright/test';
import { download, fillInputs } from './helpers';

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

// Sum of alpha over the canvas, as a rough measure of how much is lit.
function inkOnCanvas(page: Page) {
  return page.locator('canvas.pixel-grid').evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data;
    let sum = 0;
    for (let i = 3; i < (data?.length ?? 0); i += 4) sum += data?.[i] ?? 0;
    return sum;
  });
}

async function nextFrames(page: Page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

test.describe('header pixel grid', () => {
  test.use({ deviceScaleFactor: 2 });

  test('ripples once on load, then lights up and fades where the pointer moves', async ({
    page,
  }) => {
    await page.goto('/');
    const grid = page.locator('canvas.pixel-grid');
    await expect(grid).toHaveAttribute('aria-hidden', 'true');
    await expect(grid).toHaveAttribute('data-mode', 'interactive');
    // The load ripple runs, then the loop stops by itself.
    await expect(grid).toHaveAttribute('data-animating', 'false', { timeout: 3000 });
    const resting = await inkOnCanvas(page);

    const box = await page.locator('.masthead').boundingBox();
    if (!box) throw new Error('No header');
    await page.mouse.move(box.width * 0.4, box.y + box.height / 2);
    await page.mouse.move(box.width * 0.6, box.y + box.height / 2, { steps: 8 });
    await expect(grid).toHaveAttribute('data-animating', 'true');
    expect(await inkOnCanvas(page)).toBeGreaterThan(resting * 1.2);

    await expect(grid).toHaveAttribute('data-animating', 'false', { timeout: 2000 });
    expect(await inkOnCanvas(page)).toBe(resting);
  });

  test('is drawn at the screen resolution', async ({ page }) => {
    await page.goto('/');
    const size = await page
      .locator('canvas.pixel-grid')
      .evaluate((canvas: HTMLCanvasElement) => [
        canvas.width,
        Math.round(canvas.getBoundingClientRect().width * 2),
      ]);
    expect(size[0]).toBe(size[1]);
  });

  test('never blocks the theme toggle', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Switch to dark theme' });
    const box = await toggle.boundingBox();
    if (!box) throw new Error('No toggle');
    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x ?? 0, y ?? 0)?.closest('button')?.className,
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    expect(hit).toBe('theme-toggle');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('does not run while off-screen or in a hidden tab', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 400 });
    await page.goto('/');
    const grid = page.locator('canvas.pixel-grid');
    await expect(grid).toHaveAttribute('data-animating', 'false', { timeout: 3000 });
    const nudge = () =>
      page.evaluate(() => {
        const header = document.querySelector('.masthead');
        for (const x of [200, 260, 320]) {
          header?.dispatchEvent(
            new PointerEvent('pointermove', { pointerType: 'mouse', clientX: x, clientY: 50 }),
          );
        }
      });

    await page.evaluate(() => window.scrollTo(0, 1500));
    await nextFrames(page);
    await nudge();
    await nextFrames(page);
    await expect(grid).toHaveAttribute('data-animating', 'false');

    await page.evaluate(() => window.scrollTo(0, 0));
    await nextFrames(page);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await nudge();
    await nextFrames(page);
    await expect(grid).toHaveAttribute('data-animating', 'false');
  });

  test.describe('on a touch screen', () => {
    test.use({ hasTouch: true });

    test('a tap sends out a ripple', async ({ page }) => {
      await page.goto('/');
      const grid = page.locator('canvas.pixel-grid');
      await expect(grid).toHaveAttribute('data-animating', 'false', { timeout: 3000 });
      const box = await page.locator('.masthead').boundingBox();
      if (!box) throw new Error('No header');
      await page.touchscreen.tap(box.width / 2, box.y + box.height / 2);
      await expect(grid).toHaveAttribute('data-animating', 'true');
      await expect(grid).toHaveAttribute('data-animating', 'false', { timeout: 3000 });
    });
  });

  test('with reduced motion it is a still grid that does not react', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const grid = page.locator('canvas.pixel-grid');
    await expect(grid).toHaveAttribute('data-mode', 'static');
    await expect(grid).toHaveAttribute('data-animating', 'false');
    const still = await inkOnCanvas(page);
    expect(still).toBeGreaterThan(0);

    const box = await page.locator('.masthead').boundingBox();
    if (!box) throw new Error('No header');
    await page.mouse.move(box.width * 0.3, box.y + box.height / 2);
    await page.mouse.move(box.width * 0.7, box.y + box.height / 2, { steps: 8 });
    await nextFrames(page);
    await expect(grid).toHaveAttribute('data-animating', 'false');
    expect(await inkOnCanvas(page)).toBe(still);
  });
});

test.describe('confetti', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('bursts from the button after a download or copy, then cleans up', async ({ page }) => {
    await page.goto('/');
    await fillInputs(page, { type: 'url', values: { url: 'example.com' } });
    const confetti = page.locator('.confetti');

    await download(page, 'Download PNG');
    await expect(confetti).toHaveCount(1);
    await expect(confetti).toHaveAttribute('aria-hidden', 'true');
    expect(await confetti.locator('span').count()).toBeGreaterThanOrEqual(20);
    expect(await confetti.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
    await expect(page.getByRole('region', { name: 'Export' }).getByRole('status')).toHaveText(
      'Saved PNG',
    );
    await expect(confetti).toHaveCount(0, { timeout: 2000 });

    const copy = page.getByRole('button', { name: 'Copy' });
    await copy.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'Export' }).getByRole('status')).toHaveText(
      'Copied',
    );
    await expect(confetti).toHaveCount(1);
    await expect(copy).toBeFocused();
    await expect(confetti).toHaveCount(0, { timeout: 2000 });
  });

  test('repeated downloads never stack more than two bursts', async ({ page }) => {
    await page.goto('/');
    await fillInputs(page, { type: 'url', values: { url: 'example.com' } });
    let most = 0;
    for (let i = 0; i < 5; i++) {
      await download(page, 'SVG');
      most = Math.max(most, await page.locator('.confetti').count());
    }
    expect(most).toBeGreaterThan(0);
    expect(most).toBeLessThanOrEqual(2);
  });

  test('no confetti when the copy fails', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.clipboard.write = () => Promise.reject(new Error('blocked'));
    });
    await page.goto('/');
    await fillInputs(page, { type: 'url', values: { url: 'example.com' } });
    await page.getByRole('button', { name: 'Copy' }).click();
    await expect(page.getByRole('region', { name: 'Export' }).getByRole('status')).toContainText(
      "Couldn't copy",
    );
    await expect(page.locator('.confetti')).toHaveCount(0);
  });

  test('no confetti with reduced motion, just the message', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await fillInputs(page, { type: 'url', values: { url: 'example.com' } });
    await download(page, 'Download PNG');
    await expect(page.getByRole('region', { name: 'Export' }).getByRole('status')).toHaveText(
      'Saved PNG',
    );
    await expect(page.locator('.confetti')).toHaveCount(0);
  });
});
