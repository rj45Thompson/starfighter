/* Forms that are not on the page yet, in a real browser.
 *
 * Unit tests can show that isAuthField() returns true. They cannot show that
 * the extension actually declines to type into a live login box, then notices
 * the wall come down and finishes the job. Nor that it waits for a form that
 * has not hydrated, nor that it follows a multi-step application to the next
 * step. All three are the same bug — the fields are not there yet — and all
 * three need real DOM and real MutationObserver timing to test at all.
 *
 *   npm i playwright-core && node extension/test/login.test.js
 */

const path = require("path");
const fs = require("fs");
// Playwright is not vendored — this is the only test that needs a browser, and
// the detection suite must stay installable-free. Skip loudly rather than crash.
const { browser: findBrowser, launch } = require("./browser.js");

const ENV = findBrowser("dynamic forms");
if (!ENV) process.exit(0);

const SRC = path.join(__dirname, "..", "src");
const fixture = (name) => "file://" + path.join(__dirname, "fixtures", name);

const PROFILE = {
  firstName: "RJ", lastName: "Thompson",
  email: "rj@example.com", phone: "+1 555 0100",
  linkedin: "https://linkedin.com/in/example"
};

let pass = 0, fail = 0;
const check = (desc, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++;
  else { fail++; console.error(`  FAIL  ${desc}\n        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
};

(async () => {
  const browser = await launch(ENV);
  if (!browser) process.exit(0);
  const errors = [];

  /* Load a fixture with the content script injected. Stands in for the
   * extension host: content.js only needs chrome.runtime.onMessage to exist. */
  async function open(name) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => errors.push(name + ": " + e.message));
    await page.goto(fixture(name));
    await page.addScriptTag({ content:
      "window.chrome = { runtime: { onMessage: { addListener: (fn) => { window.__listener = fn; } } } };" });
    for (const f of ["fields.js", "content.js"]) {
      await page.addScriptTag({ content: fs.readFileSync(path.join(SRC, f), "utf8") });
    }
    page.fill_ = () => page.evaluate((profile) => new Promise((resolve) => {
      window.__listener({ type: "AA_FILL", profile, overwrite: false }, null, resolve);
    }), PROFILE);
    return page;
  }

  const filled = (page, sel) => page.waitForFunction(
    (s) => { const el = document.querySelector(s); return el && el.value !== ""; },
    sel, { timeout: 8000 }).then(() => true).catch(() => false);

  const page = await open("login-then-apply.html");
  const fill = () => page.fill_();

  console.log("\nat the sign-in wall");
  const first = await fill();
  check("fills nothing", first.filled, 0);
  check("reports a wall", first.wall, true);
  check("starts waiting", first.waiting, true);
  check("login email box left empty", await page.inputValue("#u"), "");
  check("password box left empty", await page.inputValue("#p"), "");
  check("banner explains the handoff",
    (await page.textContent("#aa-banner .aa-msg")).includes("Sign in yourself"), true);

  console.log("\nafter the person signs in themselves");
  await page.click("#go");                 // the wall comes down
  await page.waitForSelector("#apply");
  await filled(page, "#fn");

  check("first name filled",  await page.inputValue("#fn"), PROFILE.firstName);
  check("last name filled",   await page.inputValue("#ln"), PROFILE.lastName);
  check("email filled",       await page.inputValue("#em"), PROFILE.email);
  check("phone filled",       await page.inputValue("#ph"), PROFILE.phone);
  check("linkedin filled",    await page.inputValue("#li"), PROFILE.linkedin);
  check("banner says it resumed",
    (await page.textContent("#aa-banner .aa-msg")).includes("Signed in"), true);

  console.log("\na form that has not hydrated yet");
  const hyd = await open("late-hydration.html");
  const hydFirst = await hyd.fill_();       // pressed before the form exists
  check("nothing to fill yet", hydFirst.filled, 0);
  check("not mistaken for a login", hydFirst.wall, false);
  check("waits instead of giving up", hydFirst.waiting, true);
  check("fills once the form renders", await filled(hyd, "#fn"), true);
  check("first name correct", await hyd.inputValue("#fn"), PROFILE.firstName);
  check("email correct", await hyd.inputValue("#em"), PROFILE.email);

  console.log("\na second step of the same application");
  const step = await open("multi-step.html");
  const stepFirst = await step.fill_();
  check("step one filled", stepFirst.filled, 2);
  check("last name correct", await step.inputValue("#ln"), PROFILE.lastName);
  await step.click("#next");                // WorkDay-style step change
  await step.waitForSelector("#em");
  check("step two fills itself", await filled(step, "#em"), true);
  check("phone carried over", await step.inputValue("#ph"), PROFILE.phone);
  check("linkedin carried over", await step.inputValue("#li"), PROFILE.linkedin);
  check("banner names the new step",
    (await step.textContent("#aa-banner .aa-msg")).includes("New step"), true);

  console.log("\nacross all three");
  check("no page errors", errors, []);

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("harness failed:", e.message); process.exit(1); });
