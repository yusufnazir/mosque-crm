/**
 * Playwright global setup — runs once before the entire test suite.
 *
 * Responsibilities:
 *  1. Verify the backend is reachable.
 *  2. Ensure the `testadmin` user exists (ADMIN role, org 1).
 *
 * This file is referenced in playwright.config.ts via `globalSetup`.
 */
import { request, chromium } from '@playwright/test';
import { BACKEND_URL, createApiContext, disposeApiContext, ensureTestOrg, ensureTestSubscription, ensureTestAdmin, ensureTestMember } from './helpers/api';

const FRONTEND_BASE_URL = 'http://admin.lvh.me:3002';

export default async function globalSetup(): Promise<void> {
  // ── 1. Check backend health ────────────────────────────────────────────────
  const healthCtx = await request.newContext();
  try {
    const health = await healthCtx.get(`${BACKEND_URL}/actuator/health`, {
      timeout: 10_000,
    });
    if (!health.ok()) {
      console.warn(`[global-setup] Backend health check returned ${health.status()} — tests may fail.`);
    }
  } catch {
    console.warn('[global-setup] Could not reach backend health endpoint — is the backend running?');
  } finally {
    await healthCtx.dispose();
  }

  // ── 2. Warm up Next.js dev server ─────────────────────────────────────────
  // Next.js dev server compiles routes lazily AND generates a new devBuildId
  // (the `?v=xxx` cache-buster) on every compilation. A plain HTTP GET only
  // compiles server-side HTML, not browser JS chunks. When the test browser
  // later visits those pages, it requests main-app.js?v=<new-id> which isn't
  // compiled yet (→ status -1, React never hydrates, test times out).
  //
  // Using a real browser for warm-up ensures ALL JS chunks are requested and
  // compiled. After the browser warm-up, the devBuildId is stable and every
  // subsequent test navigation gets cached chunks immediately.
  const warmupBrowser = await chromium.launch({
    headless: true,
    args: [
      // Block Google Fonts so the load event fires promptly (same as test config).
      '--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1',
    ],
  });
  try {
    console.log('[global-setup] Warming up Next.js dev server with browser (may take ~30s on first run)...');
    const warmupCtx = await warmupBrowser.newContext({ baseURL: FRONTEND_BASE_URL });
    const warmupPage = await warmupCtx.newPage();

    // 1. Load login page — triggers compilation of login page chunks + main-app.js.
    //    waitUntil:'load' ensures all scripts have been downloaded and executed.
    await warmupPage.goto(`${FRONTEND_BASE_URL}/login`, { waitUntil: 'load', timeout: 60_000 });

    // 2. Log in as admin to get a session cookie for authenticated routes.
    await warmupPage.fill('#username', 'administrator');
    await warmupPage.fill('#password', 'admin123');
    await warmupPage.click('button[type="submit"]');
    // Wait for redirect to dashboard (up to 60s for first compilation of API route + dashboard).
    await warmupPage.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 });

    // 3. Wait for the dashboard to fully load its JS chunks.
    await warmupPage.waitForLoadState('load', { timeout: 60_000 });

    // 4. Stability check: re-navigate to /dashboard until main-app.js loads
    //    successfully. A background middleware/proxy.ts recompilation can
    //    generate a new devBuildId ~20 s after the first request hits the dev
    //    server. If main-app.js for that new devBuildId isn't compiled yet the
    //    request fails with status -1 and React never hydrates.
    //    We retry (up to 3 times with a 35 s wait) until the build is stable.
    for (let attempt = 0; attempt < 3; attempt++) {
      let mainAppFailed = false;
      const onFailed = (req: { url: () => string }) => {
        if (req.url().includes('_next/static/chunks/main-app')) {
          mainAppFailed = true;
        }
      };
      warmupPage.on('requestfailed', onFailed);
      try {
        await warmupPage.goto(`${FRONTEND_BASE_URL}/dashboard`, {
          waitUntil: 'load',
          timeout: 120_000,
        });
      } finally {
        warmupPage.off('requestfailed', onFailed);
      }
      if (!mainAppFailed) {
        console.log(`[global-setup] devBuildId stable (stability check ${attempt + 1}).`);
        break;
      }
      console.log(`[global-setup] main-app.js failed on stability check ${attempt + 1}, waiting 35 s for compilation…`);
      await warmupPage.waitForTimeout(35_000);
    }

    await warmupCtx.close();
    console.log('[global-setup] Next.js warm-up complete.');
  } catch (e) {
    console.warn('[global-setup] Browser warm-up failed (non-fatal):', e);
  } finally {
    await warmupBrowser.close();
  }

  // ── 3. Ensure test org + testadmin exist ────────────────────────────────
  let saApi;
  try {
    saApi = await createApiContext('administrator', 'admin123');
    const orgId = await ensureTestOrg(saApi);
    console.log(`[global-setup] test org ready (id=${orgId})`);
    await ensureTestSubscription(saApi, orgId);
    console.log(`[global-setup] test org subscription ready (billingEnabled=false)`);
    const id = await ensureTestAdmin(saApi, orgId);
    console.log(`[global-setup] testadmin ready (id=${id})`);
    const memberId = await ensureTestMember(saApi, orgId);
    console.log(`[global-setup] testmember ready (id=${memberId})`);
  } catch (err) {
    console.error('[global-setup] Failed to set up testadmin:', err);
    // Do not throw — allow existing tests to still run.
  } finally {
    if (saApi) await disposeApiContext(saApi);
  }
}
