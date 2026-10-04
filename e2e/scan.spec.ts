import { expect, test, type Page } from '@playwright/test';
import { PRESETS } from '../src/state/presets';
import { downloadAndDecode, fillInputs, makePng } from './helpers';

const URL_INPUT = { type: 'url', values: { url: 'gdg.community.dev/srm' } } as const;

function panel(page: Page) {
  return page.getByRole('region', { name: 'Scan check' });
}

async function expectBadge(page: Page, text: 'Pass' | 'Warning' | 'Fail') {
  await expect(panel(page).locator('.scan-badge')).toHaveText(text, { timeout: 5000 });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('has nothing to check before there is a code', async ({ page }) => {
  await expect(panel(page).getByRole('status')).toHaveText('Nothing to check yet.');
  await expect(panel(page).locator('.scan-badge')).toHaveCount(0);
});

test('passes a plain code at full size and 200 px', async ({ page }) => {
  await fillInputs(page, URL_INPUT);
  await expectBadge(page, 'Pass');
  await expect(panel(page).getByRole('status')).toHaveText(
    'Reads back correctly at full size and at 200 px.',
  );
});

test('fails inverted colours and fixes them with one click', async ({ page }) => {
  await fillInputs(page, URL_INPUT);
  await page
    .getByRole('region', { name: 'Colour' })
    .getByRole('button', { name: 'Swap colours' })
    .click();
  await expectBadge(page, 'Fail');
  await expect(panel(page)).toContainText('lighter than its background');

  await panel(page).getByRole('button', { name: 'Swap colours' }).click();
  await expectBadge(page, 'Pass');
});

test('warns about a thin margin and fixes it', async ({ page }) => {
  await fillInputs(page, URL_INPUT);
  await page.getByRole('slider', { name: 'Margin' }).fill('0');
  await expectBadge(page, 'Warning');
  await panel(page).getByRole('button', { name: 'Increase margin to 4' }).click();
  await expect(page.getByRole('slider', { name: 'Margin' })).toHaveValue('4');
  await expectBadge(page, 'Pass');
});

test('asks for level H with a logo and raises it', async ({ page }) => {
  await fillInputs(page, URL_INPUT);
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await makePng(page) });
  await expect(panel(page)).toContainText('Use level H with a logo.');
  await panel(page).getByRole('button', { name: 'Raise error correction to H' }).click();
  await expect(
    page.getByRole('group', { name: 'Error correction' }).getByRole('radio', { name: 'H' }),
  ).toBeChecked();
  await expectBadge(page, 'Pass');
});

test('flags low contrast from a pale gradient end, and the fix works', async ({ page }) => {
  await fillInputs(page, URL_INPUT);
  await page
    .getByRole('group', { name: 'Gradient on dots' })
    .getByRole('radio', { name: 'Linear' })
    .check();
  await page.getByRole('textbox', { name: 'Dots, end', exact: true }).fill('#d8d4cc');
  await expect(panel(page)).toContainText('between the gradient end and the background');
  await panel(page).getByRole('button', { name: 'Turn off the gradient' }).click();
  await expect(
    page.getByRole('group', { name: 'Gradient on dots' }).getByRole('radio', { name: 'Off' }),
  ).toBeChecked();
  await expectBadge(page, 'Pass');
});

test('warns that a long text makes a dense code', async ({ page }) => {
  await fillInputs(page, { type: 'text', values: { text: 'quiet zone '.repeat(40) } });
  await expect(panel(page)).toContainText('This is a dense code');
});

test('explains and fixes a shape the decoder cannot read', async ({ page }) => {
  // Found while testing: jsQR misses round centres in square frames for this link.
  await fillInputs(page, URL_INPUT);
  await page
    .getByRole('group', { name: 'Corner centres' })
    .getByRole('radio', { name: 'Circle' })
    .check();
  await expectBadge(page, 'Fail');
  await panel(page).getByRole('button', { name: 'Use square corner centres' }).click();
  await expectBadge(page, 'Pass');
  expect((await downloadAndDecode(page, 'png')).text).toBe('https://gdg.community.dev/srm');
});

for (const preset of PRESETS) {
  test(`${preset.name} passes the scan check`, async ({ page }) => {
    await fillInputs(page, URL_INPUT);
    await page.getByRole('button', { name: preset.name }).click();
    await expectBadge(page, 'Pass');
  });
}
