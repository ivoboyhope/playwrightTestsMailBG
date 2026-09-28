// @ts-check
const { test: setup } = require('@playwright/test');

/**
 * Shared authentication helper.
 * Use this to pre-authenticate and reuse storage state across tests.
 *
 * Usage:
 *   1. Set env vars MAIL_BG_EMAIL and MAIL_BG_PASSWORD
 *   2. Run: npx playwright test tests/auth.setup.js
 *   3. In other tests, use: storageState: 'tests/.auth/user.json'
 */

const EMAIL = process.env.MAIL_BG_EMAIL || '';
const PASSWORD = process.env.MAIL_BG_PASSWORD || '';

setup('authenticate', async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    console.warn('⚠ Set MAIL_BG_EMAIL and MAIL_BG_PASSWORD env vars for auth setup');
    return;
  }

  await page.goto('https://mail.bg/auth/lgn');
  await page.locator('#loginform').waitFor({ state: 'visible', timeout: 15000 });

  await page.fill('#imapuser', EMAIL);
  await page.fill('#pass', PASSWORD);
  await page.click('a.button:has-text("ВЛЕЗ")');

  // Wait for navigation away from login
  await page.waitForURL(/(?!auth\/lgn)/, { timeout: 30000 });

  // Save storage state
  await page.context().storageState({ path: 'tests/.auth/user.json' });
});
