# Testing

## Running the tests

| What                       | Command                                                                                     | Notes                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Unit tests                 | `npm test`                                                                                  | Vitest, in Node. `npm run test:watch` re-runs on save.                                              |
| End-to-end tests           | `npx playwright install chromium` once, then `npm run e2e`                                  | Builds the app, serves the production build on port 4173 and runs every spec in `e2e/` in Chromium. |
| One e2e file               | `npx playwright test e2e/scan.spec.ts`                                                      | Add `--headed` to watch it, or `--ui` for Playwright's UI mode.                                     |
| Accessibility (axe)        | `npx playwright test e2e/a11y.spec.ts`                                                      | Fails on any serious or critical violation, in both themes.                                         |
| Lint and formatting        | `npm run lint` and `npm run format:check`                                                   | ESLint allows zero warnings.                                                                        |
| Types                      | `npm run typecheck`                                                                         | Strict TypeScript, for the app, the configs and the e2e specs.                                      |
| Screenshots for the README | `npm run screenshots`                                                                       | Writes to `screenshots/`. Skipped in normal e2e runs.                                               |
| Lighthouse                 | `npx lighthouse https://qr-code-generator-designer.vercel.app/ --form-factor=mobile --view` | Needs Chrome installed.                                                                             |

CI runs lint, format check, typecheck, unit tests, build and e2e on every push (`.github/workflows/ci.yml`). If e2e fails, the Playwright report is uploaded as an artifact.

## What the automated tests cover

**Unit tests (`src/**/*.test.ts`)**

- **Payload builders:** every type. This includes Wi-Fi escaping of `\ ; , : "`, mailto encoding of the subject and body (CRLF line breaks included), phone stripping, and `https://` being added to bare links.
- **Validators:** valid and invalid cases for every field, including WEP hex keys and the 32-byte Wi-Fi network name limit.
- **UTF-8:** Tamil, Hindi, emoji and mixed text are encoded, decoded with jsQR, and must come back identical.
- **Overflow:** the exact version 40 limits at L and H, and multi-byte text overflowing sooner.
- **Contrast maths:** known WCAG values, the weaker gradient stop, corner colours, and inverted colour detection.
- **Scan rules:** every hint, every one-click fix (checked to actually fix the problem), and the rule that the decode result has the final say.
- **Decode test:** pass, wrong text, inverted, and low contrast, on generated pixels.
- **Recent codes:** newest first, duplicates moved to the top, the limit of 12, corrupt JSON, wrongly shaped items, storage that throws, and a full quota that drops the oldest entries.
- **Reducer and presets:** values kept across tabs, swapping colours, presets leaving size, level and logo alone, and "Custom" detection.

**End-to-end tests (`e2e/`)**

| Spec                            | Covers                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `types.spec.ts`                 | Every QR type: fill the form, download PNG and SVG, decode both with jsQR and compare with the expected payload. Also checks filenames and the PNG size.                                                                                                                                                                 |
| `customise.spec.ts`             | Every option (size, margin, error correction, each dot and corner style, colours, both gradients, corner colours, every logo step) changes the preview and still decodes. Also covers the colour picker and hex box staying in sync, the logo embedded in the SVG, and rejected files.                                   |
| `presets.spec.ts`               | Six presets with live thumbnails. Every preset decodes for every type. Editing after a preset shows "Custom".                                                                                                                                                                                                            |
| `export.spec.ts`                | Clipboard copy decoded from the clipboard, the fallback when copying isn't supported, export disabled with a reason, overflow message, density warning, no layout shift.                                                                                                                                                 |
| `validation.spec.ts`            | Errors only after a field is touched, `aria-invalid` and `aria-describedby`, specific messages, export blocked, WEP rules, show/hide password, values kept across tabs, keyboard tabs.                                                                                                                                   |
| `scan.spec.ts`                  | Pass, fail and warning states. Each one-click fix (swap colours, margin, level H, gradient, corner shape) actually fixes it. Every preset passes.                                                                                                                                                                        |
| `recent.spec.ts`                | Saved on download or copy only, survives a reload, a click restores every setting, no duplicates, limit of 12, remove, clear all with confirm and Escape, corrupt data, full quota.                                                                                                                                      |
| `responsive.spec.ts`            | No horizontal scroll and no overlapping elements at 360, 768, 1024 and 1440 px. On a phone: preview first, export reachable, 44 px touch targets.                                                                                                                                                                        |
| `a11y.spec.ts`                  | axe with zero serious or critical issues in light and dark, on an empty and a busy page. Theme toggle (follows the system on first visit, switches, remembers after reload), no-flash load, hovering the logo replays the scan line once, reduced motion skips the header intro, focus ring on every control, skip link. |
| `pwa.spec.ts`                   | Works offline after the first visit (reload offline, make a code, decode it), and the manifest and icons are installable.                                                                                                                                                                                                |
| `smoke.spec.ts`, `meta.spec.ts` | No console errors or warnings with the service worker on. Share tags point at the live site, and the share image's QR code opens it.                                                                                                                                                                                     |

## Manual checklist

These need a real phone, a real network or a human eye. Tick each one when it's done.

| #   | Check                                                                                                                                    | Done |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | Scan a link code from the screen with the default camera app on Android. It opens the right page.                                        | [ ]  |
| 2   | Same on an iPhone camera.                                                                                                                | [ ]  |
| 3   | Print a code at about 3 cm wide and scan it from paper.                                                                                  | [ ]  |
| 4   | Make a Wi-Fi code for a real WPA2 network, scan it on Android, and actually join the network.                                            | [ ]  |
| 5   | Same Wi-Fi code on an iPhone: the "Join network" prompt appears and connecting works.                                                    | [ ]  |
| 6   | Wi-Fi network or password containing `;`, `:` or `"` still joins (checks the escaping on a real device).                                 | [ ]  |
| 7   | Email code opens the mail app with the To, Subject and Body filled in, line breaks included.                                             | [ ]  |
| 8   | Phone code opens the dialler with the right number.                                                                                      | [ ]  |
| 9   | A Tamil or Hindi text code shows the right script when scanned on a phone.                                                               | [ ]  |
| 10  | A styled code (Rust preset with the logo, level H) scans with a phone camera.                                                            | [ ]  |
| 11  | A code the scan check marks as "Fail" really fails, or is hard to scan, on a phone.                                                      | [ ]  |
| 12  | Copy works in Firefox and Safari, or the fallback message shows. Pasting into a chat or doc gives the image.                             | [ ]  |
| 13  | The downloaded SVG opens in Inkscape or Figma and in a browser, logo included, and still scans.                                          | [ ]  |
| 14  | Install the app from Chrome on Android ("Add to Home screen") and from desktop Chrome. It opens in its own window with the right icon.   | [ ]  |
| 15  | Turn on airplane mode after one visit: the installed app opens and makes codes.                                                          | [ ]  |
| 16  | On a phone, the colour picker is easy to use and the pinned export bar doesn't cover anything you need.                                  | [ ]  |
| 17  | VoiceOver (iOS or macOS) or TalkBack reads field errors, the scan check result and the "Copied" message.                                 | [ ]  |
| 18  | With "Reduce motion" turned on, nothing animates (scrolling back to the preview after loading a recent code jumps instead of scrolling). | [ ]  |
| 19  | Link previews on WhatsApp or Slack show the share image and title.                                                                       | [ ]  |
