import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { decodeFile } from './helpers';

const SITE = 'https://qr-code-generator-designer.vercel.app/';

test('share tags point at the live site, and the share image QR opens it', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    `${SITE}og.png`,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', SITE);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', SITE);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /QR codes/);

  const image = await request.get('/og.png');
  expect(image.ok()).toBe(true);
  const decoded = await decodeFile(page, await readFile('public/og.png'), 'image/png');
  expect([decoded.width, decoded.height]).toEqual([1200, 630]);
  expect(decoded.text).toBe(SITE);
});
