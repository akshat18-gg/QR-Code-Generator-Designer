import { expect, test, type Page } from '@playwright/test';
import { download, fillInputs } from './helpers';

const WIDTHS = [360, 768, 1024, 1440];

// A busy page: code, scan hints, a logo-free Wi-Fi form with an error, and a
// recent item, so the layout is tested with everything showing.
async function fillPage(page: Page) {
  await fillInputs(page, { type: 'url', values: { url: 'gdg.community.dev/srm' } });
  await page.getByRole('slider', { name: 'Margin' }).fill('1');
  await download(page, 'Download PNG');
  await page.getByRole('tab', { name: 'Wi-Fi' }).click();
  const password = page.getByLabel('Password', { exact: true });
  await page.getByRole('textbox', { name: 'Network name' }).fill('Home');
  await password.fill('short');
  await password.blur();
  await page.getByRole('tab', { name: 'Link' }).click();
}

function overlaps(page: Page) {
  return page.evaluate(() => {
    const selector =
      'button, input:not([type=radio]):not([type=file]), textarea, select, a, label, h1, h2, p, img, .preview-box';
    const elements = [...document.querySelectorAll<HTMLElement>(selector)].filter((el) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    });
    const pinned = document.querySelector('.export-bar');
    const problems: string[] = [];
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const a = elements[i] as HTMLElement;
        const b = elements[j] as HTMLElement;
        if (a.contains(b) || b.contains(a)) continue;
        // The phone export bar is pinned over the page on purpose; the page has
        // bottom padding so nothing is stuck underneath it.
        if (getComputedStyle(pinned as Element).position === 'fixed') {
          if (pinned?.contains(a) !== pinned?.contains(b)) continue;
        }
        const r1 = a.getBoundingClientRect();
        const r2 = b.getBoundingClientRect();
        const x = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left);
        const y = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
        if (x > 1 && y > 1) {
          const name = (el: HTMLElement) =>
            `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).split(' ')[0]}` : ''}("${el.textContent?.trim().slice(0, 20)}")`;
          problems.push(`${name(a)} overlaps ${name(b)}`);
        }
      }
    }
    return problems;
  });
}

for (const width of WIDTHS) {
  test.describe(`${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('no horizontal scroll and nothing overlaps', async ({ page }) => {
      await page.goto('/');
      await fillPage(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      expect(await overlaps(page)).toEqual([]);
    });
  });
}

test.describe('phone layout', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  test('preview comes first and export stays reachable at the bottom', async ({ page }) => {
    await page.goto('/');
    await fillInputs(page, { type: 'url', values: { url: 'example.com' } });
    const preview = await page.locator('.preview-box').boundingBox();
    const content = await page.getByRole('region', { name: 'Content' }).boundingBox();
    expect(preview && content && preview.y < content.y).toBe(true);

    await page.getByRole('region', { name: 'Size' }).scrollIntoViewIfNeeded();
    const button = page.getByRole('button', { name: 'Download PNG' });
    await expect(button).toBeInViewport();
    const box = await button.boundingBox();
    expect(box && box.y + box.height).toBeLessThanOrEqual(740);
  });

  test('touch targets are at least 44px', async ({ page }) => {
    await page.goto('/');
    await fillInputs(page, { type: 'url', values: { url: 'example.com' } });
    await download(page, 'Download PNG');
    const small = await page.evaluate(() => {
      const targets = [
        ...document.querySelectorAll<HTMLElement>(
          'button, a, input:not([type=radio]):not([type=checkbox]):not([type=file]), textarea, .segmented-option span, label.check, .file-input + label',
        ),
      ].filter((el) => el.getBoundingClientRect().width > 0 && !el.classList.contains('skip-link'));
      return targets
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.height < 43.5 || box.width < 43.5)
        .map(
          ({ el, box }) =>
            `${el.tagName} "${el.textContent?.trim().slice(0, 20)}" ${Math.round(box.width)}x${Math.round(box.height)}`,
        );
    });
    expect(small).toEqual([]);
  });
});
