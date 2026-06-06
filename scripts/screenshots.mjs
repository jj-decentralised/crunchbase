import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "/opt/cursor/artifacts/screenshots";
mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";

const shots = [
  { name: "01-overview-dark", path: "/", theme: "dark" },
  { name: "02-flows-stream-dark", path: "/flows", theme: "dark" },
  { name: "03-categories-dark", path: "/categories", theme: "dark" },
  {
    name: "04-category-detail-ai-dark",
    path: "/categories/artificial-intelligence?grain=year",
    theme: "dark",
  },
  {
    name: "05-compare-dark",
    path: "/compare?groups=artificial-intelligence,fintech,health-biotech,climate-energy,crypto-web3&grain=year",
    theme: "dark",
  },
  { name: "06-deals-dark", path: "/deals", theme: "dark" },
  { name: "07-settings-dark", path: "/settings", theme: "dark" },
  { name: "08-overview-light", path: "/", theme: "light" },
  { name: "09-flows-light", path: "/flows", theme: "light" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1480, height: 1000 },
  deviceScaleFactor: 1.5,
});

// Pre-seed theme + reduce motion before any page script runs.
await ctx.addInitScript(() => {
  try {
    const t = window.localStorage.getItem("__forceTheme");
    if (t) window.localStorage.setItem("theme", t);
  } catch {}
});

const page = await ctx.newPage();

for (const shot of shots) {
  await page.addInitScript((theme) => {
    window.localStorage.setItem("theme", theme);
    window.localStorage.setItem("__forceTheme", theme);
  }, shot.theme);

  await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle" });

  // Wait for charts (if any) to mount.
  await page
    .waitForSelector(".recharts-surface, table, .skeleton", { timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(1400);

  await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: false });
  console.log(`captured ${shot.name}`);
}

// Command palette overlay on the overview.
await page.addInitScript((theme) => {
  window.localStorage.setItem("theme", theme);
}, "dark");
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.evaluate(() => window.dispatchEvent(new Event("cf:open-palette")));
await page.waitForTimeout(500);
await page.keyboard.type("AI");
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/10-command-palette-dark.png`, fullPage: false });
console.log("captured 10-command-palette-dark");

await browser.close();
console.log("done");
