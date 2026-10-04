import { expect, test, type Page } from '@playwright/test';
import {
  collectConsoleProblems,
  downloadAndDecode,
  expectPreviewReady,
  fillInputs,
  makePng,
  previewMarkup,
} from './helpers';

const URL_INPUT = { type: 'url', values: { url: 'gdg.community.dev/srm' } } as const;
const EXPECTED = 'https://gdg.community.dev/srm';

interface Change {
  name: string;
  apply: (page: Page) => Promise<void>;
  size?: number;
}

const radio = (name: string, group: string) => async (page: Page) => {
  await page.getByRole('group', { name: group }).getByRole('radio', { name, exact: true }).check();
};

const slider = (name: string, value: string) => async (page: Page) => {
  await page.getByRole('slider', { name }).fill(value);
};

const hex = (name: string, value: string) => async (page: Page) => {
  await page.getByRole('textbox', { name, exact: true }).fill(value);
};

const changes: Change[] = [
  { name: 'size 800', apply: slider('Image size', '800'), size: 800 },
  { name: 'size 128', apply: slider('Image size', '128'), size: 128 },
  { name: 'margin 1', apply: slider('Margin', '1') },
  { name: 'margin 8', apply: slider('Margin', '8') },
  ...['L', 'Q', 'H'].map((level) => ({
    name: `error correction ${level}`,
    apply: radio(level, 'Error correction'),
  })),
  ...['Rounded', 'Dots', 'Classy', 'Extra round'].map((name) => ({
    name: `dots ${name}`,
    apply: radio(name, 'Dots'),
  })),
  { name: 'corner frames rounded', apply: radio('Rounded', 'Corner frames') },
  { name: 'corner frames circle', apply: radio('Circle', 'Corner frames') },
  {
    // jsQR misses circular centres inside square frames for some payloads; the
    // app's scan check flags that combination, so here they're paired as usual.
    name: 'corner centres circle',
    apply: async (page) => {
      await radio('Circle', 'Corner frames')(page);
      await radio('Circle', 'Corner centres')(page);
    },
  },
  { name: 'dot colour', apply: hex('Dots', '#123a6b') },
  { name: 'background colour', apply: hex('Background', '#f6efe4') },
  {
    name: 'linear gradient with angle',
    apply: async (page) => {
      await radio('Linear', 'Gradient on dots')(page);
      await hex('Dots, end', '#7c2d12')(page);
      await slider('Angle', '135')(page);
    },
  },
  {
    name: 'radial gradient',
    apply: async (page) => {
      await radio('Radial', 'Gradient on dots')(page);
      await hex('Dots, end', '#24404f')(page);
    },
  },
  {
    name: 'own corner frame colour',
    apply: async (page) => {
      await page.getByRole('checkbox', { name: 'Same as dots' }).first().uncheck();
      await hex('Corner frames', '#b83c0c')(page);
    },
  },
  {
    name: 'own corner centre colour',
    apply: async (page) => {
      await page.getByRole('checkbox', { name: 'Same as dots' }).last().uncheck();
      await hex('Corner centres', '#9b2226')(page);
    },
  },
];

test.describe('every customisation changes the preview and still decodes', () => {
  for (const change of changes) {
    test(change.name, async ({ page }) => {
      const problems = collectConsoleProblems(page);
      await page.goto('/');
      await fillInputs(page, URL_INPUT);
      await expectPreviewReady(page);
      const before = await previewMarkup(page);

      await change.apply(page);
      await expect.poll(() => previewMarkup(page)).not.toBe(before);

      const png = await downloadAndDecode(page, 'png');
      expect(png.text).toBe(EXPECTED);
      if (change.size) expect(png.width).toBe(change.size);
      const svg = await downloadAndDecode(page, 'svg');
      expect(svg.text).toBe(EXPECTED);
      expect(problems).toEqual([]);
    });
  }
});

test('swap colours changes the preview and swapping back restores it', async ({ page }) => {
  await page.goto('/');
  await fillInputs(page, URL_INPUT);
  await expectPreviewReady(page);
  const before = await previewMarkup(page);

  await page.getByRole('button', { name: 'Swap colours' }).click();
  await expect(page.getByRole('textbox', { name: 'Dots', exact: true })).toHaveValue('#ffffff');
  await expect(page.getByRole('textbox', { name: 'Background', exact: true })).toHaveValue(
    '#1a1916',
  );
  await expect.poll(() => previewMarkup(page)).not.toBe(before);

  await page.getByRole('button', { name: 'Swap colours' }).click();
  await expect.poll(() => previewMarkup(page)).toBe(before);
  expect((await downloadAndDecode(page, 'png')).text).toBe(EXPECTED);
});

test('colour picker and hex box stay in sync', async ({ page }) => {
  await page.goto('/');
  const hexBox = page.getByRole('textbox', { name: 'Dots', exact: true });
  const picker = page.getByLabel('Dots picker');

  await hexBox.fill('#9B2226');
  await expect(picker).toHaveValue('#9b2226');

  await picker.fill('#123a6b');
  await expect(hexBox).toHaveValue('#123a6b');

  await hexBox.fill('#12');
  await hexBox.blur();
  await expect(page.getByText('Use a hex colour like #1a1916.')).toBeVisible();
  await expect(picker).toHaveValue('#123a6b');
});

test.describe('logo', () => {
  test('upload, resize, pad, toggle dots, and remove, decoding after each step', async ({
    page,
  }) => {
    const problems = collectConsoleProblems(page);
    await page.goto('/');
    await fillInputs(page, URL_INPUT);
    await radio('H', 'Error correction')(page);
    await expectPreviewReady(page);

    const steps: [string, (page: Page) => Promise<void>][] = [
      [
        'upload',
        async (p) => {
          await p
            .locator('input[type=file]')
            .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await makePng(p) });
          await expect(p.getByRole('button', { name: 'Remove' })).toBeVisible();
        },
      ],
      ['size', slider('Logo size', '0.6')],
      ['padding', slider('Logo padding', '2')],
      [
        'keep dots',
        async (p) => {
          await p.getByRole('checkbox', { name: 'Clear the dots behind the logo' }).uncheck();
        },
      ],
      [
        'remove',
        async (p) => {
          await p.getByRole('button', { name: 'Remove' }).click();
          await expect(p.getByText('Upload logo')).toBeVisible();
        },
      ],
    ];

    for (const [, apply] of steps) {
      const before = await previewMarkup(page);
      await apply(page);
      await expect.poll(() => previewMarkup(page)).not.toBe(before);
      expect((await downloadAndDecode(page, 'png')).text).toBe(EXPECTED);
      expect((await downloadAndDecode(page, 'svg')).text).toBe(EXPECTED);
    }
    expect(problems).toEqual([]);
  });

  test('SVG export embeds the logo so the file stands alone', async ({ page }) => {
    await page.goto('/');
    await fillInputs(page, URL_INPUT);
    await page
      .locator('input[type=file]')
      .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await makePng(page) });
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
    const svg = await downloadAndDecode(page, 'svg');
    const markup = svg.bytes.toString('utf8');
    expect(markup).toMatch(/<image[^>]+href="data:image\/png;base64,/);
    expect(markup).not.toMatch(/href="(blob:|https?:)/);
  });

  test('accepts an SVG logo', async ({ page }) => {
    await page.goto('/');
    await fillInputs(page, URL_INPUT);
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#b83c0c"/></svg>';
    await page
      .locator('input[type=file]')
      .setInputFiles({ name: 'mark.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
    await expect(page.getByText('mark.svg')).toBeVisible();
    expect((await downloadAndDecode(page, 'png')).text).toBe(EXPECTED);
  });

  test('rejects other file types and files over 2 MB', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('input[type=file]');
    await input.setInputFiles({
      name: 'anim.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('GIF89a'),
    });
    await expect(page.getByRole('alert')).toHaveText('Use a PNG, JPG or SVG image.');

    await input.setInputFiles({
      name: 'huge.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    });
    await expect(page.getByRole('alert')).toHaveText('That image is over 2 MB. Try a smaller one.');
    await expect(page.getByText('Upload logo')).toBeVisible();
  });
});
