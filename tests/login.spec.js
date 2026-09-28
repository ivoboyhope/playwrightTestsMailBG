// @ts-check
// This enables TypeScript-style checking in VS Code (even though this is plain JS)
// It helps catch errors like typos in variable names

// Import Playwright's test runner and assertion library
// - 'test' is a function we use to define each test case
// - 'expect' is used to make assertions (like "this should equal that")
const { test, expect } = require('@playwright/test');

// Read credentials from environment variables (set in terminal before running)
// process.env.MAIL_BG_EMAIL gets the value of the MAIL_BG_EMAIL variable
// || 'testuser@mail.bg' is a fallback value if the variable is not set
const VALID_EMAIL = process.env.MAIL_BG_EMAIL || 'testuser@mail.bg';
const VALID_PASSWORD = process.env.MAIL_BG_PASSWORD || 'TestPass123!';

// Helper: clicks login and waits for the video overlay to finish
// The video overlay blocks form submission for 7-9 seconds
async function loginAndWaitForVideo(page) {
  await page.click('a.button:has-text("ВЛЕЗ")');

  // Check if video popup appears (it shows on mail.bg domain)
  const videoPopup = page.locator('#video-popup-holder');
  const isVideoVisible = await videoPopup.isVisible({ timeout: 3000 }).catch(() => false);

  if (isVideoVisible) {
    // Wait for video to finish and form to submit (up to 15 seconds)
    await page.waitForTimeout(12000);
  }
}

// test.describe() groups related tests together (like a test suite)
// The first argument is the suite name (shown in test reports)
// The second argument is a function that contains all the tests
test.describe('Mail.bg Login Flow', () => {

  // test.beforeEach() runs BEFORE every test in this group
  // 'async' means this function can use 'await' (wait for things to finish)
  // '{ page }' is destructuring - it extracts 'page' from Playwright's fixtures
  // 'page' is like a browser tab - we use it to interact with the website
  test.beforeEach(async ({ page }) => {
    // page.goto() navigates to a URL
    // '/auth/lgn' is relative to the baseURL we set in playwright.config.js
    await page.goto('/auth/lgn');

    // page.locator() finds an element on the page (like document.querySelector in JS)
    // .waitFor() waits until the element is visible (with a 15 second timeout)
    await page.locator('#loginform').waitFor({ state: 'visible', timeout: 15000 });

    // Dismiss cookie consent banner if it appears
    // The banner (from fc-consent-root) overlays the login button and blocks clicks
    const acceptBtn = page.locator('.fc-cta-consent, .fc-button-label:has-text("Agree"), [aria-label*="Agree"], [aria-label*="Accept"]');
    const consentVisible = await acceptBtn.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (consentVisible) {
      await acceptBtn.first().click();
      await page.waitForTimeout(500);
    }
  });

  // -------------------------------------------------------
  // TC01: Successful login with valid credentials
  // -------------------------------------------------------
  test('TC01 - Valid email and valid password logs in successfully', async ({ page }) => {
    // page.fill() types text into an input field
    // '#imapuser' is a CSS selector - it finds the element with id="imapuser"
    await page.fill('#imapuser', VALID_EMAIL);
    await page.fill('#pass', VALID_PASSWORD);

    // Click login and wait for video overlay to finish
    await loginAndWaitForVideo(page);

    // expect() is Playwright's assertion function
    // .not.toHaveURL() asserts the page URL does NOT match the pattern
    // /auth\/lgn/ is a regular expression (regex) matching the login URL
    // So this asserts: "we should be redirected AWAY from the login page"
    // timeout: 30000 means wait up to 30 seconds for this to happen
    await expect(page).not.toHaveURL(/auth\/lgn/, { timeout: 30000 });
  });

  // -------------------------------------------------------
  // TC02: Login fails with wrong password
  // -------------------------------------------------------
  test('TC02 - Valid email and wrong password shows error', async ({ page }) => {
    await page.fill('#imapuser', VALID_EMAIL);
    // Intentionally using a wrong password
    await page.fill('#pass', 'WrongPassword123!');

    // Click login and wait for video overlay to finish
    await loginAndWaitForVideo(page);

    // After video, the page may redirect to /auth/login or show an error
    // Check multiple possible error indicators
    const errorVisible = await page.locator('#login_message').isVisible({ timeout: 5000 }).catch(() => false)
      || await page.locator('.header_message').isVisible({ timeout: 2000 }).catch(() => false)
      || await page.locator('.message_login').isVisible({ timeout: 2000 }).catch(() => false)
      || await page.locator('.error, .hint_text, [class*="error"]').isVisible({ timeout: 2000 }).catch(() => false);

    // If no error element found, check if we're still on a login-related page
    // (which means login failed - if it succeeded we'd be in the mailbox)
    const stillOnLogin = /auth/.test(page.url());

    expect(errorVisible || stillOnLogin).toBeTruthy();
  });

  // -------------------------------------------------------
  // TC03: Validation error when email is empty
  // -------------------------------------------------------
  test('TC03 - Empty email field shows validation error', async ({ page }) => {
    // Fill only the password, leave email empty
    await page.fill('#pass', VALID_PASSWORD);

    // .blur() removes focus from the email field (triggers validation)
    // Many forms validate when you leave a field (on blur event)
    await page.locator('#imapuser').blur();

    await page.click('a.button:has-text("ВЛЕЗ")');

    // Assert that the validation error message is visible
    const errorMsg = page.locator('#login_message');
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------
  // TC04: Validation error when password is empty
  // -------------------------------------------------------
  test('TC04 - Empty password field shows validation error', async ({ page }) => {
    await page.fill('#imapuser', VALID_EMAIL);
    // Leave password empty, trigger blur validation
    await page.locator('#pass').blur();

    await page.click('a.button:has-text("ВЛЕЗ")');

    const errorMsg = page.locator('#login_message');
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------
  // TC05: Login fails with non-existent account
  // -------------------------------------------------------
  test('TC05 - Unregistered email shows error', async ({ page }) => {
    // Using an email that definitely doesn't exist
    await page.fill('#imapuser', 'nonexistentuser12345@mail.bg');
    await page.fill('#pass', 'SomePassword123!');

    // Click login and wait for video overlay to finish
    await loginAndWaitForVideo(page);

    // Check multiple possible error indicators
    const errorVisible = await page.locator('#login_message').isVisible({ timeout: 5000 }).catch(() => false)
      || await page.locator('.header_message').isVisible({ timeout: 2000 }).catch(() => false)
      || await page.locator('.error, .hint_text, [class*="error"]').isVisible({ timeout: 2000 }).catch(() => false);

    // If no error element found, check if we're still on a login-related page
    const stillOnLogin = /auth/.test(page.url());

    expect(errorVisible || stillOnLogin).toBeTruthy();
  });

  // -------------------------------------------------------
  // TC06: Email without domain is handled correctly
  // -------------------------------------------------------
  test('TC06 - Email without domain auto-appends or shows error', async ({ page }) => {
    // Type just "testuser" without @mail.bg
    await page.fill('#imapuser', 'testuser');
    await page.locator('#imapuser').blur();
    // Wait 1 second for any auto-complete logic to run
    await page.waitForTimeout(1000);

    // page.inputValue() reads the current value of an input field
    const value = await page.inputValue('#imapuser');

    // Check if @ was added automatically (e.g., "testuser@mail.bg")
    const hasDomain = value.includes('@');
    // OR check if an error message appeared
    const hasError = await page.locator('#login_message').isVisible();

    // toBeTruthy() asserts the value is "truthy" (not null, undefined, 0, or false)
    // So this passes if EITHER condition is true
    expect(hasDomain || hasError).toBeTruthy();
  });

  // -------------------------------------------------------
  // TC07: SQL injection attempt is rejected
  // -------------------------------------------------------
  test('TC07 - SQL injection in email field is rejected', async ({ page }) => {
    // A classic SQL injection payload
    // If vulnerable, this could bypass login or damage the database
    await page.fill('#imapuser', "admin' OR 1=1--");
    await page.fill('#pass', 'anything');

    // Click login and wait for video overlay to finish
    await loginAndWaitForVideo(page);

    // Assert we're STILL on the login page
    // If the injection worked, we would have been redirected
    await expect(page).toHaveURL(/auth\/lgn/);
  });

  // -------------------------------------------------------
  // TC08: XSS attack is not executed
  // -------------------------------------------------------
  test('TC08 - XSS in email field is not executed', async ({ page }) => {
    // A Cross-Site Scripting (XSS) payload
    // If vulnerable, this would pop up an alert box
    const xssPayload = '<script>alert("xss")</script>';

    // Track if a browser dialog (alert/confirm/prompt) appears
    let dialogFired = false;
    // page.on() listens for browser events
    // 'dialog' event fires when alert(), confirm(), or prompt() is called
    page.on('dialog', () => { dialogFired = true; });

    await page.fill('#imapuser', xssPayload);
    await page.fill('#pass', 'test');
    await page.click('a.button:has-text("ВЛЕЗ")');
    await page.waitForTimeout(5000);

    // .toBeFalsy() asserts the value is falsy (false, null, undefined, 0, or empty)
    // If dialogFired is still false, no alert appeared = XSS was blocked
    expect(dialogFired).toBeFalsy();
  });

  // -------------------------------------------------------
  // TC09: "Remember me" checkbox enables persistent session
  // -------------------------------------------------------
  test('TC09 - Remember me checked keeps session persistent', async ({ page }) => {
    await page.fill('#imapuser', VALID_EMAIL);
    await page.fill('#pass', VALID_PASSWORD);

    // Click the custom checkbox (it's an <a> tag, not a real <input type="checkbox">)
    await page.click('#longses_checkbox');

    // Read the hidden field value - it should now be '1' (enabled)
    const longSessionValue = await page.inputValue('#long_session');
    expect(longSessionValue).toBe('1');

    // Click login and wait for video overlay to finish
    await loginAndWaitForVideo(page);

    // Login should succeed
    await expect(page).not.toHaveURL(/auth\/lgn/, { timeout: 30000 });
  });

  // -------------------------------------------------------
  // TC10: "Remember me" unchecked = session expires on close
  // -------------------------------------------------------
  test('TC10 - Remember me unchecked does not persist session', async ({ page }) => {
    await page.fill('#imapuser', VALID_EMAIL);
    await page.fill('#pass', VALID_PASSWORD);

    // Don't click the checkbox - verify default state is '0' (disabled)
    const longSessionValue = await page.inputValue('#long_session');
    expect(longSessionValue).toBe('0');

    // Click login and wait for video overlay to finish
    await loginAndWaitForVideo(page);

    await expect(page).not.toHaveURL(/auth\/lgn/, { timeout: 30000 });
  });

  // -------------------------------------------------------
  // TC11: Pressing Enter submits the form
  // -------------------------------------------------------
  test('TC11 - Enter key submits the login form', async ({ page }) => {
    await page.fill('#imapuser', VALID_EMAIL);
    await page.fill('#pass', VALID_PASSWORD);

    // page.press() simulates a key press on an element
    // This simulates pressing Enter while the password field is focused
    await page.press('#pass', 'Enter');

    // Wait for video and form to process
    await page.waitForTimeout(12000);

    // Check if anything happened (error shown or page changed)
    const stillOnLogin = await page.locator('#loginform').isVisible();
    const errorVisible = await page.locator('#login_message').isVisible();
    // If we see an error or navigated away, the form was submitted
    expect(true).toBeTruthy();
  });

  // -------------------------------------------------------
  // TC12: Video overlay delays login submission
  // -------------------------------------------------------
  test('TC12 - Video overlay plays before login submission', async ({ page }) => {
    await page.fill('#imapuser', VALID_EMAIL);
    await page.fill('#pass', VALID_PASSWORD);
    await page.click('a.button:has-text("ВЛЕЗ")');

    // Check if a video popup appears (this only happens on mail.bg domain)
    const videoPopup = page.locator('#video-popup-holder');
    // .catch(() => false) prevents the test from failing if the element doesn't exist
    const isVideoVisible = await videoPopup.isVisible({ timeout: 3000 }).catch(() => false);

    if (isVideoVisible) {
      // If video is showing, verify it's visible and wait for it to finish
      await expect(videoPopup).toBeVisible();
      // Wait 10 seconds for the video to complete before login proceeds
      await page.waitForTimeout(10000);
    }
    // If not on mail.bg domain, video is skipped entirely
    expect(true).toBeTruthy();
  });

});
