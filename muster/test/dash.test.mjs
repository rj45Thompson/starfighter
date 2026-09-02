/* The chat is the dashboard: one instance, in the right place, still working. */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { CHROME, testPage, sealLocal } from "./testkit.mjs";
const HTML = testPage();
const srv = createServer((q, r) => {
  if (q.url.split("?")[0].endsWith(".json")) { r.writeHead(200,{"content-type":"application/json"}); return r.end('{"url":""}'); }
  r.writeHead(200, { "content-type": "text/html" }); r.end(HTML);
});
await new Promise(r => srv.listen(8124, r));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log("  ok   " + n); } else { fail++; console.log("  FAIL " + n + (x !== undefined ? "  <" + JSON.stringify(x) + ">" : "")); } };

const b = await chromium.launch({ executablePath: CHROME, args:["--no-sandbox"] });
const page = await b.newPage(); page.setDefaultTimeout(20000);
await sealLocal(page);
page.on("pageerror", e => { fail++; console.log("  FAIL page error: " + e.message); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await page.route("https://desk.example/**", r => r.fulfill({ status:200, contentType:"application/json", body:'{"text":"Noted."}' }));
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto("http://localhost:8124/#desk=" + encodeURIComponent("https://desk.example/c") + "&code=x");
await page.waitForFunction(() => document.querySelector("#statusText").textContent === "ready");

console.log("\non the dashboard");
ok("the chat is inside the panel", await page.evaluate(() => !!document.querySelector("#panel #chatpane")));
ok("there is exactly one chat", (await page.$$("#chatpane")).length === 1);
ok("it is not a sidebar here", await page.evaluate(() => document.querySelector("#chatpane").classList.contains("inline")));
ok("the sidebar column is collapsed", await page.evaluate(() => document.querySelector("#shell").classList.contains("dash-chat")));
ok("the composer has focus", await page.evaluate(() => document.activeElement?.id === "input"));
ok("it leads the page", await page.evaluate(() => {
  const p = document.querySelector("#panel");
  return [...p.children].indexOf(document.querySelector("#chatpane")) <= 1;
}));
ok("and it still answers", await (async () => {
  await page.fill("#input", "hello");
  await page.click("#send");
  await page.waitForFunction(() => /Noted\./.test(document.querySelector("#log").textContent));
  return true;
})());

console.log("\nmoving to another tab");
await page.click(".navbtn[data-id='profile']");
await page.waitForTimeout(300);
ok("the chat goes back to the side", await page.evaluate(() => !document.querySelector("#panel #chatpane")));
ok("still exactly one", (await page.$$("#chatpane")).length === 1);
ok("the sidebar column is back", await page.evaluate(() => !document.querySelector("#shell").classList.contains("dash-chat")));
ok("the conversation survived the move", /Noted\./.test(await page.textContent("#log")));

console.log("\nand back again");
await page.click(".navbtn[data-id='dash']");
await page.waitForTimeout(300);
ok("inline once more", await page.evaluate(() => !!document.querySelector("#panel #chatpane")));
ok("history still there", /Noted\./.test(await page.textContent("#log")));
ok("still one chat after two moves", (await page.$$("#chatpane")).length === 1);

await b.close(); srv.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
