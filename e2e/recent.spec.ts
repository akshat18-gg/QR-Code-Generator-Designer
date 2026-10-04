import { expect, test, type Page } from '@playwright/test';
import { RECENT_KEY } from '../src/state/recent';
import { download, fillInputs, makePng, previewMarkup } from './helpers';

function recentList(page: Page) {
  return page.getByRole('region', { name: 'Recent' }).getByRole('listitem');
}

async function saveUrl(page: Page, url: string) {
  await fillInputs(page, { type: 'url', values: { url } });
  await download(page, 'Download PNG');
}

test('saves on download, not while typing, and survives a reload', async ({ page }) => {
  await page.goto('/');
  await fillInputs(page, { type: 'url', values: { url: 'example.com' } });
  await page.waitForTimeout(500);
  await expect(page.getByText('Codes you download or copy show up here.')).toBeVisible();

  await download(page, 'Download PNG');
  await expect(recentList(page)).toHaveCount(1);
  await expect(recentList(page).first()).toContainText('example.com');

  await page.reload();
  await expect(recentList(page)).toHaveCount(1);
  await expect(recentList(page).first().locator('img')).toHaveAttribute('src', /^data:image\/png/);
});

test('clicking a recent code restores the type, inputs and every setting', async ({ page }) => {
  await page.goto('/');
  await fillInputs(page, {
    type: 'wifi',
    values: { ssid: 'SRM Lab', security: 'WEP', password: 'abcde', hidden: true },
  });
  await page.getByRole('button', { name: 'Stamp' }).click();
  await page
    .getByRole('group', { name: 'Error correction' })
    .getByRole('radio', { name: 'H' })
    .check();
  await page
    .getByRole('group', { name: 'Gradient on dots' })
    .getByRole('radio', { name: 'Linear' })
    .check();
  await page.getByRole('slider', { name: 'Image size' }).fill('768');
  await page.getByRole('slider', { name: 'Margin' }).fill('6');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await makePng(page) });
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toBeVisible();
  await expect(page.getByTestId('preview').locator('svg').last()).toHaveAttribute('width', '768');
  const saved = await previewMarkup(page);
  await download(page, 'SVG');
  await expect(recentList(page)).toHaveCount(1);

  await page.reload();
  await expect(page.getByRole('tab', { name: 'Link' })).toHaveAttribute('aria-selected', 'true');
  await recentList(page).first().getByRole('button').first().click();

  await expect(page.getByRole('tab', { name: 'Wi-Fi' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('textbox', { name: 'Network name' })).toHaveValue('SRM Lab');
  await expect(page.getByRole('radio', { name: 'WEP' })).toBeChecked();
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('abcde');
  await expect(page.getByLabel('Hidden network')).toBeChecked();
  await expect(page.getByRole('region', { name: 'Presets' })).toContainText('Custom');
  await expect(
    page.getByRole('group', { name: 'Error correction' }).getByRole('radio', { name: 'H' }),
  ).toBeChecked();
  await expect(
    page.getByRole('group', { name: 'Dots' }).getByRole('radio', { name: 'Extra round' }),
  ).toBeChecked();
  await expect(page.getByRole('textbox', { name: 'Dots, start', exact: true })).toHaveValue(
    '#9b2226',
  );
  await expect(page.getByRole('slider', { name: 'Image size' })).toHaveValue('768');
  await expect(page.getByRole('slider', { name: 'Margin' })).toHaveValue('6');
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toBeVisible();
  // Same drawing, apart from the logo, which is stored smaller.
  const withoutLogo = (markup: string) => markup.replace(/<image[^>]*>/, '');
  await expect.poll(async () => withoutLogo(await previewMarkup(page))).toBe(withoutLogo(saved));
});

test('saving the same code twice moves it to the top instead of duplicating', async ({ page }) => {
  await page.goto('/');
  await saveUrl(page, 'a.co');
  await saveUrl(page, 'b.co');
  await expect(recentList(page)).toHaveCount(2);
  await saveUrl(page, 'a.co');
  await expect(recentList(page)).toHaveCount(2);
  await expect(recentList(page).first()).toContainText('a.co');
});

test('copying also saves', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await fillInputs(page, { type: 'phone', values: { phone: '+91 98765 43210' } });
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(recentList(page)).toHaveCount(1);
  await expect(recentList(page).first()).toContainText('+91 98765 43210');
});

test('keeps only the latest 12', async ({ page }) => {
  await page.goto('/');
  for (let i = 1; i <= 13; i++) await saveUrl(page, `site${i}.com`);
  await expect(recentList(page)).toHaveCount(12);
  await expect(recentList(page).first()).toContainText('site13.com');
  await expect(recentList(page).last()).toContainText('site2.com');
});

test('removes one, and clear all asks first', async ({ page }) => {
  await page.goto('/');
  await saveUrl(page, 'a.co');
  await saveUrl(page, 'b.co');
  await saveUrl(page, 'c.co');

  await page.getByRole('button', { name: 'Remove Link code: b.co' }).click();
  await expect(recentList(page)).toHaveCount(2);

  const clear = page.getByRole('button', { name: 'Clear all' });
  await clear.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Remove all 2 recent codes?');
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(clear).toBeFocused();

  await clear.click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(recentList(page)).toHaveCount(2);

  await clear.click();
  await page.getByRole('button', { name: 'Remove all' }).click();
  await expect(recentList(page)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Codes you download or copy show up here.')).toBeVisible();
});

test('corrupt stored data does not break the app', async ({ page }) => {
  await page.addInitScript((key) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(key, '{"oops": [1, 2');
      sessionStorage.setItem('seeded', '1');
    }
  }, RECENT_KEY);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Codes you download or copy show up here.')).toBeVisible();
  await saveUrl(page, 'a.co');
  await expect(recentList(page)).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('a full storage quota shows a message instead of crashing', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await saveUrl(page, 'a.co');
  await expect(page.getByRole('region', { name: 'Recent' }).getByRole('alert')).toHaveText(
    "Couldn't save recent codes. Browser storage is full or turned off.",
  );
  await expect(recentList(page)).toHaveCount(1);
  expect(errors).toEqual([]);
});
