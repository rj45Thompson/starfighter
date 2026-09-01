/* The public page finding the desk on its own: no address to carry, no reload. */
import { chromium } from "playwright";
import { CHROME, CODE, testPage, tally, enterCode } from "./testkit.mjs";

const t = tally(), ok = t.ok;
const HTML = testPage();
let relay = { url: "" };          // what the site is serving right now
const asks = [];

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.on("pageerror", e => { t.bad(); console.log("  FAIL page error: " + e.message); });

// Serve the page from the real hosted hostname, so the code that keys off it
// is the code under test rather than a stand-in.
await page.route("https://rj45thompson.github.io/**", async (route) => {
  const u = new URL(route.request().url());
  if (u.pathname.endsWith("relay.json"))
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(relay) });
  if (u.pathname.endsWith("notify.json"))
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"url":""}' });
  return route.fulfill({ status: 200, contentType: "text/html", body: HTML });
});
await page.route("https://desk.example/**", async (route) => {
  asks.push(JSON.parse(route.request().postData()));
  await route.fulfill({ status: 200, contentType: "application/json",
                        body: JSON.stringify({ text: "Lead with the ops work." }) });
});

// The page no longer asks for a code to open; the relay still asks for one to
// answer, so a visitor who has been given one has it in storage.
await enterCode(page);
await page.goto("https://rj45thompson.github.io/starfighter/muster/index.html");

console.log("\nthe desk is not up");
await page.waitForFunction(() => document.querySelector("#statusText").textContent !== "connecting…");
ok("it says so plainly", (await page.textContent("#statusText")) === "waiting for the desk",
   await page.textContent("#statusText"));
ok("it does not offer to send you to itself",
   !/Open chat/.test(await page.textContent("#send")), await page.textContent("#send"));
ok("the composer is off", !(await page.isEnabled("#input")));
ok("it says the page will connect itself", /connects by itself/.test(await page.textContent("#log")));
ok("it is watching", await page.evaluate(() => watching !== null));

console.log("\nthe desk comes up");
relay = { url: "https://desk.example/bridge/chat" };
await page.evaluate(() => recheck());
ok("the page went live with no reload",
   (await page.textContent("#statusText")) === "assistant ready", await page.textContent("#statusText"));
ok("the composer opened", await page.isEnabled("#input"));
ok("it said so", /Connected/.test(await page.textContent("#log")));

await page.fill("#input", "What should I lead with?");
await page.click("#send");
await page.waitForFunction(() => /Lead with the ops work/.test(document.querySelector("#log").textContent));
ok("it answers through the desk", asks.length === 1);
ok("the access code travels with the question", asks[0].code === CODE, asks[0].code);
ok("no system prompt is handed to the desk", !("system" in asks[0]));

console.log("\nthe desk moves");
relay = { url: "https://desk.example/moved/chat" };
await page.evaluate(() => recheck());
await page.fill("#input", "Still there?");
await page.click("#send");
await page.waitForFunction(() => window.__n === undefined || true);
await page.waitForTimeout(600);
ok("the next question goes to the new address", asks.length === 2);

console.log("\nthe desk goes down");
relay = { url: "" };
await page.evaluate(() => recheck());
ok("back to waiting", (await page.textContent("#statusText")) === "waiting for the desk",
   await page.textContent("#statusText"));
ok("still watching", await page.evaluate(() => watching !== null));

await browser.close();
process.exit(t.done() ? 1 : 0);
