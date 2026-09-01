/* Who gets in, and who gets told about it.
 *
 * The lock screen is gone: the link is meant to be followed. Two things have
 * to survive that. The assistant still has to be gated, because the relay it
 * talks to spends one person's Claude subscription. And the owner has to hear
 * that somebody came, without the page shipping their visitors' details
 * anywhere.
 */
import { chromium } from "playwright";
import { CHROME, CODE, testPage, tally, enterCode } from "./testkit.mjs";

const t = tally(), ok = t.ok;
const HTML = testPage();
let notify = { url: "" };
let relay = { url: "" };
const pings = [];

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });

async function open(seed) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.on("pageerror", (e) => { t.bad(); console.log("  FAIL page error: " + e.message); });
  // No web fonts in a test: a real network round trip for nothing, and the
  // first thing to hang on a restricted network.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route("https://rj45thompson.github.io/**", async (route) => {
    const u = new URL(route.request().url());
    const json = (b) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
    if (u.pathname.endsWith("relay.json")) return json(relay);
    if (u.pathname.endsWith("notify.json")) return json(notify);
    return route.fulfill({ status: 200, contentType: "text/html", body: HTML });
  });
  await page.route("https://hook.example/**", async (route) => {
    pings.push(JSON.parse(route.request().postData()));
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.route("https://desk.example/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json",
                          body: JSON.stringify({ text: "Lead with the ops work." }) });
  });
  if (seed) await seed(page);
  await page.goto("https://rj45thompson.github.io/starfighter/muster/index.html");
  return { ctx, page };
}

/* ---- the door is open ---- */
console.log("\nno code needed to read the page");
{
  const { ctx, page } = await open();
  ok("no lock screen in the document", (await page.$("#gate")) === null);
  ok("nothing is hidden behind a gated class",
     !(await page.evaluate(() => document.documentElement.className.includes("gated"))));
  ok("the app is visible straight away", await page.isVisible("#shell"));
  ok("the workspace rendered", (await page.textContent("#panel")).length > 40);
  await ctx.close();
}

/* ---- the owner hears about it ---- */
console.log("\nthe owner is told");
{
  notify = { url: "https://hook.example/inbox" };
  pings.length = 0;
  const { ctx, page } = await open();
  await page.waitForFunction(() => sessionStorage.getItem("muster:pinged:visit"));
  await page.waitForTimeout(300);
  ok("a visit is reported once", pings.filter((p) => p.event === "visit").length === 1,
     pings.map((p) => p.event));
  const v = pings.find((p) => p.event === "visit");
  ok("it carries a subject a mail rule can use", /opened Muster/.test(v.subject), v.subject);
  ok("and when", !Number.isNaN(Date.parse(v.at)), v.at);
  ok("and where the link was followed from", "from" in v);

  // Something a visitor typed must never travel with it.
  await page.evaluate(() => {
    localStorage.setItem("muster:profile", JSON.stringify({ firstName: "RJ", email: "rj@example.com" }));
  });
  const body = JSON.stringify(pings);
  ok("no profile in the ping", !/rj@example\.com/.test(body));
  ok("no chat text in the ping", !/lead with/i.test(body));
  ok("the fields are only the four", Object.keys(v).sort().join(",") === "at,event,from,page,subject",
     Object.keys(v));

  // A reload in the same tab is the same visit, not a second one.
  await page.reload();
  await page.waitForTimeout(400);
  ok("a reload does not report again", pings.filter((p) => p.event === "visit").length === 1,
     pings.length);
  await ctx.close();
}

console.log("\nusing the assistant is reported separately");
{
  notify = { url: "https://hook.example/inbox" };
  relay = { url: "https://desk.example/bridge/chat" };
  pings.length = 0;
  const { ctx, page } = await open(enterCode);
  await page.waitForFunction(() => document.querySelector("#statusText").textContent === "ready");
  ok("no chat ping before anyone chats", pings.every((p) => p.event !== "chat"));
  await page.fill("#input", "What should I lead with?");
  await page.click("#send");
  await page.waitForFunction(() => /Lead with the ops work/.test(document.querySelector("#log").textContent));
  await page.waitForTimeout(300);
  ok("the first message is reported", pings.filter((p) => p.event === "chat").length === 1,
     pings.map((p) => p.event));
  ok("the question itself is not", !/lead with/i.test(JSON.stringify(pings.filter(p => p.event === "chat"))));
  await page.fill("#input", "And second?");
  await page.click("#send");
  await page.waitForTimeout(600);
  ok("a second message is not a second report", pings.filter((p) => p.event === "chat").length === 1);
  await ctx.close();
}

console.log("\nwith nowhere to report to");
{
  notify = { url: "" };
  relay = { url: "" };
  pings.length = 0;
  const { ctx, page } = await open();
  await page.waitForTimeout(500);
  ok("nothing is sent", pings.length === 0, pings);
  ok("and the page is fine", await page.isVisible("#shell"));
  await ctx.close();
}

console.log("\nan http endpoint is refused");
{
  notify = { url: "http://hook.example/inbox" };   // not https
  pings.length = 0;
  const { ctx, page } = await open();
  await page.waitForTimeout(500);
  ok("a plaintext endpoint gets nothing", pings.length === 0, pings);
  await ctx.close();
}

/* ---- the code arrives in the link, not in a settings field ---- */
console.log("\nthe code comes with the link");
{
  notify = { url: "" };
  relay = { url: "" };
  const base = "https://rj45thompson.github.io/starfighter/muster/index.html";
  const desk = "https://desk.example/bridge/chat";
  const { ctx, page } = await open();
  const asks = [];
  await page.unroute("https://desk.example/**");
  await page.route("https://desk.example/**", async (route) => {
    asks.push(JSON.parse(route.request().postData()));
    await route.fulfill({ status: 200, contentType: "application/json",
                          body: JSON.stringify({ text: "Lead with the ops work." }) });
  });

  await page.goto(base + "#desk=" + encodeURIComponent(desk) + "&code=" + encodeURIComponent(CODE));
  await page.waitForFunction(() => document.querySelector("#statusText").textContent === "ready");
  ok("one link is the whole setup", true);
  ok("nothing is left in the address bar", !(await page.evaluate(() => location.hash)));

  await page.fill("#input", "What should I lead with?");
  await page.click("#send");
  await page.waitForFunction(() => /Lead with the ops work/.test(document.querySelector("#log").textContent));
  ok("the code went with the question", asks[0].code === CODE, asks[0].code);

  ok("and there is no settings tab to visit",
     (await page.$(".navbtn[data-id='assistant']")) === null);
  ok("nor anywhere to type a key", (await page.$("#aKey")) === null);
  await ctx.close();
}

console.log("\nthe code itself is not in the page");
{
  // It travels in the link and is kept per browser. It is never baked into the
  // file everyone downloads.
  const page = testPage();
  ok("no code is baked into the page", !page.includes("bellows-sequoia"));
  ok("and no verifier is left over either", !/const GATE =/.test(page));
}

await browser.close();
process.exit(t.done() ? 1 : 0);
