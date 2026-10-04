import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('loads without console errors or warnings', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') messages.push(msg.text());
  });
  page.on('pageerror', (err) => messages.push(err.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Quiet Zone');
  await page.evaluate(() => navigator.serviceWorker.ready);
  expect(messages).toEqual([]);
});
