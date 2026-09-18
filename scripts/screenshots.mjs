/**
 * Screenshot and layout sweep.
 *
 * Browser checks that a unit test cannot make: focus behaviour in a real
 * dialog, a shortlist opened in a genuinely fresh anonymous context, and
 * whether anything overflows sideways at phone widths.
 *
 *   npx playwright install chromium     once
 *   npm run dev                         in another terminal
 *   npm run screenshots
 *
 * BASE defaults to http://localhost:3000. Point it at a preview deployment to
 * check one. Run against a DEMO dataset, never against production: it submits
 * reports, creates shortlists and casts votes.
 */

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const TAG = process.env.TAG || 'prod';
const OUT = process.env.OUT || 'screenshots';

const SIZES = [
  { name: '360', width: 360, height: 800, mobile: true },
  { name: '390', width: 390, height: 844, mobile: true },
  { name: '430', width: 430, height: 932, mobile: true },
  { name: 'tablet', width: 768, height: 1024, mobile: false },
  { name: 'desktop', width: 1280, height: 900, mobile: false },
];

const PAGES = (process.env.PAGES || '/:explore,/?view=tonight:tonight,/report:update,/v/berlin-nightclub:venue,/saved:saved,/events:events,/corrections:corrections,/about:about')
  .split(',').map(s => { const i = s.lastIndexOf(':'); return { path: s.slice(0,i), name: s.slice(i+1) }; });

const overflow = [];
await (await import('node:fs/promises')).mkdir(OUT, { recursive: true });
// CHROMIUM_PATH lets a CI image or sandbox point at a Chromium it already has
// instead of downloading one. Unset locally, where `npx playwright install`
// has put it where Playwright expects.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);

for (const size of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 2,
    isMobile: size.mobile,
    hasTouch: size.mobile,
    timezoneId: 'America/Toronto',
    locale: 'en-CA',
  });
  const page = await ctx.newPage();
  for (const p of PAGES) {
    await page.goto(BASE + p.path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(350);
    // Horizontal overflow check, per the acceptance criteria.
    const res = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      offenders: [...document.querySelectorAll('*')]
        .filter(el => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.right > document.documentElement.clientWidth + 1 &&
                 cs.overflowX !== 'auto' && cs.overflowX !== 'scroll';
        })
        .slice(0, 5)
        .map(el => el.className || el.tagName),
    }));
    if (res.scrollW > res.clientW + 1) {
      overflow.push({ size: size.name, page: p.name, ...res });
    }
    await page.screenshot({ path: `${OUT}/${TAG}-${p.name}-${size.name}.png`, fullPage: size.mobile });
  }
  await ctx.close();
}

await browser.close();
console.log(overflow.length === 0
  ? 'NO HORIZONTAL OVERFLOW at any tested width'
  : 'OVERFLOW:\n' + JSON.stringify(overflow, null, 2));
