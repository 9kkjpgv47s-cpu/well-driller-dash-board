import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/Users/dominiceasterling/Projects/cj-os/package.json');
const { chromium, devices } = require('playwright');
const url = fs.readFileSync('/tmp/cj-demo/url.txt', 'utf8').trim().replace(/https?:\/\/[^/]+/, 'http://localhost:3001');
const b = await chromium.launch();
const p = await (await b.newContext({ ...devices['iPhone SE'] })).newPage();
await p.goto(url, { waitUntil: 'domcontentloaded' });
try { await p.waitForSelector('.leaflet-marker-icon', { timeout: 120000 }); } catch {}
await p.waitForSelector('button.well-card', { timeout: 120000 });
await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
  const VW = document.documentElement.clientWidth;
  const clipped = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const o = getComputedStyle(n).overflowX;
      if ((o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') &&
          el.getBoundingClientRect().left >= n.getBoundingClientRect().left - 1 &&
          el.getBoundingClientRect().right <= n.getBoundingClientRect().right + 60) {
        // inside a scroller — still clipped; check if el overflows the scroller's content
      }
      if ((o === 'hidden' || o === 'clip') && el.getBoundingClientRect().right > n.getBoundingClientRect().right) return true;
      if (o === 'auto' || o === 'scroll') {
        // el beyond scroller right edge is clipped visually
        if (el.getBoundingClientRect().right > n.getBoundingClientRect().right + 1) return true;
      }
    }
    return false;
  };
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const x = el.getBoundingClientRect();
    if (x.right > VW + 2 && !clipped(el) && getComputedStyle(el).position !== 'fixed') {
      out.push({
        tag: el.tagName, cls: String(el.className).slice(0, 100),
        l: Math.round(x.left), r: Math.round(x.right), w: Math.round(x.width),
        text: (el.innerText || el.getAttribute('aria-label') || '').slice(0, 40),
      });
    }
  }
  return { VW, scrollW: document.documentElement.scrollWidth, out: out.slice(0, 25) };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
