/**
 * Capture user-manual screenshots in headless Chromium (fixed viewport).
 * Produces separate English and Dutch image sets.
 *
 * Prerequisites: frontend on :3002 and backend on :8200 with demo data seeded.
 *
 *   cd frontend && npm run capture-manual-screenshots
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_ROOT = path.resolve(__dirname, '../../docs/user-manual/images');
const BASE_LOGIN = process.env.MANUAL_BASE_URL ?? 'http://admin.lvh.me:3002';
const DEMO_PASSWORD = 'DemoPass123!';

const VIEWPORT = { width: 1400, height: 900 };

const LOCALES = {
  en: {
    playwrightLocale: 'en-GB',
    loginReady: () => ({ role: 'button', name: 'Sign In' }),
    headings: {
      dashboard: 'Dashboard',
      myBusinesses: 'My Businesses',
      directory: 'Business Directory',
      registerBusiness: 'Register Business',
      partnerships: 'Partnerships',
      directoryAdmin: 'Directory Administration',
    },
    pendingTab: /pending approval/i,
  },
  nl: {
    playwrightLocale: 'nl-NL',
    loginReady: () => ({ role: 'button', name: 'Aanmelden' }),
    headings: {
      dashboard: 'Dashboard',
      myBusinesses: 'Mijn bedrijven',
      directory: 'Bedrijvengids',
      registerBusiness: 'Bedrijf registreren',
      partnerships: 'Partnerschappen',
      directoryAdmin: 'Gidsbeheer',
    },
    pendingTab: /in afwachting/i,
  },
};

const HIDE_DEV_UI = `
  nextjs-portal,
  [data-nextjs-dev-tools-button],
  button[aria-label="Open Next.js Dev Tools"],
  button[aria-label="Close Next.js Dev Tools"] {
    display: none !important;
  }
`;

async function waitForLoginReady(page, lang) {
  const ready = LOCALES[lang].loginReady();
  await page.getByRole(ready.role, { name: ready.name }).first().waitFor({
    state: 'visible',
    timeout: 30_000,
  });
}

async function setLanguageOnPage(page, lang) {
  await page.evaluate((l) => {
    localStorage.setItem('lang', l);
    document.cookie = `lang=${l};path=/;max-age=31536000`;
  }, lang);
}

async function persistLanguagePreference(page, lang) {
  try {
    await page.request.put('/api/me/preferences/language', { data: { language: lang } });
  } catch {
    /* ignore if not authenticated yet */
  }
  await setLanguageOnPage(page, lang);
}

async function prepareLoginPage(page, lang) {
  await page.goto(`${BASE_LOGIN}/login`, { waitUntil: 'networkidle', timeout: 60_000 });
  await setLanguageOnPage(page, lang);
  await page.reload({ waitUntil: 'networkidle', timeout: 60_000 });
  await waitForLoginReady(page, lang);
}

async function login(page, username, password, lang) {
  await prepareLoginPage(page, lang);

  await page.fill('#username', username);
  await page.fill('#password', password);
  const loginResponse = page.waitForResponse(
    (r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST',
    { timeout: 60_000 },
  );
  await page.click('button[type="submit"]');
  const res = await loginResponse;
  if (!res.ok()) {
    throw new Error(`Login failed for ${username}: HTTP ${res.status()}`);
  }
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 60_000,
    waitUntil: 'networkidle',
  });

  await persistLanguagePreference(page, lang);
  await page.reload({ waitUntil: 'networkidle', timeout: 60_000 });
}

async function logout(page) {
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch {
    /* ignore */
  }
  try {
    await page.request.get('/api/auth/logout', { timeout: 10_000 });
  } catch {
    /* ignore */
  }
  await page.context().clearCookies();
}

async function shot(page, outDir, filename, options = {}) {
  const filePath = path.join(outDir, filename);
  await page.addStyleTag({ content: HIDE_DEV_UI }).catch(() => {});
  await page.screenshot({
    path: filePath,
    fullPage: false,
    animations: 'disabled',
    ...options,
  });
  console.log(`  saved ${path.basename(outDir)}/${filename}`);
}

async function waitForHeading(page, text, timeout = 30_000) {
  await page.getByRole('heading', { name: text, exact: false }).first().waitFor({
    state: 'visible',
    timeout,
  });
}

async function captureLocale(browser, lang) {
  const cfg = LOCALES[lang];
  const outDir = path.join(IMAGES_ROOT, lang);
  fs.mkdirSync(outDir, { recursive: true });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: cfg.playwrightLocale,
  });
  const page = await context.newPage();

  console.log(`\nCapturing ${lang.toUpperCase()}...`);

  console.log('  login');
  await prepareLoginPage(page, lang);
  await shot(page, outDir, '01-login.png');

  console.log('  member portal (demo_baitur_member)');
  await login(page, 'demo_baitur_member', DEMO_PASSWORD, lang);
  await page.goto(`${new URL(page.url()).origin}/dashboard`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await waitForHeading(page, cfg.headings.dashboard);
  await shot(page, outDir, '02-member-dashboard.png');

  await page.goto(`${new URL(page.url()).origin}/my-businesses`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await waitForHeading(page, cfg.headings.myBusinesses);
  await page.waitForTimeout(500);
  await shot(page, outDir, '03-my-businesses.png');

  await page.goto(`${new URL(page.url()).origin}/directory`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await waitForHeading(page, cfg.headings.directory);
  await page.waitForTimeout(500);
  await shot(page, outDir, '04-business-directory.png');

  await page.goto(`${new URL(page.url()).origin}/my-businesses/new`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await waitForHeading(page, cfg.headings.registerBusiness);
  await shot(page, outDir, '05-register-business.png');

  await logout(page);

  console.log('  federation admin (demo_rbsis_admin)');
  await login(page, 'demo_rbsis_admin', DEMO_PASSWORD, lang);
  await page.goto(`${new URL(page.url()).origin}/partnerships`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await waitForHeading(page, cfg.headings.partnerships);
  await page.waitForTimeout(500);
  await shot(page, outDir, '06-partnerships.png');

  await logout(page);

  console.log('  mosque admin (demo_baitur_admin)');
  await login(page, 'demo_baitur_admin', DEMO_PASSWORD, lang);
  await page.goto(`${new URL(page.url()).origin}/business-directory/admin`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await waitForHeading(page, cfg.headings.directoryAdmin);
  await page.waitForTimeout(500);
  await shot(page, outDir, '07-directory-admin.png');

  const pendingTab = page.getByRole('button', { name: cfg.pendingTab });
  if (await pendingTab.isVisible().catch(() => false)) {
    await pendingTab.click();
    await page.waitForTimeout(800);
  }
  await shot(page, outDir, '08-directory-pending.png');

  await context.close();
}

async function main() {
  fs.mkdirSync(IMAGES_ROOT, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1',
    ],
  });

  for (const lang of ['en', 'nl']) {
    await captureLocale(browser, lang);
  }

  await browser.close();
  console.log(`\nDone. Images in ${IMAGES_ROOT}/en and ${IMAGES_ROOT}/nl`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
