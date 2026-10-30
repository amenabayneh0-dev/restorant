// Takes a series of viewport screenshots down the home page (desktop + phone). Usage: BASE_URL=... node e2e/shots.mjs
import { launch, newPage, VIEWPORTS, sleep } from "./browser.mjs";
const base = process.env.BASE_URL || "http://localhost:3100";
const only = process.argv[2];
const b = await launch();
for (const [name, vp] of Object.entries(VIEWPORTS)) {
  if (only && only !== name) continue;
  const { page, problems } = await newPage(b, { ...vp, deviceScaleFactor: 1 });
  await page.goto(base, { waitUntil: "networkidle0" }); await sleep(3800);
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  console.log(name, "initial scrollY =", await page.evaluate(() => scrollY), "| width", w.sw, "vs viewport", w.iw, w.sw > w.iw ? "<-- HORIZONTAL OVERFLOW" : "ok", "| problems:", problems.length ? problems : "none");
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = vp.height - 80; let i = 0;
  for (let y = 0; y < total && i < 8; y += step, i++) {
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" }), y); await sleep(1300);
    await page.screenshot({ path: `e2e/shots/${name}-${i}.png` });
  }
  console.log(name, "page height", total, "screens", i);
  await page.close().catch(() => {});
}
await b.close().catch(() => {});
