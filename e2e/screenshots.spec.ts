import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { download, fillInputs } from './helpers';

// Regenerates the README screenshots. Skipped in normal runs: npm run screenshots
test.skip(!process.env.SCREENSHOTS, 'Only runs with npm run screenshots');

const SITE = { type: 'url', values: { url: 'qr-code-generator-designer.vercel.app' } } as const;
const OUT = 'screenshots';

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.scan-badge')).not.toHaveText('Checking');
  await page.mouse.move(0, 0);
}

async function preset(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  test('light', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await fillInputs(page, SITE);
    await preset(page, 'Blueprint');
    await settle(page);
    await page.screenshot({ path: `${OUT}/desktop-light.png` });
  });

  test('dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await fillInputs(page, SITE);
    await preset(page, 'Night');
    await settle(page);
    await page.screenshot({ path: `${OUT}/desktop-dark.png` });
  });

  test('wifi form with a validation error', async ({ page }) => {
    await page.goto('/');
    await fillInputs(page, {
      type: 'wifi',
      values: { ssid: 'SRM Library', security: 'WPA', password: 'gdg2026', hidden: false },
    });
    await page.getByLabel('Password', { exact: true }).blur();
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: `${OUT}/wifi-error.png`,
      clip: { x: 0, y: 0, width: 1440, height: 640 },
    });
  });

  test('scan check warning with a fix', async ({ page }) => {
    await page.goto('/');
    await fillInputs(page, SITE);
    await page.getByRole('slider', { name: 'Margin' }).fill('1');
    await page.getByRole('textbox', { name: 'Dots', exact: true }).fill('#6f6a60');
    await page.getByRole('textbox', { name: 'Dots', exact: true }).blur();
    await expect(page.locator('.scan-badge')).toHaveText('Warning');
    await settle(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page
      .getByRole('region', { name: 'Preview' })
      .screenshot({ path: `${OUT}/scan-warning.png` });
  });

  test('recent codes', async ({ page }) => {
    await page.goto('/');
    const codes: [Parameters<typeof fillInputs>[1], string][] = [
      [{ type: 'phone', values: { phone: '+91 44 2741 7000' } }, 'Newsprint'],
      [
        {
          type: 'wifi',
          values: { ssid: 'SRM Library', security: 'WPA', password: 'quietzone4', hidden: false },
        },
        'Receipt',
      ],
      [
        { type: 'email', values: { to: 'gdg@srmist.edu.in', subject: 'Joining GDG', body: '' } },
        'Stamp',
      ],
      [SITE, 'Rust'],
    ];
    for (const [input, look] of codes) {
      await fillInputs(page, input);
      await preset(page, look);
      await download(page, 'Download PNG');
    }
    await expect(page.getByRole('region', { name: 'Recent' }).getByRole('listitem')).toHaveCount(4);
    await page.mouse.move(0, 0);
    await page.getByRole('region', { name: 'Recent' }).screenshot({ path: `${OUT}/recent.png` });
  });

  test('styled code with gradient and logo', async ({ page }) => {
    await page.goto('/');
    await fillInputs(page, SITE);
    await preset(page, 'Rust');
    await page
      .getByRole('group', { name: 'Error correction' })
      .getByRole('radio', { name: 'H' })
      .check();
    await page.locator('input[type=file]').setInputFiles({
      name: 'quiet-zone.svg',
      mimeType: 'image/svg+xml',
      buffer: await readFile('public/favicon.svg'),
    });
    await expect(page.locator('.scan-badge')).toHaveText('Pass');
    await settle(page);
    await page.locator('.preview').screenshot({ path: `${OUT}/styled.png` });
  });
});

test.describe('mobile', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  test('phone', async ({ page }) => {
    await page.goto('/');
    await fillInputs(page, SITE);
    await preset(page, 'Stamp');
    await page.getByRole('textbox', { name: 'Web address' }).blur();
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page);
    await page.screenshot({ path: `${OUT}/mobile.png` });
  });
});
