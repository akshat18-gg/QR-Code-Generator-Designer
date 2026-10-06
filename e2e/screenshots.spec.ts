import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import qrcode from 'qrcode-generator';
import { colourAt } from '../src/lib/pixelField';
import { download, fillInputs } from './helpers';

// Regenerates the README screenshots. Skipped in normal runs: npm run screenshots
test.skip(!process.env.SCREENSHOTS, 'Only runs with npm run screenshots');

const SITE = { type: 'url', values: { url: 'qr-code-generator-designer.vercel.app' } } as const;
const OUT = 'screenshots';

// Parks the pointer below the header and waits for the pixel grid to rest, so
// screenshots don't catch a hover state or a half-faded trail.
async function parkPointer(page: Page) {
  await page.mouse.move(1, (page.viewportSize()?.height ?? 800) - 1);
  await expect(page.locator('canvas.pixel-grid')).toHaveAttribute('data-animating', 'false', {
    timeout: 3000,
  });
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.scan-badge')).not.toHaveText('Checking');
  await parkPointer(page);
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
    await parkPointer(page);
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
          values: { ssid: 'SRM Library', security: 'WPA', password: 'qraft2026', hidden: false },
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
    await parkPointer(page);
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
      name: 'qraft.svg',
      mimeType: 'image/svg+xml',
      buffer: await readFile('public/favicon.svg'),
    });
    await expect(page.locator('.scan-badge')).toHaveText('Pass');
    await settle(page);
    await page.locator('.preview').screenshot({ path: `${OUT}/styled.png` });
  });
});

test.describe('motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  test('header with a pointer trail', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await parkPointer(page);
    const header = await page.locator('.masthead').boundingBox();
    if (!header) throw new Error('No header');
    const middle = header.y + header.height / 2;
    for (let x = 420; x <= 1120; x += 14) {
      await page.mouse.move(x, middle + Math.sin(x / 70) * 22);
    }
    await page.screenshot({
      path: `${OUT}/header.png`,
      clip: { x: 0, y: 0, width: 1440, height: header.y + header.height + 1 },
    });
  });

  test('confetti after a download', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await fillInputs(page, SITE);
    await preset(page, 'Night');
    await settle(page);
    const button = page.getByRole('button', { name: 'Download PNG' });
    await Promise.all([page.waitForEvent('download'), button.click()]);
    await page.locator('.confetti').waitFor();
    await page.mouse.move(1, 899);
    await page.waitForTimeout(200);
    const box = await page.locator('#export').boundingBox();
    if (!box) throw new Error('No export group');
    await page.screenshot({
      path: `${OUT}/confetti.png`,
      clip: { x: box.x - 24, y: box.y - 150, width: box.width + 48, height: box.height + 170 },
    });
  });
});

test.describe('share image', () => {
  test.use({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

  test('og.png', async ({ page }) => {
    await page.setContent(await shareImageHtml());
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: 'public/og.png' });
  });
});

const LIVE = 'https://qr-code-generator-designer.vercel.app/';
const GOOGLE = ['#4285f4', '#ea4335', '#fbbc04', '#34a853'];

async function fontFace(family: string, pkg: string, weight: number) {
  const file = `node_modules/@fontsource/${pkg}/files/${pkg}-latin-${weight}-normal.woff2`;
  const data = (await readFile(file)).toString('base64');
  return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${data}) format('woff2')}`;
}

// The share image: the app's look at 1200×630, with a QR code that opens the
// live site. A band of pixel squares across the top uses the same colour
// patches as the header, with a lit trail through it.
async function shareImageHtml(): Promise<string> {
  const fonts = await Promise.all([
    fontFace('IBM Plex Sans', 'ibm-plex-sans', 400),
    fontFace('IBM Plex Sans', 'ibm-plex-sans', 600),
    fontFace('IBM Plex Mono', 'ibm-plex-mono', 500),
  ]);

  const qr = qrcode(0, 'M');
  qr.addData(LIVE);
  qr.make();
  const n = qr.getModuleCount();
  let modules = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) modules += `<rect x="${c}" y="${r}" width="1" height="1"/>`;
    }
  }

  const pitch = 20;
  const cell = 14;
  let band = '';
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 60; col++) {
      const x = col * pitch + 3;
      const y = row * pitch + 12;
      const trail = 64 + Math.sin(col / 4.2) * 26;
      const lit = col > 24 ? Math.max(0, 1 - Math.abs(y + cell / 2 - trail) / 30) : 0;
      const fade = Math.min(1, (col - 24) / 16);
      const alpha = lit * fade * 0.8;
      band +=
        alpha > 0.05
          ? `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${GOOGLE[colourAt(col, row)]}" fill-opacity="${alpha.toFixed(2)}"/>`
          : `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#13212f" fill-opacity="0.035"/>`;
    }
  }

  const crop = (x: number, y: number, dx: number, dy: number) =>
    `<path d="M${x + dx * 4} ${y}h${dx * 14}M${x} ${y + dy * 4}v${dy * 14}" stroke="#6f8094" stroke-width="1.5"/>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts.join('\n')}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;position:relative;color:#13212f;font-family:'IBM Plex Sans';
  background:#eef3f8 radial-gradient(rgb(19 33 47 / 0.05) 1px, transparent 1.4px) 0 0/16px 16px}
.strip{position:absolute;top:0;left:0;right:0;height:8px;display:flex}
.strip i{flex:1}
.band{position:absolute;top:8px;left:0}
.text{position:absolute;left:90px;top:196px;width:560px}
.eyebrow{display:flex;align-items:center;gap:14px;font:500 19px 'IBM Plex Mono';letter-spacing:.12em;color:#4a5b6d}
.eyebrow b{width:14px;height:14px;background:#1a73e8}
h1{margin-top:22px;font-weight:600;font-size:112px;line-height:1;letter-spacing:-.02em}
p{margin-top:28px;font-size:29px;line-height:1.42;color:#4a5b6d}
.sheet{position:absolute;left:700px;top:160px;width:410px;height:410px;background:#f9fbfd;display:grid;place-items:center}
.marks{position:absolute;left:0;top:0}
</style></head><body>
<div class="strip">${GOOGLE.map((c) => `<i style="background:${c}"></i>`).join('')}</div>
<svg class="band" width="1200" height="132" shape-rendering="crispEdges">${band}</svg>
<div class="text">
  <div class="eyebrow"><b></b>QR CODE GENERATOR</div>
  <h1>QRaft</h1>
  <p>Craft QR codes for links, text, email, phone and Wi-Fi. Style them, then check they actually scan.</p>
</div>
<div class="sheet">
  <svg width="350" height="350" viewBox="-3 -3 ${n + 6} ${n + 6}" shape-rendering="crispEdges">
    <rect x="-3" y="-3" width="${n + 6}" height="${n + 6}" fill="#fff"/><g fill="#13212f">${modules}</g>
  </svg>
</div>
<svg class="marks" width="1200" height="630">
  ${crop(700, 160, -1, -1)}${crop(1110, 160, 1, -1)}${crop(700, 570, -1, 1)}${crop(1110, 570, 1, 1)}
</svg>
</body></html>`;
}

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
