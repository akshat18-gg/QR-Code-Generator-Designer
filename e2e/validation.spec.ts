import { expect, test, type Page } from '@playwright/test';
import { chooseType } from './helpers';

async function expectFieldError(page: Page, field: string, message: string | null) {
  const input = page.getByRole('textbox', { name: field, exact: true });
  if (message === null) {
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
    return;
  }
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  const describedBy = (await input.getAttribute('aria-describedby')) ?? '';
  const errorId = describedBy.split(' ').find((id) => id.endsWith('-error'));
  expect(errorId).toBeTruthy();
  await expect(page.locator(`#${errorId}`)).toHaveText(message);
}

test('errors only appear after a field is touched', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.error')).toHaveCount(0);
  await expectFieldError(page, 'Web address', null);

  const field = page.getByRole('textbox', { name: 'Web address' });
  await field.fill('not a link');
  await expectFieldError(page, 'Web address', null);
  await field.blur();
  await expectFieldError(page, 'Web address', "That doesn't look like a web address.");

  await field.fill('example.com');
  await expectFieldError(page, 'Web address', null);
});

const invalid: {
  type: Parameters<typeof chooseType>[1];
  field: string;
  value: string;
  message: string;
}[] = [
  {
    type: 'url',
    field: 'Web address',
    value: 'ftp://files.example.com',
    message: 'Only http and https links work here.',
  },
  {
    type: 'email',
    field: 'To',
    value: 'gdg@srm',
    message: "That doesn't look like an email address.",
  },
  {
    type: 'phone',
    field: 'Phone number',
    value: '12345',
    message: 'Phone numbers have 7 to 15 digits.',
  },
  {
    type: 'phone',
    field: 'Phone number',
    value: '98-abc-1234',
    message: 'Use digits, spaces and dashes, with + only at the start.',
  },
  { type: 'wifi', field: 'Network name', value: '', message: 'Enter the network name.' },
  {
    type: 'wifi',
    field: 'Password',
    value: 'short',
    message: 'WPA passwords are 8 to 63 characters.',
  },
];

for (const { type, field, value, message } of invalid) {
  test(`${type}: "${value}" in ${field} shows "${message}" and blocks export`, async ({ page }) => {
    await page.goto('/');
    await chooseType(page, type);
    const input = page.getByRole('textbox', { name: field, exact: true });
    await input.fill(value);
    if (type === 'wifi' && field === 'Password') {
      await page.getByRole('textbox', { name: 'Network name' }).fill('Home');
    }
    await input.focus();
    await input.blur();
    await expectFieldError(page, field, message);
    await expect(page.getByRole('button', { name: 'Download PNG' })).toBeDisabled();
  });
}

test('WEP keys follow WEP rules', async ({ page }) => {
  await page.goto('/');
  await chooseType(page, 'wifi');
  await page.getByRole('textbox', { name: 'Network name' }).fill('Lab');
  await page.getByRole('radio', { name: 'WEP' }).check();
  const password = page.getByRole('textbox', { name: 'Password', exact: true });
  await password.fill('abcdef');
  await password.blur();
  await expectFieldError(
    page,
    'Password',
    'WEP keys are 5 or 13 characters, or 10 or 26 hex digits.',
  );
  await password.fill('abcde');
  await expectFieldError(page, 'Password', null);
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
});

test('Wi-Fi password hides for open networks and can be shown', async ({ page }) => {
  await page.goto('/');
  await chooseType(page, 'wifi');
  const password = page.getByLabel('Password', { exact: true });
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password' }).click();
  await expect(password).toHaveAttribute('type', 'password');

  await page.getByRole('radio', { name: 'None' }).check();
  await expect(password).toHaveCount(0);
});

test('switching types keeps what was typed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Web address' }).fill('example.com');
  await chooseType(page, 'wifi');
  await page.getByRole('textbox', { name: 'Network name' }).fill('Home');
  await chooseType(page, 'email');
  await chooseType(page, 'url');
  await expect(page.getByRole('textbox', { name: 'Web address' })).toHaveValue('example.com');
  await chooseType(page, 'wifi');
  await expect(page.getByRole('textbox', { name: 'Network name' })).toHaveValue('Home');
});

test('type tabs work with the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Link' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Text' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Text' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Wi-Fi' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Link' })).toHaveAttribute('aria-selected', 'true');
});
