// Auto-captures the desktop report screenshots into ./screenshots, in the order
// the project spec describes the app (overview → roles/login → cook → consumer →
// admin → profile). The mobile/tablet shots are captured manually (see README).
//
// Relies on the seed data in schema.sql (run `mysql -u root < schema.sql` first)
// — it does NOT create its own data.
//
// Usage:
//   1. App running:  npm start   (http://localhost:3000)
//   2. One-time:     npm i -D playwright && npx playwright install chromium
//   3. Run:          node capture-screenshots.js

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASS = 'pass1234';
const OUT = path.join(__dirname, 'screenshots');
const VIEWPORT = { width: 1440, height: 900 };

fs.mkdirSync(OUT, { recursive: true });

async function newCtx(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, ...opts });
  const page = await ctx.newPage();
  return { ctx, page };
}

// Open the app as a guest (no session) and wait for the landing page.
async function guest(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.hero', { timeout: 8000 }).catch(() => {});
}

// Log in via the API, then reload so the SPA picks up the session (currentUser).
async function login(page, username) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  const res = await page.evaluate(async ([u, p]) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p }),
    });
    return { ok: r.ok, status: r.status };
  }, [username, PASS]);
  if (!res.ok) throw new Error(`login ${username} failed (${res.status})`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser, null, { timeout: 8000 });
}

// Switch SPA view (navigate() is a global function in app.js).
const show = (page, view) => page.evaluate((v) => navigate(v), view);
const wait = (page, ms) => page.waitForTimeout(ms);
const shot = (page, name) =>
  page.screenshot({ path: path.join(OUT, name), fullPage: true }).then(() => console.log('  ✓', name));

async function run() {
  const browser = await chromium.launch();
  console.log('• Capturing…');
  try {
    // 01 — Guest landing page (overview, live stats, how it works, points rules)
    {
      const { ctx, page } = await newCtx(browser);
      await guest(page);
      await wait(page, 1200);
      await shot(page, '01-home-landing.png');
      await ctx.close();
    }

    // 02 + 03 — Login and Register screens (Α: ρόλοι / εγγραφή)
    {
      const { ctx, page } = await newCtx(browser);
      await guest(page);
      await show(page, 'auth');
      await page.waitForSelector('.auth-form', { timeout: 8000 });
      await wait(page, 400);
      await shot(page, '02-auth-login.png');

      // toggle to register and fill it (new users start with 5 points + live email check)
      await page.locator('.auth-form a', { hasText: 'Φτιάξε' }).click();
      await wait(page, 300);
      await page.getByPlaceholder('π.χ. Μαρία').fill('Νέα');
      await page.getByPlaceholder('π.χ. Παπαδοπούλου').fill('Φοιτήτρια');
      await page.locator('input[type=email]').fill('nea.foititria@mail.ntua.gr');
      await page.locator('input[type=tel]').fill('6940000000');
      await page.getByPlaceholder('Τουλάχιστον 6 χαρακτήρες').fill('pass1234');
      await page.getByPlaceholder('Ξαναγράψε τον κωδικό').fill('pass1234');
      await wait(page, 900); // let the debounced email check + match hint show
      await shot(page, '03-auth-register.png');
      await ctx.close();
    }

    // 04 — Feed: list + map, exhausted listing greyed out (Γ1)
    {
      const { ctx, page } = await newCtx(browser);
      await login(page, 'maria');
      await show(page, 'feed');
      await wait(page, 2800);
      await shot(page, '04-feed.png');
      await ctx.close();
    }

    // 05 — Feed filters: search/sort + allergen-exclude chips (Γ1)
    {
      const { ctx, page } = await newCtx(browser);
      await login(page, 'maria');
      await show(page, 'feed');
      await wait(page, 1500);
      await page.locator('.allergen-filter button', { hasText: 'Γάλα' }).click(); // χωρίς γάλα
      await wait(page, 700);
      await page.locator('.filter-field', { hasText: 'Ταξινόμηση' }).locator('select').selectOption('rating');
      await wait(page, 1800);
      await shot(page, '05-feed-filters.png');
      await ctx.close();
    }

    // 06 — Distance filter/sort: geolocation mocked to Patras + maxKm (Γ1)
    {
      const { ctx, page } = await newCtx(browser, {
        geolocation: { latitude: 38.2885, longitude: 21.7886 },
        permissions: ['geolocation'],
      });
      await login(page, 'maria');
      await show(page, 'feed');
      await wait(page, 1500);
      await page.locator('.feed-controls button', { hasText: 'Η θέση μου' }).click();
      await wait(page, 1800);
      await page.locator('.filter-field', { hasText: 'Απόσταση' }).locator('select').selectOption('5');
      await wait(page, 1800);
      await shot(page, '06-feed-distance.png');
      await ctx.close();
    }

    // 07 — New listing form: allergens + map pickup point (Β1, Β2)
    {
      const { ctx, page } = await newCtx(browser);
      await login(page, 'maria');
      await show(page, 'listingForm');
      await wait(page, 1000);
      const form = page.locator('.listing-form');
      await form.locator('input[type=text]').first().fill('Μουσακάς φούρνου');
      await form.locator('textarea').fill('Με φρέσκα λαχανικά, μερίδες σε ταπεράκια. Κρατήστε ζεστό!');
      await form.locator('input[type=number]').fill('6');
      await page.getByPlaceholder('π.χ. Εστία ΕΜΠ, Δωμάτιο 214').fill('Εστία ΕΜΠ, Δωμάτιο 110');
      await page.getByPlaceholder('π.χ. Σήμερα 18:00 - 20:00').fill('Σήμερα 19:00 - 21:00');
      const cbs = form.locator('.allergen-grid input[type=checkbox]');
      await cbs.nth(0).check();
      await cbs.nth(2).check();
      await wait(page, 500);
      await form.locator('.small-map').click({ position: { x: 160, y: 120 } });
      await wait(page, 800);
      await shot(page, '07-listing-form.png');
      await ctx.close();
    }

    // 08 — "Οι αγγελίες μου": points, edit/delete, expired listing (Β1, Β4)
    {
      const { ctx, page } = await newCtx(browser);
      await login(page, 'maria');
      await show(page, 'mine');
      await wait(page, 1500);
      await shot(page, '08-my-listings.png');
      await ctx.close();
    }

    // 09 — Cook inbox: every state (pending/approved/picked_up/rejected/no_show) (Β3)
    {
      const { ctx, page } = await newCtx(browser);
      await login(page, 'maria');
      await show(page, 'inbox');
      await wait(page, 1500);
      await shot(page, '09-cook-inbox.png');
      await ctx.close();
    }

    // 10 — Consumer reservations: pending + rated + awaiting-rating widget (Γ2, Γ3)
    {
      const { ctx, page } = await newCtx(browser);
      await login(page, 'nikos');
      await show(page, 'requests');
      await wait(page, 1300);
      await shot(page, '10-my-reservations.png');
      await ctx.close();
    }

    // 11 — Admin dashboard: monthly stats + leaderboard (Δ1, Δ2)
    {
      const { ctx, page } = await newCtx(browser);
      await login(page, 'admin');
      await show(page, 'admin');
      await wait(page, 1800);
      await shot(page, '11-admin-dashboard.png');
      await ctx.close();
    }

    // 12 — Profile page: account details + activity stats
    {
      const { ctx, page } = await newCtx(browser);
      await login(page, 'maria');
      await show(page, 'profile');
      await page.waitForSelector('.profile-card', { timeout: 8000 }).catch(() => {});
      await wait(page, 900);
      await shot(page, '12-profile.png');
      await ctx.close();
    }

    console.log(`\nDone → ${OUT}`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\nCapture failed:', err.message);
  console.error('Is the app running at', BASE, '? (npm start)  Did you load schema.sql?');
  process.exit(1);
});
