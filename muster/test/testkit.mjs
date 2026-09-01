/* Shared rig for the page tests.
 *
 * The page ships with a PBKDF2 verifier and no code in it - the code is what
 * the relay demands before it spends anyone's subscription, so publishing it
 * in the page would make that check worthless. A test therefore cannot type
 * the real one. It builds a copy with the verifier swapped for a code it
 * knows, and tests that copy. Everything else is the file that ships.
 *
 * There is no longer a screen in front of the page, so nothing has to be
 * unlocked to reach it; enterCode() puts a code in storage for the tests that
 * need the chat to be allowed. */
import { readFileSync } from "node:fs";
import { pbkdf2Sync } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const PAGE = join(HERE, "..", "index.html");
export const CODE = "open-sesame";

export const CHROME = process.env.CHROME
  || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
      "/opt/pw-browsers/chromium/chrome-linux/chrome"].find(p => {
        try { readFileSync(p); return true; } catch { return false; } })
  || undefined;                       // let playwright find its own

export function testPage() {
  const src = readFileSync(PAGE, "utf8");
  const salt = /salt: "([0-9a-f]+)"/.exec(src)[1];
  const hash = /hash: "([0-9a-f]+)"/.exec(src)[1];
  const want = pbkdf2Sync(CODE, Buffer.from(salt, "hex"), 100000, 32, "sha256").toString("hex");
  if (want === hash) throw new Error("the shipped code is 'open-sesame' - change it");
  return src.replace(`hash: "${hash}"`, `hash: "${want}"`);
}

/** Seed the code a visitor would have typed into the Assistant tab. */
export const enterCode = (page, code = CODE) =>
  page.addInitScript((c) => localStorage.setItem("muster:code", JSON.stringify(c)), code);

export function tally() {
  let pass = 0, fail = 0;
  return {
    ok(name, cond, extra) {
      if (cond) { pass++; console.log("  ok   " + name); }
      else { fail++; console.log("  FAIL " + name + (extra ? "  <" + String(extra).slice(0, 300) + ">" : "")); }
    },
    bad() { fail++; },
    done() {
      console.log(`\n${pass} passed, ${fail} failed`);
      return fail;
    }
  };
}
