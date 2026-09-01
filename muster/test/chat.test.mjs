/* The chat box: what it sends, what it refuses, and where a file ends up. */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { CHROME, CODE, testPage, tally } from "./testkit.mjs";
import { makePdf, PNG } from "./fixtures.mjs";

const HTML = testPage();
const PDF = makePdf();
const srv = createServer((req, res) => {
  const p = req.url.split("?")[0];
  if (p.endsWith("relay.json")) {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end('{"url":""}');
  }
  res.writeHead(200, { "content-type": "text/html" });
  res.end(HTML);
});
await new Promise(r => srv.listen(8099, r));

const t = tally(), ok = t.ok;
const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });

async function open(seed) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("pageerror", e => { t.bad(); console.log("  FAIL page error: " + e.message); });
  await page.addInitScript(seed);
  await page.goto("http://localhost:8099/");
  await page.fill("#gateInput", CODE);
  await page.click("#gateGo");
  await page.waitForFunction(() => !document.documentElement.classList.contains("gated"));
  return { ctx, page };
}

/* ---- 1. the claude route: attachments arrive flattened into the turn ---- */
console.log("\nclaude route (in-artifact sampling)");
{
  const { ctx, page } = await open(() => {
    window.__seen = [];
    window.claude = { use: async (n) => n === "sample" ? {
      async prompt() {}, // unused
      __call: null
    } : null };
    // The page calls sample(msgs, opts) directly, so make the object callable.
    window.claude.use = async (n) => {
      if (n !== "sample") return null;
      const f = async (msgs, opts) => {
        window.__seen.push(JSON.parse(JSON.stringify(msgs)));
        const text = "Lead with the ops experience.";
        if (opts && opts.onText) opts.onText({ text, delta: text });
        return { text };
      };
      return f;
    };
  });

  await page.waitForFunction(() => document.querySelector("#statusText").textContent === "assistant live");
  ok("route is live", true);

  await page.setInputFiles("#pick", [{ name: "resume.pdf", mimeType: "application/pdf", buffer: PDF }]);
  await page.waitForSelector("#files .file");
  const chip = await page.textContent("#files .file");
  ok("pdf chip shows a size, not an error", /KB/.test(chip) && !/no text/.test(chip), chip);

  await page.fill("#input", "What should I lead with?");
  await page.click("#send");
  await page.waitForFunction(() => window.__seen.length > 0);
  const msgs = await page.evaluate(() => window.__seen[0]);
  const turn = msgs[msgs.length - 1];
  ok("user turn is a string on this route", typeof turn.content === "string", typeof turn.content);
  ok("pdf text reached the model", /RJ Thompson/.test(turn.content), turn.content);
  ok("file is delimited", /<file name="resume.pdf">/.test(turn.content));
  ok("the question is still there", /What should I lead with\?/.test(turn.content));
  ok("system prompt has the length rule", /at most three short sentences/.test(msgs[0].content));

  await page.waitForFunction(() => /Lead with the ops/.test(document.querySelector("#log").textContent));
  ok("answer is rendered", true);
  const tray = await page.$$("#files .file");
  ok("tray is cleared after sending", tray.length === 0, tray.length);

  await page.fill("#input", "And second?");
  await page.click("#send");
  await page.waitForFunction(() => window.__seen.length > 1);
  const second = await page.evaluate(() => window.__seen[1]);
  ok("the file does not ride along on the next turn",
     !/RJ Thompson/.test(second[second.length - 1].content));
  await ctx.close();
}

/* ---- 2. the key route: real Messages-API content blocks, images included ---- */
console.log("\nkey route (direct Anthropic)");
{
  const { ctx, page } = await open(() => {
    localStorage.setItem("muster:apiKey", JSON.stringify("sk-ant-test"));
  });
  let body = null;
  await page.route("https://api.anthropic.com/**", async (route) => {
    body = JSON.parse(route.request().postData());
    await route.fulfill({
      status: 200, contentType: "text/event-stream",
      body: 'data: {"type":"content_block_delta","delta":{"text":"Seen."}}\n\n'
    });
  });
  await page.waitForFunction(() => document.querySelector("#statusText").textContent === "assistant on your key");
  ok("falls through to the key route", true);

  await page.setInputFiles("#pick", [
    { name: "shot.png", mimeType: "image/png", buffer: PNG },
    { name: "resume.pdf", mimeType: "application/pdf", buffer: PDF }
  ]);
  await page.waitForFunction(() => document.querySelectorAll("#files .file").length === 2);
  ok("two chips", true);

  await page.fill("#input", "Read these.");
  await page.click("#send");
  await page.waitForFunction(() => /Seen\./.test(document.querySelector("#log").textContent));

  const turn = body.messages[body.messages.length - 1];
  ok("user turn is content blocks", Array.isArray(turn.content), typeof turn.content);
  const img = turn.content.find(b => b.type === "image");
  ok("image block is base64 png", !!img && img.source.type === "base64" && img.source.media_type === "image/png");
  ok("image data is the file", !!img && img.source.data === PNG.toString("base64"));
  ok("pdf came through as text", turn.content.some(b => b.type === "text" && /RJ Thompson/.test(b.text)));
  ok("the typed line is the last block", turn.content[turn.content.length - 1].text === "Read these.");
  ok("no system prompt leaked into a user turn", !/three short sentences/.test(JSON.stringify(turn)));
  ok("system is sent separately", /three short sentences/.test(body.system));
  await ctx.close();
}

/* ---- 3. bad input is refused on the chip, not sent ---- */
console.log("\nrefusals");
{
  const { ctx, page } = await open(() => {
    window.__seen = [];
    window.claude = { use: async (n) => n !== "sample" ? null : async (msgs, opts) => {
      window.__seen.push(JSON.parse(JSON.stringify(msgs)));
      if (opts && opts.onText) opts.onText({ text: "ok", delta: "ok" });
      return { text: "ok" };
    } };
  });
  await page.waitForFunction(() => document.querySelector("#statusText").textContent === "assistant live");

  await page.setInputFiles("#pick", [{ name: "scan.pdf", mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n") }]);
  await page.waitForSelector("#files .file.bad");
  ok("a pdf with no text is called out", /no text/.test(await page.textContent("#files .file")));

  await page.setInputFiles("#pick", [
    { name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("aaa") },
    { name: "b.txt", mimeType: "text/plain", buffer: Buffer.from("bbb") },
    { name: "c.txt", mimeType: "text/plain", buffer: Buffer.from("ccc") },
    { name: "d.txt", mimeType: "text/plain", buffer: Buffer.from("ddd") }
  ]);
  await page.waitForFunction(() => document.querySelectorAll("#files .file").length === 4);
  ok("four is the ceiling", (await page.$$("#files .file")).length === 4);
  ok("the fifth is refused out loud", /not added/.test(await page.textContent("#log")));

  // an unreadable attachment must not silently become an empty turn
  await page.evaluate(() => { document.querySelectorAll("#files .file button").forEach(b => b.click()); });
  await page.setInputFiles("#pick", [{ name: "scan.pdf", mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nnothing here\n%%EOF\n") }]);
  await page.waitForSelector("#files .file.bad");
  await page.click("#send");                       // no text typed, only a bad file
  await page.waitForFunction(() => window.__seen.length > 0);
  const t = (await page.evaluate(() => window.__seen[0])).slice(-1)[0].content;
  ok("a broken file still sends a real turn", typeof t === "string" && t.length > 0, t);
  await ctx.close();
}

await browser.close();
srv.close();
process.exit(t.done() ? 1 : 0);
