// Shared helpers for the browser tests: launch headless Chrome (bundled via @sparticuz/chromium), collect console errors.
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
export async function launch() {
  return puppeteer.launch({ args: [...chromium.args, "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--font-render-hinting=none"], executablePath: await chromium.executablePath(), headless: "shell" });
}
export const VIEWPORTS = { desktop: { width: 1366, height: 900, deviceScaleFactor: 1 }, phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
export async function newPage(browser, vp) {
  const page = await browser.newPage(); await page.setViewport(vp);
  const problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource.*(404|401)/.test(m.text())) problems.push(`console: ${m.text()}`); });
  page.on("requestfailed", (r) => { if (!/_next\/static\/.*\.(map)|favicon/.test(r.url()) && r.failure()?.errorText !== "net::ERR_ABORTED") problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`); });
  return { page, problems };
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
