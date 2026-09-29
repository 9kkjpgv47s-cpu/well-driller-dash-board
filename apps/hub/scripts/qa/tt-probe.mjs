import { createRequire } from 'module';
const require = createRequire('/Users/dominiceasterling/Projects/cj-os/package.json');
const { chromium } = require('playwright');
for (const url of ['http://localhost:3006/well-viewer/index.html?lat=39.763&lon=-86.399', 'http://localhost:8791/?lat=39.763&lon=-86.399']) {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  const info = await p.evaluate(() => {
    const btn = document.querySelector('button.theme-toggle');
    if (!btn) return { found: false };
    const r = btn.getBoundingClientRect();
    const cs = getComputedStyle(btn);
    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const chain = (e) => { const c = []; let n = e; while (n && c.length < 5) { c.push(n.tagName + '.' + String(n.className).split(' ')[0]); n = n.parentElement; } return c.join(' < '); };
    return { found: true, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, display: cs.display, vis: cs.visibility, pe: cs.pointerEvents, opacity: cs.opacity, hit: at ? chain(at) : null, hitIsBtn: at === btn || btn.contains(at) };
  });
  console.log(url, JSON.stringify(info));
  await b.close();
}
