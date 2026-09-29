import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/Users/dominiceasterling/Projects/cj-os/package.json');
const { chromium, devices } = require('playwright');
const url = fs.readFileSync('/tmp/cj-demo/url.txt', 'utf8').trim().replace(/https?:\/\/[^/]+/, 'http://localhost:3006');
const b = await chromium.launch();
const p = await (await b.newContext({ ...devices['iPhone SE'] })).newPage();
await p.goto(url, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
const early = await p.evaluate(() => ({
  meta: document.querySelector('meta[name=viewport]')?.content,
  innerW: innerWidth, clientW: document.documentElement.clientWidth,
  scrollW: document.documentElement.scrollWidth,
  vv: window.visualViewport && { w: visualViewport.width, s: visualViewport.scale },
}));
console.log('early:', JSON.stringify(early));
try { await p.waitForSelector('button.well-card', { timeout: 120000 }); } catch {}
await p.waitForTimeout(2500);
const late = await p.evaluate(() => ({
  innerW: innerWidth, clientW: document.documentElement.clientWidth,
  scrollW: document.documentElement.scrollWidth,
  vv: window.visualViewport && { w: visualViewport.width, s: visualViewport.scale },
  widestEls: [...document.querySelectorAll('body *')]
    .map(el => ({ el, r: el.getBoundingClientRect() }))
    .filter(x => x.r.width > 4 && x.r.right > innerWidth + 1 && x.r.left < innerWidth &&
                 getComputedStyle(x.el).position !== 'fixed')
    .map(x => ({ tag: x.el.tagName, cls: String(x.el.className).slice(0,80), l: Math.round(x.r.left), r: Math.round(x.r.right), chain: (() => { const c=[]; let n=x.el; while(n&&c.length<6){c.push((n.tagName+'.'+String(n.className).split(' ')[0]).slice(0,50)); n=n.parentElement;} return c.join(' < '); })() }))
    .slice(0, 10),
}));
console.log('late:', JSON.stringify(late, null, 1));
await b.close();
