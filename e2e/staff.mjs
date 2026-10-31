// Staff-area browser tests (Phase 4). Usage: BASE_URL=http://localhost:3100 node e2e/staff.mjs
// Needs three staff logins (admin/counter/kitchen); defaults match the local test stack in dev/local-stack.
// Creates a few clearly named "E2E ..." rows (category, dish) and cleans up the dish at the end.
import { createRequire } from "node:module";
import fs from "node:fs";
import { launch, newPage, VIEWPORTS, sleep } from "./browser.mjs";
const require = createRequire(import.meta.url);
const BASE = (process.env.BASE_URL || "http://localhost:3100").replace(/\/$/, "");
const USERS = {
  admin: [process.env.ADMIN_EMAIL || "admin@x.test", process.env.ADMIN_PASSWORD || "adminpw"],
  counter: [process.env.COUNTER_EMAIL || "counter@x.test", process.env.COUNTER_PASSWORD || "counterpw"],
  kitchen: [process.env.KITCHEN_EMAIL || "kitchen@x.test", process.env.KITCHEN_PASSWORD || "kitchenpw"],
};
const results = [];
const check = async (name, fn) => { try { await fn(); results.push([true, name]); console.log("  ✓", name); } catch (e) { results.push([false, name, e.message]); console.log("  ✗", name, "\n     ", e.message.split("\n")[0]); } };
const assert = (c, m) => { if (!c) throw new Error(m); };
fs.mkdirSync("e2e/shots", { recursive: true });
const shot = (page, n) => page.screenshot({ path: `e2e/shots/${n}.png` }).catch(() => {});
const noOverflow = async (page, where) => { const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); assert(w[0] <= w[1], `${where}: horizontal overflow ${w[0]}px in ${w[1]}px viewport`); };
const axeCheck = async (page, where) => {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const v = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } })).violations.map((x) => ({ id: x.id, n: x.nodes.length, sample: x.nodes[0].html.slice(0, 120) })));
  assert(v.length === 0, `${where} axe: ${JSON.stringify(v)}`);
};
const texts = (page, sel) => page.$$eval(sel, (e) => e.map((x) => x.textContent.trim()));
const go = async (page, path) => { await page.goto(BASE + path, { waitUntil: "networkidle0" }); };
// Server-action redirects are client-side navigations, so wait for the network to go quiet instead of a page load.
const submit = async (page, btnSel) => { await page.click(btnSel); await sleep(300); await page.waitForNetworkIdle({ idleTime: 600, timeout: 20000 }); await sleep(150); };
async function login(page, who) {
  await go(page, "/staff/login");
  await page.type('input[name="email"]', USERS[who][0]); await page.type('input[name="password"]', USERS[who][1]);
  await submit(page, ".login .btn.solid");
}
const DISH = `E2E Dish ${Date.now().toString(36)}`;
const CAT = `E2E Desserts ${Date.now().toString(36)}`;

for (const [vpName, vp] of [["desktop", VIEWPORTS.desktop], ["phone", VIEWPORTS.phone]]) {
  console.log(`\n== admin on ${vpName} ${vp.width}px`);
  const browser = await launch();
  const { page, problems } = await newPage(browser, { ...vp, deviceScaleFactor: 1 });
  await login(page, "admin");

  await check("admin sees Orders, Menu, Settings and Report in the nav", async () => {
    const t = await texts(page, ".snav a"); assert(["Orders", "Menu", "Settings", "Report"].every((x) => t.includes(x)), `nav: ${t}`);
    await shot(page, `staff-orders-${vpName}`);
  });
  await check("order alerts bar offers to enable alerts", async () => { assert(await page.$(".alerts-bar .btn.solid"), "no Enable alerts button"); });

  if (vpName === "desktop") {
    // ---- categories & dishes
    await go(page, "/staff/menu");
    await check("menu editor lists existing categories and dishes", async () => { assert((await page.$$(".panelbox .mrow")).length > 3, "expected seeded dishes"); await shot(page, "staff-menu-desktop"); });
    await check("admin can add a category", async () => {
      await page.type('form.inline-form input[name="name"]', CAT); await submit(page, "form.inline-form .btn.solid");
      assert((await texts(page, ".panelbox h2")).some((t) => t.startsWith(CAT)), "new category not listed");
      assert(await page.$(".notice.good"), "no success banner");
    });
    await check("categories can be moved down and the order sticks", async () => {
      const before = (await texts(page, ".panelbox h2[id^=cat-]")).map((t) => t.replace(/Hidden$/, "").trim());
      const idx = before.findIndex((t) => t.startsWith(CAT)); assert(idx === before.length - 1, "new category should be last");
      await submit(page, `button[aria-label="Move ${CAT} up"]`);
      const after = (await texts(page, ".panelbox h2[id^=cat-]")).map((t) => t.trim());
      assert(after[after.length - 2].startsWith(CAT), `move up failed: ${after}`);
    });

    // ---- create a dish with a big photo (exercises client-side resize)
    await go(page, "/staff/menu/new");
    await check("layout forms render as real panels (regression: `.staff form{display:inline}` once collapsed them)", async () => {
      const d = await page.$eval("form.panelbox", (e) => [getComputedStyle(e).display, e.getBoundingClientRect().width]); assert(d[0] === "block" && d[1] > 300, `dish form is display:${d[0]}, ${d[1]}px wide`);
      await go(page, "/staff/menu"); const o = await page.evaluate(() => getComputedStyle(document.querySelector(".inline-form")).display); assert(o === "flex", `add-category form is display:${o}`); await go(page, "/staff/menu/new");
    });
    await check("an empty price is rejected with a clear message (not saved as free)", async () => {
      await page.type('input[name="name"]', "Should Not Save"); await page.evaluate((c) => { const s = document.querySelector('select[name="category_id"]'); s.value = [...s.options].find((o) => o.text === c)?.value; }, CAT);
      await page.evaluate(() => { document.querySelector('input[name="price"]').removeAttribute("required"); });
      await submit(page, "form.panelbox .btn.solid");
      assert((await page.$eval(".notice.bad", (e) => e.textContent)).match(/price/i), "no price error shown");
    });
    const big = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 3200; c.height = 2400; const x = c.getContext("2d");
      for (let i = 0; i < 400; i++) { x.fillStyle = `hsl(${i * 7 % 360} 70% ${30 + i % 40}%)`; x.fillRect((i * 97) % 3200, (i * 53) % 2400, 400, 300); } return c.toDataURL("image/jpeg", 0.95).split(",")[1]; });
    fs.writeFileSync("/tmp/e2e-big.jpg", Buffer.from(big, "base64"));
    await go(page, "/staff/menu/new");
    await check("admin creates a dish with tags, visibility and a large photo", async () => {
      await page.type('input[name="name"]', DISH); await page.type('textarea[name="description"]', "Made by the E2E test.");
      await page.evaluate((c) => { const s = document.querySelector('select[name="category_id"]'); s.value = [...s.options].find((o) => o.text === c).value; }, CAT);
      await page.type('input[name="price"]', "123,5");
      await page.click('input[name="tags"][value="vegan"]'); await page.click('input[name="tags"][value="spicy"]');
      const input = await page.$('input[type="file"][name="image"]'); await input.uploadFile("/tmp/e2e-big.jpg");
      await page.waitForFunction(() => /KB/.test(document.querySelector(".imgfield p[role=status]")?.textContent || ""), { timeout: 15000 });
      const info = await page.$eval(".imgfield p[role=status]", (e) => e.textContent); assert(/was \d+(\.\d)? MB|KB/.test(info), `resize info: ${info}`);
      await shot(page, "staff-item-form-desktop");
      await submit(page, "form.panelbox .btn.solid");
      assert(page.url().includes("/staff/menu/") && !page.url().endsWith("/new"), `not redirected to the editor: ${page.url()}`);
      assert(await page.$(".notice.good"), "no success banner");
    });
    const editUrl = page.url();
    await check("the saved photo was resized (<= 1600px) and is served publicly", async () => {
      const src = await page.$eval(".imgfield-prev", (e) => e.getAttribute("src")); assert(src, "no preview image");
      const dims = await page.evaluate((s) => new Promise((r, j) => { const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.onerror = () => j(new Error("image failed to load")); i.src = s; }), src);
      assert(Math.max(...dims) <= 1600, `stored image is ${dims.join("x")}`);
      const bytes = await page.evaluate(async (s) => (await (await fetch(s)).blob()).size, src); assert(bytes < fs.statSync("/tmp/e2e-big.jpg").size, "photo was not made smaller");
    });
    await check("options can be added and removed", async () => {
      await page.type('.optform input[name="group_name"]', "Size"); await page.type('.optform input[name="name"]', "Large"); await page.type('.optform input[name="extra_price"]', "20");
      await submit(page, ".optform .btn.solid");
      assert((await texts(page, "#opts ~ div .stock span, .panelbox .stock span")).some((t) => t.includes("Large")), "option not listed");
      await submit(page, 'button[aria-label="Remove Large from Size"]');
      assert(!(await texts(page, ".panelbox .stock span")).some((t) => t.includes("Large")), "option still listed");
    });
    await check("the new dish appears on the public menu with its labels", async () => {
      const pub = await browser.newPage(); await pub.goto(BASE, { waitUntil: "networkidle0" }); await sleep(2500);
      const names = await texts(pub, ".mcard h3, .mcard .mname, .mcard"); assert(names.some((t) => t.includes(DISH)), "dish not on the public site"); await pub.close();
    });
    await check("unticking 'Show on the website' hides it from customers; archiving moves it to Archived", async () => {
      await page.goto(editUrl, { waitUntil: "networkidle0" });
      await page.click('input[name="is_published"]'); await submit(page, "form.panelbox .btn.solid");
      const pub = await browser.newPage(); await pub.goto(BASE, { waitUntil: "networkidle0" }); await sleep(1500);
      assert(!(await texts(pub, ".mcard")).some((t) => t.includes(DISH)), "hidden dish still public"); await pub.close();
      await page.goto(editUrl, { waitUntil: "networkidle0" });
      await submit(page, 'form:has(input[name="archive"]) button');
    });
    await go(page, "/staff/menu");
    await check("archived dishes are listed under Archived and can be restored", async () => {
      const arch = await page.evaluate(() => [...document.querySelectorAll("details.panel .stock span")].map((e) => e.textContent));
      assert(arch.some((t) => t.includes(DISH)), `archived list: ${arch.join("|")}`);
      await page.evaluate(() => document.querySelector("details.panel").open = true);
      const btn = await page.evaluateHandle((d) => [...document.querySelectorAll("details.panel .stock")].find((e) => e.textContent.includes(d))?.querySelector("button"), DISH);
      await btn.asElement().click(); await sleep(300); await page.waitForNetworkIdle({ idleTime: 600, timeout: 20000 });
      assert((await texts(page, ".mname b")).includes(DISH), "dish not restored");
    });
    await check("axe: staff menu list and dish editor have no WCAG A/AA violations", async () => { await axeCheck(page, "menu list"); await go(page, "/staff/menu/new"); await axeCheck(page, "dish editor"); });

    // ---- settings
    await go(page, "/staff/settings");
    await check("settings: tagline, delivery and opening hours save and persist", async () => {
      await page.$eval('input[name="tagline"]', (e) => (e.value = "")); await page.type('input[name="tagline"]', "E2E tagline");
      await page.$eval('input[name="enabled_fulfillment"][value="delivery"]', (e) => { if (!e.checked) e.click(); });
      await page.$eval('input[name="delivery_fee"]', (e) => (e.value = "")); await page.type('input[name="delivery_fee"]', "45");
      await page.evaluate(() => { const c = document.querySelector('input[name="mon_closed"]'); if (c.checked) c.click(); document.querySelector('input[name="mon_open"]').value = "09:30"; document.querySelector('input[name="mon_close"]').value = "21:15"; });
      await shot(page, "staff-settings-desktop");
      await submit(page, "form .btn.solid.block");
      assert(await page.$(".notice.good"), "no success banner");
      assert((await page.$eval('input[name="tagline"]', (e) => e.value)) === "E2E tagline", "tagline not persisted");
      assert((await page.$eval('input[name="mon_open"]', (e) => e.value)) === "09:30", "hours not persisted");
      assert(await page.$eval('input[name="enabled_fulfillment"][value="delivery"]', (e) => e.checked), "delivery not persisted");
    });
    await check("settings: an invalid time zone is refused with a message", async () => {
      await page.$eval('input[name="timezone"]', (e) => (e.value = "Mars/Olympus")); await submit(page, "form .btn.solid.block");
      assert((await page.$eval(".notice.bad", (e) => e.textContent)).match(/time zone/i), "no time zone error");
    });
    await check("the public home page shows the saved tagline", async () => {
      const pub = await browser.newPage(); await pub.goto(BASE, { waitUntil: "networkidle0" }); await sleep(1500);
      assert((await pub.evaluate(() => document.body.innerText)).includes("E2E tagline"), "tagline missing on home"); await pub.close();
    });
    // restore settings
    await go(page, "/staff/settings");
    await page.$eval('input[name="tagline"]', (e) => (e.value = "")); await page.$eval('input[name="enabled_fulfillment"][value="delivery"]', (e) => { if (e.checked) e.click(); });
    await page.evaluate(() => { document.querySelector('input[name="mon_open"]').value = "11:00"; document.querySelector('input[name="mon_close"]').value = "22:00"; }); await submit(page, "form .btn.solid.block");
    await check("axe: settings has no WCAG A/AA violations", async () => { await go(page, "/staff/settings"); await axeCheck(page, "settings"); });
  }

  await go(page, "/staff/report");
  await check(`report renders KPIs, chart and table (${vpName})`, async () => {
    assert((await page.$$(".kpi")).length === 3, "expected 3 KPI cards"); assert((await page.$$(".bars li")).length === 7, "expected 7 day bars"); await shot(page, `staff-report-${vpName}`);
    await axeCheck(page, "report");
  });
  for (const p of ["/staff", "/staff/menu", "/staff/settings", "/staff/report", "/staff/menu/new"]) {
    await check(`no horizontal overflow on ${p} (${vpName})`, async () => { await go(page, p); await noOverflow(page, p); if (vpName === "phone") await shot(page, `staff${p.replace(/\//g, "-")}-phone`); });
  }
  await check(`no console or network errors across the staff pages (${vpName})`, async () => { assert(!problems.length, problems.slice(0, 3).join(" | ")); });
  await browser.close();
}

console.log("\n== role restrictions");
{
  const browser = await launch();
  for (const [who, allowed, blocked] of [["kitchen", ["Orders"], ["Menu", "Settings", "Report"]], ["counter", ["Orders", "Report"], ["Menu", "Settings"]]]) {
    const { page } = await newPage(browser, { ...VIEWPORTS.desktop, deviceScaleFactor: 1 });
    await login(page, who);
    await check(`${who}: nav shows only ${allowed.join(" + ")}`, async () => { const t = await texts(page, ".snav a"); assert(JSON.stringify(t) === JSON.stringify(allowed), `nav: ${t}`); });
    for (const p of ["/staff/menu", "/staff/menu/new", "/staff/settings"]) await check(`${who}: ${p} bounces back to orders`, async () => { await go(page, p); assert(new URL(page.url()).pathname === "/staff", `landed on ${page.url()}`); });
    if (who === "kitchen") await check("kitchen: sales report is off limits", async () => { await go(page, "/staff/report"); assert(new URL(page.url()).pathname === "/staff", `landed on ${page.url()}`); });
    if (who === "counter") await check("counter: sales report opens", async () => { await go(page, "/staff/report"); assert(await page.$(".kpis"), "no report"); });
    await page.close();
  }
  await browser.close();
  const fresh = await launch(); // a brand-new browser: no cookies from the logins above
  const { page } = await newPage(fresh, { ...VIEWPORTS.desktop, deviceScaleFactor: 1 });
  await check("signed-out visitors are sent to the login page from every staff URL", async () => {
    for (const p of ["/staff", "/staff/menu", "/staff/menu/new", "/staff/settings", "/staff/report"]) { await go(page, p); assert(new URL(page.url()).pathname === "/staff/login", `${p} -> ${page.url()}`); }
  });
  await fresh.close();
}

const failed = results.filter((r) => !r[0]);
console.log(`\n${results.length - failed.length}/${results.length} staff checks passed`);
if (failed.length) { console.log("FAILED:\n" + failed.map((f) => ` - ${f[1]}: ${f[2].split("\n")[0]}`).join("\n")); process.exit(1); }
