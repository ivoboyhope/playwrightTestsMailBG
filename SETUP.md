# Mail.bg Playwright Tests

## Prerequisites

- Node.js 18+ (https://nodejs.org)

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Configuration

Set your test credentials as environment variables:

```bash
# Windows PowerShell
$env:MAIL_BG_EMAIL = "your-email@mail.bg"
$env:MAIL_BG_PASSWORD = "your-password"

# Or create a .env file and use dotenv in tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run in headed mode (visible browser)
npm run test:headed

# Run with debug UI
npm run test:debug

# Run a specific test file
npx playwright test tests/login.spec.js

# Run a specific test by name
npx playwright test -g "TC01"
```

## View Report

```bash
npx playwright show-report
```

## Test Coverage

| Test | Description |
|------|-------------|
| TC01 | Valid email + password login |
| TC02 | Wrong password error |
| TC03 | Empty email validation |
| TC04 | Empty password validation |
| TC05 | Unregistered email error |
| TC06 | Email without domain handling |
| TC07 | SQL injection protection |
| TC08 | XSS prevention |
| TC09 | Remember me - checked |
| TC10 | Remember me - unchecked |
| TC11 | Enter key submits form |
| TC12 | Video overlay before login |
