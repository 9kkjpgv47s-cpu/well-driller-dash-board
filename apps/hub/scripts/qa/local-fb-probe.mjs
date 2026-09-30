import { createRequire } from "module";
import fs from "node:fs";

const require = createRequire("/Users/dominiceasterling/Projects/cj-os/package.json");
const { chromium } = require("playwright");

const base = process.argv[2] || "http://localhost:3001";
const jobUrl = fs.readFileSync("/tmp/cj-demo/url.txt", "utf8").trim().replace(/https?:\/\/[^/?]+/, base);
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
await pg.route(/\/api\/wells-nearby/, (r) =>
  r.fulfill({ status: 503, contentType: "application/json", body: '{"error":"forced fallback"}' }));
await pg.route(/\/api\/area-insights/, (r) =>
  r.fulfill({ status: 503, contentType: "application/json", body: '{"error":"forced fallback"}' }));
await pg.goto(jobUrl, { waitUntil: "domcontentloaded" });
try { await pg.waitForSelector(".well-card", { timeout: 240000 }); } catch { console.log("no cards"); }
for (let i = 0; i < 8; i++) {
  await pg.waitForTimeout(4000);
  const m = await pg.evaluate(() => {
    const t = document.body.innerText;
    const i = t.indexOf("Lithology intervals");
    return {
      card0: document.querySelector(".well-card")?.innerText?.replace(/\n/g, " ").slice(0, 80),
      lit: i >= 0 ? t.slice(i, i + 30).replace(/\n/g, "|") : "?",
    };
  });
  console.log(`t+${(i + 1) * 4}s`, JSON.stringify(m));
}
await b.close();
