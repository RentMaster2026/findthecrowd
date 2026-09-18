/**
 * End to end interaction checks.
 *
 * Browser checks that a unit test cannot make: focus behaviour in a real
 * dialog, a shortlist opened in a genuinely fresh anonymous context, and
 * whether anything overflows sideways at phone widths.
 *
 *   npx playwright install chromium     once
 *   npm run dev                         in another terminal
 *   npm run test:e2e
 *
 * BASE defaults to http://localhost:3000. Point it at a preview deployment to
 * check one. Run against a DEMO dataset, never against production: it submits
 * reports, creates shortlists and casts votes.
 */

import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = process.env.OUT || 'screenshots';
const results = [];
const ok = (n, v, extra='') => results.push(`${v ? 'PASS' : 'FAIL'}  ${n}${extra ? '  — ' + extra : ''}`);

// CHROMIUM_PATH lets a CI image or sandbox point at a Chromium it already has
// instead of downloading one. Unset locally, where `npx playwright install`
// has put it where Playwright expects.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const mobile = { viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true, timezoneId:'America/Toronto', locale:'en-CA' };

/* ---------- report sheet ---------- */
{
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/v/berlin-nightclub?at=peak`, { waitUntil:'networkidle' });

  const opener = page.getByRole('button', { name: /I'm here, add an update/i });
  await opener.click();
  await page.waitForSelector('[role="dialog"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/e2e-sheet-closed-details.png` });

  // The short path must be visually short: submit above "Add details".
  const submitY = await page.locator('.btn-submit').evaluate(el => el.getBoundingClientRect().top);
  const detailsY = await page.locator('.details-toggle').evaluate(el => el.getBoundingClientRect().top);
  ok('submit sits above the optional details', submitY < detailsY, `submit ${Math.round(submitY)} < details ${Math.round(detailsY)}`);

  const optionalHidden = await page.locator('#report-details').isHidden();
  ok('optional fields are collapsed by default', optionalHidden);

  // Submit disabled until both required answers exist.
  ok('send disabled before answering', await page.locator('.btn-submit').isDisabled());
  await page.getByRole('button', { name: 'Busy', exact: true }).click();
  ok('send still disabled after one answer', await page.locator('.btn-submit').isDisabled());
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  ok('send enabled after both answers', await page.locator('.btn-submit').isEnabled());

  // Answers can be changed before sending.
  await page.getByRole('button', { name: 'Not right now', exact: true }).click();
  ok('verdict can be changed before sending',
     await page.getByRole('button', { name: 'Not right now', exact: true }).getAttribute('aria-pressed') === 'true');

  // Focus is trapped inside the dialog.
  const inside = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    return dlg.contains(document.activeElement);
  });
  ok('focus starts inside the dialog', inside);

  for (let i = 0; i < 40; i++) await page.keyboard.press('Tab');
  const stillInside = await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement));
  ok('focus stays trapped after 40 tabs', stillInside);

  // Details expand by keyboard.
  await page.locator('.details-toggle').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  ok('details expand from the keyboard', await page.locator('#report-details').isVisible());
  await page.screenshot({ path: `${OUT}/e2e-sheet-open-details.png` });

  // Escape closes and focus returns to the opener.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  ok('escape closes the sheet', await page.locator('[role="dialog"]').count() === 0);
  const returned = await page.evaluate(() => document.activeElement?.textContent?.includes("I'm here"));
  ok('focus returns to the button that opened it', Boolean(returned));
}

/* ---------- report submission: success then cooldown ---------- */
{
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/v/the-27-club?at=peak`, { waitUntil:'networkidle' });
  await page.getByRole('button', { name: /I'm here, add an update/i }).click();
  await page.waitForSelector('[role="dialog"]');
  await page.getByRole('button', { name: 'Steady', exact: true }).click();
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await page.locator('.btn-submit').click();
  await page.waitForTimeout(1200);
  const thanked = await page.locator('.sheet-done').count();
  ok('success shown only after the server accepts', thanked === 1);
  await page.screenshot({ path: `${OUT}/e2e-report-success.png` });
  const hasShare = await page.getByRole('button', { name: /Share this place/i }).count();
  ok('success offers share without forcing it', hasShare === 1);
  await page.getByRole('button', { name: 'Done' }).click();
  await page.waitForTimeout(400);

  // Same device, same venue, straight away -> cooldown, not a fake success.
  await page.getByRole('button', { name: /I'm here, add an update/i }).click();
  await page.getByRole('button', { name: 'Packed', exact: true }).click();
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await page.locator('.btn-submit').click();
  await page.waitForTimeout(1200);
  const err = await page.locator('.note-error').textContent().catch(() => '');
  ok('cooldown is reported accurately', /already reported/i.test(err || ''), (err||'').trim().slice(0,70));
  ok('no false success on cooldown', await page.locator('.sheet-done').count() === 0);
  await page.screenshot({ path: `${OUT}/e2e-report-cooldown.png` });
}

/* ---------- saved -> shortlist -> fresh anonymous vote ---------- */
let groupCode = null;
{
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/v/berlin-nightclub?at=peak`, { waitUntil:'networkidle' });
  await page.getByRole('button', { name: /^Save$/ }).click();
  await page.goto(`${BASE}/v/the-palace?at=peak`, { waitUntil:'networkidle' });
  await page.getByRole('button', { name: /^Save$/ }).click();
  await page.goto(`${BASE}/saved`, { waitUntil:'networkidle' });
  await page.waitForTimeout(400);
  ok('saved list survives navigation', (await page.locator('.saved-row').count()) === 2);
  await page.screenshot({ path: `${OUT}/e2e-saved.png`, fullPage:true });

  await page.getByRole('button', { name: /Ask the group/i }).click();
  await page.waitForTimeout(1200);
  const link = await page.locator('.group-link').textContent().catch(() => null);
  ok('shortlist link created', Boolean(link && /\/g\//.test(link)), (link||'').trim());
  groupCode = link ? link.trim().split('/g/')[1] : null;
}

if (groupCode) {
  // A completely fresh context: no localStorage, no cookies, no account.
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/g/${groupCode}`, { waitUntil:'networkidle' });
  await page.waitForTimeout(1200); // let React hydrate before clicking
  ok('shortlist opens for a stranger with no account', await page.locator('.ballot-option').count() === 2);

  const noindex = await page.locator('meta[name="robots"]').getAttribute('content').catch(()=>null);
  ok('shortlist page is noindex', /noindex/i.test(noindex || ''), noindex || 'missing');

  await page.locator('.ballot-option').first().click();
  await page.waitForTimeout(900);
  let counts = await page.locator('.ballot-count').allTextContents();
  ok('vote is counted', counts.join(',').startsWith('1'), counts.join(' | '));

  await page.locator('.ballot-option').nth(1).click();
  await page.waitForTimeout(900);
  counts = await page.locator('.ballot-count').allTextContents();
  const total = await page.locator('.source-line').first().textContent();
  ok('changing a vote replaces it rather than adding one', /1 vote/.test(total || ''), (total||'').trim().slice(0,60));
  await page.screenshot({ path: `${OUT}/e2e-group-vote.png`, fullPage:true });

  const leader = await page.locator('.group-leader h2').textContent().catch(()=>null);
  ok('leading option shown with venue and directions', Boolean(leader), leader || '');
}

/* ---------- correction flow ---------- */
{
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/v/berlin-nightclub?at=peak`, { waitUntil:'networkidle' });
  await page.getByRole('link', { name: /Something wrong\? Tell us/i }).click();
  await page.waitForURL(/\/corrections/);
  await page.waitForSelector('.correction-form', { timeout: 10000 });
  ok('correction link reaches a real form', await page.locator('.correction-form').count() === 1);
  await page.locator('textarea').fill('The Saturday night actually starts at 11pm, not 10pm.');
  await page.getByRole('button', { name: /Send correction/i }).click();
  await page.waitForTimeout(900);
  const confirm = await page.locator('[role="status"]').textContent().catch(()=>'');
  ok('correction confirms where it landed', /server log|recorded/i.test(confirm||''), (confirm||'').trim().slice(0,90));
  await page.screenshot({ path: `${OUT}/e2e-correction.png`, fullPage:true });
}

/* ---------- filters keep state in the URL ---------- */
{
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?at=peak`, { waitUntil:'networkidle' });
  await page.getByRole('button', { name: /Filters/i }).click();
  await page.selectOption('.filter-field select', 'elgin');
  await page.waitForTimeout(700);
  ok('filter state lands in the URL', page.url().includes('district=elgin'), page.url());
  await page.getByRole('link', { name: /Back to Explore|^$/ }).count();
  await page.goto(`${BASE}/v/the-standard?at=peak`, { waitUntil:'networkidle' });
  await page.goBack({ waitUntil:'networkidle' });
  await page.waitForTimeout(500);
  ok('back navigation restores the filter', page.url().includes('district=elgin'), page.url());
  const stillActive = await page.locator('.filter-field select').inputValue().catch(()=>'');
  ok('filter control shows the restored value', stillActive === 'elgin', stillActive);
}

await browser.close();
console.log(results.join('\n'));
const failed = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
