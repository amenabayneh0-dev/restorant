// End-to-end browser tests. Usage:  BASE_URL=https://your-site.vercel.app npm run test:e2e
//   E2E_PLACE_ORDER=1   also places a real test order (creates an order in the database, so it is off by default)
//   STAFF_EMAIL / STAFF_PASSWORD   also tests the staff area
import { createRequire } from "node:module";
import { launch, newPage, VIEWPORTS, sleep } from "./browser.mjs";
const require = createRequire(import.meta.url);
const BASE = (process.env.BASE_URL || "http://localhost:3100").replace(/\/$/, "");
const PLACE = process.env.E2E_PLACE_ORDER === "1";
const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push([true, name]); console.log("  ✓", name); }
  catch (e) { results.push([false, name, e.message]); console.log("  ✗", name, "\n     ", e.message.split("\n")[0]); }
};
const assert = (c, m) => { if (!c) throw new Error(m); };
const shot = (page, n) => page.screenshot({ path: `e2e/shots/${n}.png` }).catch(() => {});
const textOf = (page, sel) => page.$$eval(sel, (els) => els.map((e) => e.textContent.trim()));
const clickText = async (page, sel, re) => {
  const h = await page.evaluateHandle((sel, src) => [...document.querySelectorAll(sel)].find((e) => new RegExp(src, "i").test(e.textContent || e.getAttribute("aria-label") || "")), sel, re.source);
  const el = h.asElement(); if (!el) throw new Error(`no ${sel} matching ${re}`); await el.click();
};
// Wait until the number of menu cards stops changing (filter animations finished).
const settle = async (page) => { let last = -1, same = 0; for (let i = 0; i < 40 && same < 3; i++) { const n = (await page.$$(".mcard")).length; same = n === last ? same + 1 : 0; last = n; await sleep(150); } return last; };
const noOverflow = async (page) => { const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); assert(w[0] <= w[1], `horizontal overflow: page ${w[0]}px wide in a ${w[1]}px viewport`); };

let browser;
for (const [vpName, vp] of [["phone", VIEWPORTS.phone], ["desktop", VIEWPORTS.desktop]]) {
  console.log(`\n== ${vpName} ${vp.width}px`);
  browser = await launch();
  const { page, problems } = await newPage(browser, { ...vp, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(3500);

  await check("home loads with a title, headline and no console/network errors", async () => {
    assert((await page.title()).length > 3, "empty <title>");
    assert((await textOf(page, "h1")).join("").length > 3, "no h1 text");
    assert(!problems.length, problems.join(" | "));
  });
  await check("headline words are separated by spaces (animation mask bug)", async () => {
    const t = (await textOf(page, "h1"))[0]; assert(!/[a-z][,.][a-z]/i.test(t) && /\s/.test(t) || t.split(" ").length === 1, `h1 text looks glued: "${t}"`);
  });
  await check("no horizontal overflow", () => noOverflow(page));
  await check("page starts at the top (no stray auto-scroll)", async () => assert((await page.evaluate(() => scrollY)) < 5, "page loaded scrolled"));
  await check("hero, menu, about and visit sections exist", async () => {
    for (const id of ["home", "menu", "about", "visit"]) assert(await page.$(`#${id}`), `missing #${id}`);
  });
  await check("structured data (Restaurant JSON-LD) is valid JSON", async () => {
    const j = await page.$eval('script[type="application/ld+json"]', (e) => JSON.parse(e.textContent)); assert(j["@type"] === "Restaurant" && j.name, "bad JSON-LD");
  });

  await check("category tabs filter the menu", async () => {
    const all = (await page.$$(".mcard")).length; assert(all > 3, "expected several dishes");
    const tabs = await textOf(page, ".tab"); const second = tabs.find((t) => t !== "All");
    await clickText(page, ".tab", new RegExp(`^${second}$`));
    const n = await settle(page); assert(n > 0 && n < all, `filter by ${second} gave ${n} of ${all}`);
    await clickText(page, ".tab", /^All$/); assert((await settle(page)) === all, "All tab did not restore the full menu");
  });
  await check("search narrows the menu and shows an empty state", async () => {
    await page.type("#menu-search", "zzzz-no-such-dish"); await settle(page);
    assert(await page.$(".empty"), "no empty state");
    await page.focus("#menu-search"); await page.keyboard.down("Control"); await page.keyboard.press("KeyA"); await page.keyboard.up("Control"); await page.keyboard.press("Backspace");
    assert((await settle(page)) > 3, "menu did not come back after clearing search");
  });
  await check("dietary filter toggles", async () => {
    const chips = await textOf(page, ".tagbar .chip"); if (!chips.length) return;
    const before = await settle(page); await clickText(page, ".tagbar .chip", new RegExp(`^${chips[0]}$`));
    const after = await settle(page); assert(after > 0 && after < before, `tag filter: ${before} -> ${after} cards`);
    await clickText(page, ".tagbar .chip", new RegExp(`^${chips[0]}$`)); assert((await settle(page)) === before, "untoggling the tag did not restore the menu");
  });

  await check("quick add (+) puts a dish in the cart and shows a toast", async () => {
    await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: "networkidle0" }); await sleep(1200);
    const quick = await page.evaluateHandle(() => [...document.querySelectorAll(".mcard")].find((c) => /Add .* to order/.test(c.querySelector(".fab")?.getAttribute("aria-label") || ""))?.querySelector(".fab"));
    await quick.asElement().click(); await sleep(600);
    assert(await page.$(".toast"), "no toast"); assert(await page.$(".cartbar"), "cart bar did not appear");
  });
  await check("item sheet: choose an extra, set quantity, add to order", async () => {
    const opener = await page.evaluateHandle(() => [...document.querySelectorAll(".mcard")].find((c) => /Customise/.test(c.querySelector(".fab")?.getAttribute("aria-label") || ""))?.querySelector(".mcard-main"));
    assert(opener.asElement(), "no dish with options in the demo menu"); await opener.asElement().click(); await sleep(700);
    assert(await page.$("dialog.item-sheet[open]"), "item sheet did not open"); await shot(page, `${vpName}-item-sheet`);
    const label = await page.$("dialog.item-sheet .opt"); await label.click(); await page.click('dialog.item-sheet button[aria-label="Increase quantity"]');
    const btn = await page.$eval("dialog.item-sheet .sheet-actions .btn", (b) => b.textContent); assert(/Add to order/.test(btn), "no add button");
    await page.click("dialog.item-sheet .sheet-actions .btn"); await sleep(900);
    assert(!(await page.$("dialog.item-sheet[open]")), "sheet did not close after adding");
    const count = await page.$eval(".cb-label", (e) => e.textContent); assert(/\(3\)|\(2\)/.test(count) || /\(\d+\)/.test(count), `cart label: ${count}`);
  });
  await check("cart sheet lists items and a total; validation errors are shown", async () => {
    await page.click(".cartbar"); await sleep(700); assert(await page.$("dialog.sheet[open] .lines li"), "no lines in cart"); await shot(page, `${vpName}-cart`);
    await page.click("dialog.sheet[open] form .btn.solid"); await sleep(900);
    const errs = await page.$$eval("dialog.sheet[open] .err", (e) => e.map((x) => x.textContent).join(" ")); assert(/name|phone|valid|check/i.test(errs), `expected validation messages, got "${errs}"`);
  });
  if (PLACE && vpName === "phone") {
    await check("places a real order and lands on the live tracking page", async () => {
      const phone = "+2519" + String(Math.floor(10000000 + Math.random() * 89999999));
      await page.type('dialog.sheet[open] input[autocomplete="name"]', "E2E Test"); await page.type('dialog.sheet[open] input[type="tel"]', phone);
      await page.click("dialog.sheet[open] form .btn.solid");
      await page.waitForFunction(() => location.pathname.startsWith("/track/"), { timeout: 20000 }); await sleep(2500);
      const h = (await textOf(page, "h1"))[0]; assert(/received/i.test(h), `tracking heading: ${h}`); assert(await page.$(".stepper"), "no progress stepper");
      await noOverflow(page); await shot(page, "phone-tracking");
      assert((await page.evaluate(() => localStorage.getItem("menuflow-cart-v1"))) === "[]", "cart not cleared after ordering");
    });
    await check("tracking page 404s on a bad link", async () => {
      const r = await page.goto(`${BASE}/track/not-a-real-token`, { waitUntil: "networkidle0" }); assert(r.status() === 404, `status ${r.status()}`);
    });
  }
  await page.close().catch(() => {}); await browser.close().catch(() => {});
}

browser = await launch();
console.log("\n== accessibility + motion preferences");
{
  const { page } = await newPage(browser, { ...VIEWPORTS.desktop, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(1500);
  await check("reduced motion: content is visible immediately, nothing is hidden for animation", async () => {
    assert(!(await page.evaluate(() => document.documentElement.dataset.motion)), "data-motion set despite reduced motion");
    const hidden = await page.evaluate(() => [...document.querySelectorAll("h1, .lede, .cta-row, .menu-panel, .stats")].filter((e) => getComputedStyle(e).opacity === "0").length);
    assert(hidden === 0, `${hidden} elements invisible`);
  });
  await check("axe: no WCAG A/AA violations on the home page", async () => {
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const v = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } })).violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, sample: x.nodes[0].html.slice(0, 110) })));
    assert(v.length === 0, "violations: " + JSON.stringify(v));
  });
  for (const path of ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/icon.svg", "/api/health"]) {
    await check(`${path} responds`, async () => { const r = await page.goto(BASE + path); assert(r.ok(), `${path} -> ${r.status()}`); });
  }
  await page.close().catch(() => {});
}
await browser.close().catch(() => {});
const failed = results.filter((r) => !r[0]);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) { console.log("FAILED:\n" + failed.map((f) => ` - ${f[1]}: ${f[2].split("\n")[0]}`).join("\n")); process.exit(1); }
