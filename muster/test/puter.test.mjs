/* The route for somebody who has neither a desk nor a Claude account.
 *
 * Puter serves the model and the visitor's own free account pays for it, so
 * there is still no key in the page, on the wire, or in the repository. It is
 * deliberately last: a desk is private, and this is a third party.
 *
 * The library is stubbed here. What is under test is the page's side of the
 * contract - that it picks the route only when the library is really there,
 * hands over the charter and the turns, consumes a stream, survives the
 * shapes a non-streaming answer can take, and says something useful when
 * somebody closes the sign-in window. */
import { chromium } from "playwright";
import { CHROME, testPage, tally, sealLocal } from "./testkit.mjs";

const t = tally(), ok = t.ok;
const HTML = testPage();

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });

async function open(stub) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await sealLocal(page);
  page.on("pageerror", e => { t.bad(); console.log("  FAIL page error: " + e.message); });
  await page.route("https://rj45thompson.github.io/**", (route) => {
    const u = new URL(route.request().url());
    if (/relay\.json|notify\.json/.test(u.pathname))
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"url":""}' });
    return route.fulfill({ status: 200, contentType: "text/html", body: HTML });
  });
  // The real library is never fetched in a test.
  await page.route("https://js.puter.com/**", (route) => route.abort());
  if (stub) await page.addInitScript(stub);
  await page.goto("https://rj45thompson.github.io/starfighter/muster/index.html");
  await page.waitForFunction(
    () => document.querySelector("#statusText").textContent !== "connecting…",
    null, { timeout: 20000 });
  return { ctx, page };
}

/* A stub that records what it was asked and streams an answer back. */
const streaming = () => {
  window.__asked = [];
  window.puter = { ai: { chat: async (turns, opts) => {
    window.__asked.push({ turns, opts });
    return { async *[Symbol.asyncIterator]() {
      yield { text: "Lead with " };
      yield { };                       // a part carrying nothing at all
      yield { text: "the ops work." };
    } };
  } } };
};

console.log("\nno desk, no Claude, but Puter is there");
{
  const { ctx, page } = await open(streaming);
  ok("it takes the Puter route", (await page.evaluate(() => route)) === "puter",
     await page.evaluate(() => route));
  ok("it says ready", (await page.textContent("#statusText")) === "ready",
     await page.textContent("#statusText"));
  ok("the composer is open", await page.isEnabled("#input"));

  await page.fill("#input", "What should I lead with?");
  await page.click("#send");
  await page.waitForFunction(
    () => /Lead with the ops work/.test(document.querySelector("#log").textContent),
    null, { timeout: 10000 });
  ok("the streamed answer arrives whole", true);

  const asked = await page.evaluate(() => window.__asked);
  ok("it was asked once", asked.length === 1, asked.length);
  ok("the charter goes as a system turn", asked[0].turns[0].role === "system",
     JSON.stringify(asked[0].turns[0]).slice(0, 80));
  ok("the charter is not empty", asked[0].turns[0].content.length > 40);
  ok("the question is the last turn",
     asked[0].turns[asked[0].turns.length - 1].role === "user");
  ok("a model is named", typeof asked[0].opts.model === "string" && !!asked[0].opts.model,
     asked[0].opts.model);
  ok("it asked to stream", asked[0].opts.stream === true);
  await ctx.close();
}

console.log("\nPuter answers all at once instead of streaming");
for (const [name, shape] of [
  ["a plain string", `"All at once."`],
  ["{text}", `({ text: "All at once." })`],
  ["a content array", `({ message: { content: [{ type: "text", text: "All at once." }] } })`],
  ["content as a string", `({ message: { content: "All at once." } })`],
]) {
  const { ctx, page } = await open(new Function(`
    window.puter = { ai: { chat: async () => (${shape}) } };`));
  await page.fill("#input", "hello");
  await page.click("#send");
  await page.waitForFunction(
    () => /All at once|Problem/.test(document.querySelector("#log").textContent),
    null, { timeout: 10000 }).catch(() => {});
  ok("it reads " + name, /All at once/.test(await page.textContent("#log")),
     (await page.textContent("#log")).slice(-120));
  await ctx.close();
}

console.log("\nthe sign-in window is closed without signing in");
{
  const { ctx, page } = await open(() => {
    window.puter = { ai: { chat: async () => { throw new Error("auth cancelled by user"); } } };
  });
  await page.fill("#input", "hello");
  await page.click("#send");
  await page.waitForFunction(
    () => /Problem/.test(document.querySelector("#log").textContent), null, { timeout: 10000 });
  const said = await page.textContent("#log");
  ok("it says the sign-in was not finished", /signing in|sign-in/i.test(said), said.slice(-200));
  ok("it does not call that a broken page", !/went wrong|bug in the page/i.test(said));
  ok("the composer stays open to try again", await page.isEnabled("#input"));
  await ctx.close();
}

console.log("\nPuter is not there at all");
{
  const { ctx, page } = await open();          // no stub, and the script is aborted
  ok("no route is invented", (await page.evaluate(() => route)) === "none",
     await page.evaluate(() => route));
  ok("it says offline", (await page.textContent("#statusText")) === "offline");
  ok("and blames the desk, not Puter",
     /machine is not up/.test(await page.textContent("#log")));
  await ctx.close();
}

console.log("\na half-loaded library is not a route");
{
  const { ctx, page } = await open(() => { window.puter = { ai: {} }; });
  ok("an object without chat() is ignored", (await page.evaluate(() => route)) === "none",
     await page.evaluate(() => route));
  await ctx.close();
}

await browser.close();
process.exit(t.done() ? 1 : 0);
