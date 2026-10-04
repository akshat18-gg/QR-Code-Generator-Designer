import { expect, test } from '@playwright/test';
import { decodeFile, downloadAndDecode, expectPreviewReady, fillInputs } from './helpers';

const exportButtons = ['Download PNG', 'SVG', 'Copy'];

test.describe('clipboard', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copies a PNG that decodes, and says so', async ({ page }) => {
    await page.goto('/');
    await fillInputs(page, { type: 'text', values: { text: 'வணக்கம் 😀' } });
    await expectPreviewReady(page);
    await page.getByRole('button', { name: 'Copy' }).click();
    await expect(page.getByRole('region', { name: 'Export' }).getByRole('status')).toHaveText(
      'Copied',
    );

    const base64 = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      if (!item) return '';
      const blob = await item.getType('image/png');
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    });
    const decoded = await decodeFile(page, Buffer.from(base64, 'base64'), 'image/png');
    expect(decoded.text).toBe('வணக்கம் 😀');
    expect(decoded.width).toBe(512);

    await expect(page.getByRole('region', { name: 'Export' }).getByRole('status')).toHaveText('', {
      timeout: 4000,
    });
  });
});

test('explains when the browser cannot copy images', async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, 'ClipboardItem');
  });
  await page.goto('/');
  await fillInputs(page, { type: 'url', values: { url: 'example.com' } });
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByRole('region', { name: 'Export' }).getByRole('status')).toHaveText(
    "This browser can't copy images. Download the PNG instead.",
  );
});

test('export is disabled with a reason until the input is valid', async ({ page }) => {
  await page.goto('/');
  for (const name of exportButtons) {
    await expect(page.getByRole('button', { name })).toBeDisabled();
  }
  await expect(page.locator('#export-reason')).toHaveText('Type a link to see its code.');

  await fillInputs(page, { type: 'email', values: { to: 'not-an-email', subject: '', body: '' } });
  await expect(page.locator('#export-reason')).toHaveText(
    "That doesn't look like an email address.",
  );
  for (const name of exportButtons) {
    await expect(page.getByRole('button', { name })).toBeDisabled();
  }
  await expect(page.getByTestId('preview')).toBeHidden();

  await page.getByLabel('To', { exact: true }).fill('gdg@srmist.edu.in');
  for (const name of exportButtons) {
    await expect(page.getByRole('button', { name })).toBeEnabled();
  }
  await expect(page.locator('#export-reason')).toHaveCount(0);
});

test('too much text shows a clear message instead of crashing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page
    .getByRole('group', { name: 'Error correction' })
    .getByRole('radio', { name: 'H' })
    .check();
  await fillInputs(page, { type: 'text', values: { text: 'x'.repeat(1400) } });

  const message =
    'Too much text for one QR code at level H. Shorten it or lower the error correction.';
  await expect(page.getByRole('alert')).toHaveText(message);
  await expect(page.locator('#export-reason')).toHaveText(message);
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeDisabled();

  await page
    .getByRole('group', { name: 'Error correction' })
    .getByRole('radio', { name: 'L' })
    .check();
  await expectPreviewReady(page);
  expect((await downloadAndDecode(page, 'png')).text).toBe('x'.repeat(1400));
  expect(errors).toEqual([]);
});

test('long text warns that the code is dense', async ({ page }) => {
  await page.goto('/');
  await fillInputs(page, { type: 'text', values: { text: 'a'.repeat(100) } });
  await expect(page.getByText('Long text makes a dense code')).toHaveCount(0);
  await fillInputs(page, { type: 'text', values: { text: 'a'.repeat(400) } });
  await expect(page.getByText(/Long text makes a dense code/)).toBeVisible();
  await expect(page.getByText(/^400 characters/)).toBeVisible();
});

test('preview keeps its size between placeholder and code', async ({ page }) => {
  await page.goto('/');
  const box = page.locator('.preview-box');
  const empty = await box.boundingBox();
  await fillInputs(page, { type: 'url', values: { url: 'example.com' } });
  await expectPreviewReady(page);
  const filled = await box.boundingBox();
  expect(filled).toEqual(empty);
});
