/* Finding a browser, in whatever container this happens to be.
 *
 * Both browser suites used to name one path with a version in it. That is
 * fine on the machine it was written on and wrong everywhere else, and the
 * failure it produces is the expensive kind: playwright-core is installed, so
 * the suite does not skip, and launch() throws instead - which reads as a
 * failing test. A scheduled run that is told never to push on a red test then
 * correctly refuses to push, and the whole run produces nothing while
 * reporting success. A missing browser is not a failing test; say so and skip.
 */
const fs = require("fs");
const path = require("path");

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers",
                 path.join(process.env.HOME || "", ".cache", "ms-playwright")];
  for (const root of roots) {
    if (!root || !fs.existsSync(root)) continue;
    const dirs = fs.readdirSync(root).filter((d) => d.startsWith("chromium"));
    // Newest build first, so a container with several picks the current one.
    dirs.sort((a, b) => (parseInt(b.split("-")[1] || "0", 10) - parseInt(a.split("-")[1] || "0", 10)));
    for (const d of dirs) {
      for (const rel of [["chrome-linux", "chrome"], ["chrome-mac", "Chromium.app",
                          "Contents", "MacOS", "Chromium"], ["chrome-win", "chrome.exe"]]) {
        const p = path.join(root, d, ...rel);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return null;                     // let playwright resolve its own default
}

/* The driver, wherever it happens to be installed.
 *
 * This asked for playwright-core and nothing else, so on a machine with the
 * full playwright installed - which is most of them, and is what the page
 * tests here use - both browser suites reported "skipped" and moved on. A
 * skip is meant to mean there is no browser. It came to mean the module was
 * spelled differently, and 86 assertions sat dark behind a line that read like
 * everything was fine. Try the names it could have, and the places a global
 * install puts them, before believing that. */
function driver() {
  const names = ["playwright-core", "playwright"];
  for (const n of names) {
    try { return require(n); } catch { /* try the next one */ }
  }
  // A global install is not on this file's resolution path. Look where node
  // itself would have looked if NODE_PATH had been set.
  const roots = [process.env.NODE_PATH, "/opt/node22/lib/node_modules",
                 "/usr/lib/node_modules", "/usr/local/lib/node_modules",
                 path.join(__dirname, "..", "..", "test", "node_modules")];
  for (const root of roots) {
    if (!root) continue;
    for (const n of names) {
      const p = path.join(root, n);
      try { if (fs.existsSync(p)) return require(p); } catch { /* keep looking */ }
    }
  }
  return null;
}

/** A driver plus a launchable browser, or null with a reason printed. */
function browser(label) {
  const mod = driver();
  if (!mod) {
    console.log(`\n${label}: skipped (no playwright here - npm i playwright-core)\n`);
    return null;
  }
  const { chromium } = mod;
  const executablePath = findChrome();
  return { chromium, executablePath: executablePath || undefined, label };
}

/** Launch, or skip loudly if there is no browser to launch. */
async function launch(env) {
  try {
    return await env.chromium.launch({
      executablePath: env.executablePath, args: ["--no-sandbox"] });
  } catch (e) {
    console.log(`\n${env.label}: skipped (no browser here - ${e.message.split("\n")[0]})`);
    console.log("  set CHROME_PATH, or npx playwright install chromium\n");
    return null;
  }
}

module.exports = { findChrome, driver, browser, launch };
