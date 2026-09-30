import { createRequire } from "module";
import fs from "node:fs";

const require = createRequire("/Users/dominiceasterling/Projects/cj-os/package.json");
const { chromium } = require("playwright");

const base = process.argv[2] || "https://driller-hub.vercel.app";
const jobUrl = fs.readFileSync("/tmp/cj-demo/url.txt", "utf8").trim().replace(/https?:\/\/[^/?]+/, base);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
const pg = await ctx.newPage();

const dump = async (tag) => {
  const items = await pg.evaluate(() => {
    const sel = "a[href], button, input, select, textarea, [role=button], [role=tab], [role=switch], [role=checkbox], [role=link], [role=combobox], [tabindex]";
    const out = [];
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" && !el.classList.contains("visually-hidden")) continue;
      out.push({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role"),
        type: el.type || null,
        text: (el.innerText || el.value || el.getAttribute("aria-label") || el.getAttribute("title") || "").replace(/\s+/g, " ").trim().slice(0, 80),
        aria: el.getAttribute("aria-label"),
        href: el.href ? new URL(el.href).pathname + new URL(el.href).search : null,
        cls: String(el.className).split(" ")[0],
        vis: r.width > 0 && r.height > 0 && cs.visibility !== "hidden",
      });
    }
    return out;
  });
  console.log(`\n===== ${tag} (${items.length} elements) =====`);
  items.forEach((it, i) => console.log(`${i}. <${it.tag}${it.role ? " role=" + it.role : ""}${it.type ? " type=" + it.type : ""}> "${it.text}"${it.aria ? ` aria="${it.aria}"` : ""}${it.href ? ` href=${it.href}` : ""} cls=${it.cls} vis=${it.vis}`));
};

await pg.goto(jobUrl, { waitUntil: "domcontentloaded" });
await pg.waitForSelector(".well-card", { timeout: 240000 });
await pg.waitForTimeout(20000); // let phase-2 land
await dump("HUB-JOB");

// open modal for its controls
await pg.locator("button.well-card").first().click();
await pg.waitForTimeout(1200);
await dump("HUB-MODAL");
await pg.keyboard.press("Escape");

await b.close();
