import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { expect, type Page } from '@playwright/test';
import { buildPayload } from '../src/lib/payload';
import { TYPE_LABELS, type Inputs, type QrType } from '../src/lib/types';
import { EMPTY_INPUTS } from '../src/state/editor';

const require = createRequire(import.meta.url);
const JSQR_PATH = require.resolve('jsqr/dist/jsQR.js');

export interface Decoded {
  text: string | null;
  width: number;
  height: number;
}

// Draws an image file onto a canvas inside the page and reads it with jsQR,
// the same decoder the app uses. SVGs go through <img>, just like a browser
// opening the downloaded file.
export async function decodeFile(page: Page, bytes: Buffer, mime: string): Promise<Decoded> {
  const hasJsQr = await page.evaluate(() => 'jsQR' in window);
  if (!hasJsQr) await page.addScriptTag({ path: JSQR_PATH });

  return page.evaluate(
    async ({ base64, mime }) => {
      const blob = await (await fetch(`data:${mime};base64,${base64}`)).blob();
      const url = URL.createObjectURL(blob);
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no canvas');
      context.drawImage(image, 0, 0);
      const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
      const decode = (window as unknown as { jsQR: typeof import('jsqr').default }).jsQR;
      const result = decode(data, width, height, { inversionAttempts: 'dontInvert' });
      return { text: result?.data ?? null, width, height };
    },
    { base64: bytes.toString('base64'), mime },
  );
}

export async function download(page: Page, button: string | RegExp) {
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: button }).click(),
  ]);
  const path = await file.path();
  return { filename: file.suggestedFilename(), bytes: await readFile(path) };
}

export async function downloadAndDecode(page: Page, kind: 'png' | 'svg') {
  const { filename, bytes } = await download(page, kind === 'png' ? 'Download PNG' : 'SVG');
  const decoded = await decodeFile(page, bytes, kind === 'png' ? 'image/png' : 'image/svg+xml');
  return { filename, bytes, ...decoded };
}

export async function chooseType(page: Page, type: QrType) {
  await page.getByRole('tab', { name: TYPE_LABELS[type] }).click();
}

export type TypedInput = { [K in QrType]: { type: K; values: Inputs[K] } }[QrType];

export async function fillInputs(page: Page, input: TypedInput) {
  await chooseType(page, input.type);
  switch (input.type) {
    case 'url':
      await page.getByLabel('Web address').fill(input.values.url);
      break;
    case 'text':
      await page.getByRole('textbox', { name: 'Text', exact: true }).fill(input.values.text);
      break;
    case 'email':
      await page.getByLabel('To', { exact: true }).fill(input.values.to);
      await page.getByLabel(/^Subject/).fill(input.values.subject);
      await page.getByLabel(/^Message/).fill(input.values.body);
      break;
    case 'phone':
      await page.getByLabel('Phone number').fill(input.values.phone);
      break;
    case 'wifi': {
      const { ssid, security, password, hidden } = input.values;
      await page.getByLabel('Network name').fill(ssid);
      const label = { WPA: 'WPA/WPA2', WEP: 'WEP', nopass: 'None' }[security];
      await page.getByRole('radio', { name: label }).check();
      if (security !== 'nopass') await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByLabel('Hidden network').setChecked(hidden);
      break;
    }
  }
}

export function payloadFor(input: TypedInput): string {
  return buildPayload(input.type, { ...EMPTY_INPUTS, [input.type]: input.values });
}

export async function expectPreviewReady(page: Page) {
  await expect(page.getByTestId('preview').locator('svg')).toBeVisible();
}

// Playwright logs this itself when the config blocks service workers.
const PLAYWRIGHT_NOISE = 'Service Worker registration blocked by Playwright';

export function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (message) => {
    const type = message.type();
    if ((type === 'error' || type === 'warning') && message.text() !== PLAYWRIGHT_NOISE) {
      problems.push(message.text());
    }
  });
  page.on('pageerror', (error) => problems.push(error.message));
  return problems;
}

// qr-code-styling numbers its clip-path ids per instance, so strip the counter
// to compare what is actually drawn.
export async function previewMarkup(page: Page): Promise<string> {
  const html = await page.getByTestId('preview').innerHTML();
  return html.replace(/-color(-\d+)+/g, '-color');
}

// A small two-colour logo drawn in the page, so tests don't need fixture files.
export async function makePng(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 120;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no canvas');
    context.fillStyle = '#b83c0c';
    context.fillRect(0, 0, 120, 120);
    context.fillStyle = '#fbfaf6';
    context.fillRect(30, 30, 60, 60);
    return canvas.toDataURL('image/png').split(',')[1] ?? '';
  });
  return Buffer.from(base64, 'base64');
}
