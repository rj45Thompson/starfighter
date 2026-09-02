/* A remembered address that has gone.
 *
 * The launcher hands the page a desk in the link: #desk=https://x.trycloudflare.com.
 * The page remembers it, which is the point - a reload without the fragment
 * still works. But a quick tunnel takes a new hostname every run, and the old
 * one does not go quiet: it is handed to somebody else, and it answers. What
 * it answers is a refusal.
 *
 * So the page said ready, because it had an address; and every question came
 * back "Unauthorized", because the address belonged to a stranger. Meanwhile
 * the owner's own desk was up on this very machine, one probe away, and the
 * page never looked - a remembered address outranked it and nothing ever
 * checked whether it was still real.
 *
 * A remembered address is a guess. It has to be checked like one. */
import { chromium } from "playwright";
import { CHROME, CODE, testPage, tally, enterCode, sealLocal } from "./testkit.mjs";

const t = tally(), ok = t.ok;
const HTML = testPage();

const DEAD = "https://gone.trycloudflare.example/bridge/chat";
const asked = [];               // what the live desk on this machine was asked
let deskUp = true;

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await sealLocal(page);
page.on("pageerror", e => { t.bad(); console.log("  FAIL page error: " + e.message); });

await page.route("https://rj45thompson.github.io/**", (route) => {
  const u = new URL(route.request().url());
  if (u.pathname.endsWith("relay.json"))
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"url":""}' });
  if (u.pathname.endsWith("notify.json"))
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"url":""}' });
  return route.fulfill({ status: 200, contentType: "text/html", body: HTML });
});

// This machine's own desk, up the whole time and never asked. Answered by a
// route rather than a socket: Chromium here will not open a loopback
// connection of its own, and what is under test is which address the page
// chooses, not whether a TCP connect works.
await page.route("http://127.0.0.1:8770/**", (route) => {
  const u = new URL(route.request().url());
  if (!deskUp) return route.fulfill({ status: 503, body: "{}" });
  if (u.pathname === "/health")
    return route.fulfill({ status: 200, contentType: "application/json",
                           body: JSON.stringify({ ok: true, version: "test" }) });
  asked.push(JSON.parse(route.request().postData() || "{}"));
  return route.fulfill({ status: 200, contentType: "application/json",
                         body: JSON.stringify({ text: "Your own desk answered." }) });
});
// Nothing is listening on the spare port, and the page must not hang on it.
await page.route("http://127.0.0.1:8771/**", (route) => route.abort());

// The stranger who now owns that hostname. This is the 401 on the screenshot.
let deadHits = 0;
await page.route("https://gone.trycloudflare.example/**", (route) => {
  deadHits++;
  return route.fulfill({ status: 401, contentType: "application/json",
                         body: JSON.stringify({ error: "Unauthorized" }) });
});

// Exactly what a link left behind: an address and a code, both remembered.
await enterCode(page);
await page.addInitScript((u) => localStorage.setItem("muster:relay", JSON.stringify(u)), DEAD);

await page.goto("https://rj45thompson.github.io/starfighter/muster/index.html");
await page.waitForFunction(() => document.querySelector("#statusText").textContent !== "connecting…");

console.log("\nthe remembered desk is gone, and this machine's own desk is up");
ok("it does not keep talking to the address that is gone",
   await page.evaluate(() => relayUrl()) !== DEAD, await page.evaluate(() => relayUrl()));
ok("it found the desk running on this machine",
   /127\.0\.0\.1:8770/.test(await page.evaluate(() => relayUrl())),
   await page.evaluate(() => relayUrl()));
ok("it says ready", (await page.textContent("#statusText")) === "ready",
   await page.textContent("#statusText"));
ok("the composer is open", await page.isEnabled("#input"));

await page.fill("#input", "What should I lead with?");
await page.click("#send");
await page.waitForFunction(
  () => /Your own desk answered|Unauthorized|Problem/.test(document.querySelector("#log").textContent),
  null, { timeout: 8000 }).catch(() => {});
ok("the question reached this machine's desk", asked.length === 1, `asked ${asked.length}`);
ok("and was answered", /Your own desk answered/.test(await page.textContent("#log")),
   (await page.textContent("#log")).slice(-200));
ok("no 'Unauthorized' anywhere on screen",
   !/Unauthorized/i.test(await page.textContent("#log")),
   (await page.textContent("#log")).slice(-200));
ok("the access code still travels", asked[0] && asked[0].code === CODE, asked[0] && asked[0].code);

console.log("\nand it is watching, so it can recover again");
ok("the watcher is running even though a link once set an address",
   await page.evaluate(() => watching !== null));

console.log("\nthe forgotten address is not resurrected on reload");
await page.reload();
await page.waitForFunction(() => document.querySelector("#statusText").textContent !== "connecting…");
ok("still on this machine's desk",
   /127\.0\.0\.1:8770/.test(await page.evaluate(() => relayUrl())),
   await page.evaluate(() => relayUrl()));

await ctx.close();

/* ---- the browser holding the request, which is what Chrome 138+ does ---- */
{
  console.log("\nthe desk is up but the browser has not been given permission yet");
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await sealLocal(page2);
  page2.on("pageerror", e => { t.bad(); console.log("  FAIL page error: " + e.message); });
  await page2.route("https://rj45thompson.github.io/**", (route) => {
    const u = new URL(route.request().url());
    if (/relay\.json|notify\.json/.test(u.pathname))
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"url":""}' });
    return route.fulfill({ status: 200, contentType: "text/html", body: HTML });
  });

  // Held, the way a real prompt holds it: no error, no timeout, just nothing -
  // and then an answer, once somebody clicks Allow.
  let release;
  const allowed = new Promise(r => release = r);
  await page2.route("http://127.0.0.1:8770/**", async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === "/health") {
      await allowed;
      return route.fulfill({ status: 200, contentType: "application/json",
                             body: JSON.stringify({ ok: true, version: "test" }) });
    }
    asked.push(JSON.parse(route.request().postData() || "{}"));
    return route.fulfill({ status: 200, contentType: "application/json",
                           body: JSON.stringify({ text: "Your own desk answered." }) });
  });
  await page2.route("http://127.0.0.1:8771/**", (route) => route.abort());
  await enterCode(page2);
  await page2.goto("https://rj45thompson.github.io/starfighter/muster/index.html");

  await page2.waitForFunction(
    () => document.querySelector("#statusText").textContent !== "connecting…");
  ok("the page does not sit there waiting on it",
     (await page2.textContent("#statusText")) === "offline",
     await page2.textContent("#statusText"));
  const said = await page2.textContent("#log");
  ok("it says the browser is asking, not that the machine is down",
     /asking whether this page may reach/.test(said), said.slice(0, 200));
  ok("it does not tell you to start a computer that is already running",
     !/machine is not up/.test(said), said.slice(0, 200));

  console.log("\nand then Allow is clicked");
  release();
  await page2.waitForFunction(
    () => document.querySelector("#statusText").textContent === "ready",
    null, { timeout: 10000 });
  ok("it connects by itself, with no reload", true);
  ok("on the desk on this machine",
     /127\.0\.0\.1:8770/.test(await page2.evaluate(() => relayUrl())),
     await page2.evaluate(() => relayUrl()));
  ok("and says so", /Connected/.test(await page2.textContent("#log")));

  const before = asked.length;
  await page2.fill("#input", "Now?");
  await page2.click("#send");
  await page2.waitForFunction(
    () => /Your own desk answered|Problem/.test(document.querySelector("#log").textContent),
    null, { timeout: 8000 }).catch(() => {});
  ok("and answers through it", asked.length === before + 1);
  await ctx2.close();
}

/* ---- and when there is genuinely nothing there ---- */
{
  console.log("\nnothing is listening at all");
  const ctx3 = await browser.newContext();
  const page3 = await ctx3.newPage();
  await sealLocal(page3);
  await page3.route("https://rj45thompson.github.io/**", (route) => {
    const u = new URL(route.request().url());
    if (/relay\.json|notify\.json/.test(u.pathname))
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"url":""}' });
    return route.fulfill({ status: 200, contentType: "text/html", body: HTML });
  });
  await page3.route("http://127.0.0.1:*/**", (route) => route.abort());
  await page3.goto("https://rj45thompson.github.io/starfighter/muster/index.html");
  await page3.waitForFunction(
    () => document.querySelector("#statusText").textContent !== "connecting…");
  const said3 = await page3.textContent("#log");
  ok("it says the machine is not up, which is the truth this time",
     /machine is not up/.test(said3), said3.slice(0, 200));
  ok("and does not blame a permission nobody was asked for",
     !/asking whether this page may reach/.test(said3), said3.slice(0, 200));
  await ctx3.close();
}

/* ---- the case on the screenshot: a dead address and NO desk at all ---- */
{
  console.log("\nthe remembered desk is gone and there is no desk on this machine");
  const ctx4 = await browser.newContext();
  const page4 = await ctx4.newPage();
  await sealLocal(page4);                       // nothing on loopback, refused fast
  page4.on("pageerror", e => { t.bad(); console.log("  FAIL page error: " + e.message); });
  await page4.route("https://rj45thompson.github.io/**", (route) => {
    const u = new URL(route.request().url());
    if (/relay\.json|notify\.json/.test(u.pathname))
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"url":""}' });
    return route.fulfill({ status: 200, contentType: "text/html", body: HTML });
  });
  let hits = 0;
  await page4.route("https://gone.trycloudflare.example/**", (route) => {
    hits++;
    return route.fulfill({ status: 401, contentType: "application/json",
                           body: JSON.stringify({ error: "Unauthorized" }) });
  });
  await enterCode(page4);
  await page4.addInitScript((u) => localStorage.setItem("muster:relay", JSON.stringify(u)), DEAD);
  await page4.goto("https://rj45thompson.github.io/starfighter/muster/index.html");
  await page4.waitForFunction(
    () => document.querySelector("#statusText").textContent !== "connecting…");

  // The whole bug in one assertion: an address it has never heard from is not
  // a reason to tell somebody the assistant is ready.
  ok("it does not claim to be ready on an address that never answered",
     (await page4.textContent("#statusText")) === "offline",
     await page4.textContent("#statusText"));
  ok("and does not route to it", !(await page4.evaluate(() => relayUrl())),
     await page4.evaluate(() => relayUrl()));
  ok("the composer is locked rather than sending into a refusal",
     !(await page4.isEnabled("#input")));

  const said4 = await page4.textContent("#log");
  ok("it says the link has gone stale, which is the useful thing to know",
     /link|no longer answering|fresh/i.test(said4), said4.slice(0, 220));
  ok("no 'Unauthorized' on screen", !/Unauthorized/i.test(said4), said4.slice(0, 220));
  ok("nothing was ever POSTed to the stranger", hits <= 1, "requests: " + hits);
  await ctx4.close();
}

await browser.close();
process.exit(t.done() ? 1 : 0);
