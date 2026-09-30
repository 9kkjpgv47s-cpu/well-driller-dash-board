import { createRequire } from "module";
import fs from "node:fs";

const require = createRequire("/Users/dominiceasterling/Projects/cj-os/package.json");
const { chromium, devices } = require("playwright");

const base = process.argv[2] || "https://driller-hub.vercel.app";
const mode = process.argv[3] || "desktop"; // desktop | phone
const jobUrl = fs.readFileSync("/tmp/cj-demo/url.txt", "utf8").trim().replace(/https?:\/\/[^/?]+/, base);

const b = await chromium.launch();
const ctx = await b.newContext({
  ...(mode === "phone" ? devices["iPhone 14 Pro"] : { viewport: { width: 1440, height: 900 } }),
  serviceWorkers: "block",
  ...(mode === "phone" ? { offline: false } : {}),
});
const pg = await ctx.newPage();
if (mode === "phone") {
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 400 * 1024, uploadThroughput: 200 * 1024 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}
const t0 = Date.now();
await pg.goto(jobUrl, { waitUntil: "domcontentloaded" });
let last = "";
let tCard = null, tLabel = null, tMarkers = null, tLit = null;
for (let i = 0; i < 90; i++) {
  const s = await pg.evaluate(() => {
    const t = document.body.innerText;
    const i = t.indexOf("Lithology intervals");
    return {
      card0: document.querySelector(".well-card")?.innerText?.replace(/\n/g, " ") || "",
      cards: document.querySelectorAll(".well-card").length,
      markers: document.querySelectorAll(".leaflet-marker-icon").length,
      lit: i >= 0 ? t.slice(i, i + 40).replace(/\n/g, "|") : "",
    };
  });
  const el = ((Date.now() - t0) / 1000).toFixed(1);
  if (!tCard && s.cards > 0) { tCard = el; console.log(`t+${el}s first cards (${s.cards}) card0="${s.card0.slice(0, 60)}"`); }
  if (!tLabel && /G1 8|S1 5/.test(s.card0)) { tLabel = el; console.log(`t+${el}s LITHO LABELS card0="${s.card0.slice(0, 60)}"`); }
  if (!tMarkers && s.markers > 10) { tMarkers = el; console.log(`t+${el}s markers=${s.markers}`); }
  if (!tLit && /1125 \/ 1125/.test(s.lit)) { tLit = el; console.log(`t+${el}s lit="${s.lit}"`); }
  if (s.card0 !== last) { last = s.card0; }
  if (tLabel && tMarkers && tLit) break;
  await pg.waitForTimeout(2000);
}
console.log(`RESULT ${mode}: card=${tCard}s label=${tLabel}s markers=${tMarkers}s lit1125=${tLit}s`);
await b.close();
