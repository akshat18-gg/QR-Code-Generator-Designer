import { expect, test } from '@playwright/test';
import {
  collectConsoleProblems,
  downloadAndDecode,
  expectPreviewReady,
  fillInputs,
  payloadFor,
} from './helpers';
import { TYPE_CASES } from './cases';

const today = new Date();
const date = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, '0'),
  String(today.getDate()).padStart(2, '0'),
].join('-');

for (const { name, input } of TYPE_CASES) {
  test(`${input.type}: ${name} downloads PNG and SVG that decode to the payload`, async ({
    page,
  }) => {
    const problems = collectConsoleProblems(page);
    await page.goto('/');
    await fillInputs(page, input);
    await expectPreviewReady(page);
    const expected = payloadFor(input);

    const png = await downloadAndDecode(page, 'png');
    expect(png.filename).toBe(`qr-${input.type}-${date}.png`);
    expect(png.text).toBe(expected);
    expect([png.width, png.height]).toEqual([512, 512]);

    const svg = await downloadAndDecode(page, 'svg');
    expect(svg.filename).toBe(`qr-${input.type}-${date}.svg`);
    expect(svg.text).toBe(expected);

    expect(problems).toEqual([]);
  });
}
