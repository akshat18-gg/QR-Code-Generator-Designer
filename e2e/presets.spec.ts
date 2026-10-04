import { expect, test } from '@playwright/test';
import { PRESETS } from '../src/state/presets';
import { TYPE_CASES } from './cases';
import {
  collectConsoleProblems,
  downloadAndDecode,
  expectPreviewReady,
  fillInputs,
  payloadFor,
  previewMarkup,
} from './helpers';

test('shows six presets, each with a live thumbnail', async ({ page }) => {
  await page.goto('/');
  const list = page
    .getByRole('list')
    .filter({ has: page.getByRole('button', { name: 'Newsprint' }) });
  await expect(list.getByRole('button')).toHaveCount(6);
  await expect(list.locator('.preset-thumb svg')).toHaveCount(6);

  const before = await list.locator('.preset-thumb').first().innerHTML();
  await fillInputs(page, TYPE_CASES[0]?.input ?? { type: 'url', values: { url: 'a.co' } });
  await expect.poll(() => list.locator('.preset-thumb').first().innerHTML()).not.toBe(before);
});

for (const preset of PRESETS) {
  test(`${preset.name} decodes for every type`, async ({ page }) => {
    const problems = collectConsoleProblems(page);
    await page.goto('/');
    await page.getByRole('button', { name: preset.name }).click();
    await expect(page.getByRole('button', { name: preset.name })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    for (const { input } of TYPE_CASES) {
      await page.reload();
      await page.getByRole('button', { name: preset.name }).click();
      await fillInputs(page, input);
      await expectPreviewReady(page);
      const expected = payloadFor(input);
      expect((await downloadAndDecode(page, 'png')).text).toBe(expected);
      expect((await downloadAndDecode(page, 'svg')).text).toBe(expected);
    }
    expect(problems).toEqual([]);
  });
}

test('settings stay editable after a preset, and editing shows Custom', async ({ page }) => {
  await page.goto('/');
  await fillInputs(page, { type: 'url', values: { url: 'example.com' } });
  await page.getByRole('button', { name: 'Rust' }).click();
  const presets = page.getByRole('region', { name: 'Presets' });
  await expect(presets.getByText('Rust', { exact: true }).first()).toBeVisible();

  const before = await previewMarkup(page);
  await page.getByRole('group', { name: 'Dots' }).getByRole('radio', { name: 'Square' }).check();
  await expect.poll(() => previewMarkup(page)).not.toBe(before);
  await expect(presets.getByText('Custom')).toBeVisible();
  for (const preset of PRESETS) {
    await expect(page.getByRole('button', { name: preset.name })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  }
});
