import { expect, test } from '@playwright/test';
import {
  collectConsoleProblems,
  downloadAndDecode,
  expectPreviewReady,
  fillInputs,
} from './helpers';

test.use({ serviceWorkers: 'allow' });

test('works offline after the first visit', async ({ page, context }) => {
  const problems = collectConsoleProblems(page);
  await page.goto('/');
  // Ready means installed and activated, which is after precaching finished.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('QRaft');
  expect(await page.evaluate(() => document.fonts.check('16px "IBM Plex Sans"'))).toBe(true);

  await fillInputs(page, { type: 'text', values: { text: 'Works with no signal' } });
  await expectPreviewReady(page);
  expect((await downloadAndDecode(page, 'png')).text).toBe('Works with no signal');
  await expect(page.getByRole('region', { name: 'Scan check' }).locator('.scan-badge')).toHaveText(
    'Pass',
  );
  expect(problems).toEqual([]);
});

test('has an installable manifest', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const response = await request.get(href ?? '');
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: 'QRaft',
    short_name: 'QRaft',
    display: 'standalone',
    start_url: '/',
  });
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(
    true,
  );
  for (const icon of manifest.icons as { src: string }[]) {
    expect((await request.get(`/${icon.src}`)).ok(), icon.src).toBe(true);
  }
});
