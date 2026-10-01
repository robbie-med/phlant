// Captures docs/screenshots/*.png from a running build (default http://127.0.0.1:3510).
// Uses Playwright's Chromium; pass PLAYWRIGHT_PATH if playwright is installed elsewhere.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pw = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.env.PHLANT_URL || 'http://127.0.0.1:3510';
mkdirSync('docs/screenshots', { recursive: true });

const demoSite = {
  id: 'demo', name: 'Tulsa, OK', lat: 36.0975, lon: -95.9733, tz: 'America/Chicago', elevationM: 220,
  lastFrost: '04-19', firstFrost: '11-01', soil: 'clay', soilPh: 6.5, climateId: 'humid_subtropical', windDeg: 180, shadeSide: 'none',
  widthM: 30.5, depthM: 9.1, units: 'ft', rotationDeg: 0, slope: 'flat', slopeFacing: 'S',
  features: [{ id: 'f_house', kind: 'house', x: 10, y: 11, w: 10, h: 8, heightM: 6, label: 'House' }, { id: 'f_tree', kind: 'tree', x: -6, y: -1, w: 5, h: 5, heightM: 7, label: 'Oak' }, { id: 'f_fence', kind: 'fence', x: 0, y: -0.5, w: 30.5, h: 0.2, heightM: 1.8, label: 'Fence' }],
  beds: [
    { id: 'b1', x: 1, y: 1, w: 3, h: 3, label: 'Three Sisters', plants: ['corn', 'bean_bush', 'winter_squash'], heightCm: 20 },
    { id: 'b2', x: 5, y: 1, w: 4, h: 1.2, label: '배추·무', plants: ['napa', 'daikon'], heightCm: 15 },
    { id: 'b3', x: 5, y: 2.8, w: 4, h: 1.2, label: '쪽파·마늘', plants: ['scallion', 'garlic'], heightCm: 15 },
    { id: 'b4', x: 10, y: 1, w: 2.4, h: 1.2, label: 'Tomate–basilic', plants: ['tomato', 'basil', 'marigold'], heightCm: 15 },
    { id: 'b5', x: 13, y: 1, w: 2.4, h: 1.2, label: 'Poireau–carotte', plants: ['carrot', 'leek'], heightCm: 15 },
    { id: 'b6', x: 16, y: 1, w: 6, h: 2.4, label: 'Squash patch', plants: ['pumpkin', 'zucchini', 'nasturtium'], heightCm: 10 },
    { id: 'b7', x: 23, y: 1, w: 6, h: 1.2, label: 'Salad', plants: ['lettuce', 'radish', 'spinach', 'dill'], heightCm: 15 }
  ]
};
const settings = { version: 1, siteId: 'demo', sites: [demoSite], enabled: ['korean', 'chinese_north', 'biodynamic', 'french', 'english', 'russian', 'almanac'], mode: 'beginner', tab: 'today', theme: 'dark', onboarded: true, selectedDate: '2026-10-01' };

const browser = await pw.chromium.launch();
const shots = [
  ['today', 'today', 1280, 900, 'dark'], ['today-light', 'today', 1280, 900, 'light'], ['calendar', 'calendar', 1280, 900, 'dark'], ['sky', 'sky', 1280, 1400, 'dark'],
  ['plants', 'plants', 1280, 900, 'dark'], ['garden', 'garden', 1280, 1000, 'dark'], ['tools', 'tools', 1280, 900, 'dark'], ['site', 'site', 1280, 1100, 'dark'], ['today-mobile', 'today', 390, 844, 'dark']
];
for (const [name, tab, w, h, theme] of shots) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1.5, colorScheme: theme, isMobile: w < 500 });
  await ctx.addInitScript(s => { localStorage.setItem('phlant:settings', JSON.stringify(s)); }, { ...settings, tab, theme });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(tab === 'site' ? 6000 : 2500);
  await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: false });
  console.log('shot', name);
  await ctx.close();
}
// 3D garden
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5, colorScheme: 'dark' });
  await ctx.addInitScript(s => { localStorage.setItem('phlant:settings', JSON.stringify(s)); }, { ...settings, tab: 'garden' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.getByRole('tab', { name: '3D' }).click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'docs/screenshots/garden-3d.png' });
  console.log('shot garden-3d');
  await ctx.close();
}
await browser.close();
