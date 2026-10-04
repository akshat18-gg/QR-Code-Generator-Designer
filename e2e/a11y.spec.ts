import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { fillInputs, makePng } from './helpers';

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(', ')}`,
    );
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test('empty page has no serious or critical axe violations', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
      expect(await seriousViolations(page)).toEqual([]);
    });

    test('a full page with errors, warnings, recents and a popover has none either', async ({
      page,
    }) => {
      await page.goto('/');
      await fillInputs(page, { type: 'url', values: { url: 'example.com' } });
      await page
        .locator('input[type=file]')
        .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await makePng(page) });
      await page.getByRole('slider', { name: 'Margin' }).fill('1');
      await expect(page.getByRole('region', { name: 'Scan check' })).toContainText(
        'Raise error correction to H',
      );
      await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Download PNG' }).click(),
      ]);
      await expect(page.getByRole('region', { name: 'Recent' }).getByRole('listitem')).toHaveCount(
        1,
      );
      await page.getByRole('tab', { name: 'Wi-Fi' }).click();
      const password = page.getByLabel('Password', { exact: true });
      await password.fill('short');
      await password.blur();
      await page.getByRole('button', { name: 'Clear all' }).click();
      expect(await seriousViolations(page)).toEqual([]);
    });
  });
}

test('first visit follows the system setting, including live changes', async ({ page }) => {
  const html = page.locator('html');
  const toggle = page.getByRole('button', { name: /^Switch to (dark|light) theme$/ });

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAccessibleName('Switch to light theme');

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAccessibleName('Switch to dark theme');
});

test('the toggle switches the theme and remembers it after a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0d1520');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();

  // Once chosen, the system setting no longer overrides it.
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');
});

test('the toggle is a 44px round button with a focus ring', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: /^Switch to/ });
  const box = await toggle.boundingBox();
  expect(box && Math.round(box.width) >= 44 && Math.round(box.height) >= 44).toBe(true);
  await toggle.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const outline = await toggle.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('with reduced motion the header shows its final state straight away', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.tagline [aria-hidden]')).toHaveText('QR codes that scan.');
  const animations = await page.evaluate(
    () => document.getAnimations().filter((a) => a.playState === 'running').length,
  );
  expect(animations).toBe(0);
});

test('the tagline decodes to the real text', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.tagline [aria-hidden]')).toHaveText('QR codes that scan.');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quiet Zone');
});

test('the saved theme is applied before first paint', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('quietzone:theme', 'dark'));
  await page.emulateMedia({ colorScheme: 'light' });
  // Block the app bundle so only the HTML's inline script can have set the theme.
  await page.route('**/assets/*.js', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('every control can be reached with the keyboard and shows a focus ring', async ({ page }) => {
  await page.goto('/');
  await fillInputs(page, { type: 'url', values: { url: 'example.com' } });
  await page.locator('body').focus();
  const seen = new Set<string>();
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const ring =
        (style.outlineStyle !== 'none' && style.outlineWidth !== '0px') ||
        // Radio and file inputs are invisible; their visible sibling shows the ring.
        ['radio', 'file'].includes((el as HTMLInputElement).type ?? '');
      const name =
        el.getAttribute('aria-label') ??
        (el as HTMLInputElement).labels?.[0]?.textContent ??
        el.textContent ??
        '';
      return { key: `${el.tagName}:${name.trim().slice(0, 30)}`, ring };
    });
    if (!info) continue;
    expect(info.ring, `${info.key} has no focus ring`).toBe(true);
    seen.add(info.key);
  }
  const all = [...seen].join('\n');
  for (const name of [
    'Skip to preview',
    'Link',
    'Newsprint',
    'Swap colours',
    'Upload logo',
    'Download PNG',
    'Copy',
  ]) {
    expect(all).toContain(name);
  }
});

test('skip link jumps to the preview', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to preview' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Preview' })).toBeFocused();
});
