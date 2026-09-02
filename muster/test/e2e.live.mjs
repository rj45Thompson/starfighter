/* The whole chain, nothing stubbed on the desk side.
 *
 * The real index.html, in a real browser, on the real hosted origin, with a
 * dead address remembered from an old link - talking to the real server.py
 * over a real socket on 127.0.0.1. This is the screenshot, reproduced and
 * then fixed, rather than argued about.
 *
 * Not part of the suite: it needs a desk running and it spends real tokens.
 *   python3 /tmp/deskrun/run_desk.py &   node test/e2e.live.mjs
 */
import { chromium } from "playwright";
import { CHROME, testPage, tally } from "./testkit.mjs";

const t = tally(), ok = t.ok;
const HTML = testPage();
const DEAD = "https://gone.trycloudflare.example/bridge/chat";

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--no-sandbox", "--disable-background-networking", "--no-first-run",
         "--disable-component-update", "--disable-sync", "--no-default-browser-check",
         "--no-proxy-server"]
});
const ctx = await browser.newContext();
// Chrome 138+ holds a public page's request to 127.0.0.1 until somebody says
// it may. There is nobody here to click Allow, so the answer is given up front
// - which is precisely the permission a real user grants once, by hand.
try { await ctx.grantPermissions(["local-network-access"],
                                 { origin: "https://rj45thompson.github.io" }); }
catch (e) { console.log("  (could not grant local-network-access: " + e.message.split("\n")[0] + ")"); }
const page = await ctx.newPage();
page.on("pageerror", e => { t.bad(); console.log("  FAIL page error: " + e.message); });

await page.route("https://rj45thompson.github.io/**", (route) => {
  const u = new URL(route.request().url());
  if (/relay\.json|notify\.json/.test(u.pathname))
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"url":""}' });
  return route.fulfill({ status: 200, contentType: "text/html", body: HTML });
});
// The hostname the old link named, now somebody else's. 401, as on the screenshot.
await page.route("https://gone.trycloudflare.example/**", (route) =>
  route.fulfill({ status: 401, contentType: "application/json",
                  body: JSON.stringify({ error: "Unauthorized" }) }));

await page.addInitScript((u) => {
  localStorage.setItem("muster:relay", JSON.stringify(u));
  localStorage.setItem("muster:code", JSON.stringify("open-sesame"));
}, DEAD);

await page.goto("https://rj45thompson.github.io/starfighter/muster/index.html");
await page.waitForFunction(
  () => document.querySelector("#statusText").textContent !== "connecting…",
  null, { timeout: 20000 });

console.log("\nthe browser reaching a real desk over a real socket");
const chosen = await page.evaluate(() => relayUrl());
ok("it reached 127.0.0.1 and believed it", /127\.0\.0\.1:8770/.test(chosen), chosen);
ok("it dropped the address that had gone", chosen !== DEAD, chosen);
ok("it says ready", (await page.textContent("#statusText")) === "ready",
   await page.textContent("#statusText"));

console.log("\nand answers off the subscription, with no key anywhere");
// Read the assistant's own bubble, not the whole log. The log also holds the
// question, so anything quoted back in the prompt would pass without the desk
// ever answering - which is exactly how an earlier version of this test lied.
const answer = () => page.evaluate(() => {
  const b = [...document.querySelectorAll("#log .msg:not(.me):not(.err):not(.think)")].pop();
  return b ? b.querySelector(".body").textContent : "";
});
await page.fill("#input", "Answer with one word only: pumpernickel");
await page.click("#send");
await page.waitForFunction(() => {
  const b = [...document.querySelectorAll("#log .msg:not(.me):not(.think)")].pop();
  return b && /pumpernickel|Problem/i.test(b.textContent);
}, null, { timeout: 120000 }).catch(() => {});
const said = await answer();
ok("the desk itself answered", /pumpernickel/i.test(said), said.slice(0, 200));
const log = await page.textContent("#log");
ok("no 'Unauthorized' on screen", !/Unauthorized/i.test(log), log.slice(-250));

await browser.close();
process.exit(t.done() ? 1 : 0);
