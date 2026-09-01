/* Shared rig for the page tests.
 *
 * The page ships with a PBKDF2 verifier and no code in it, which is the point
 * of the lock screen - so a test cannot simply type the real one. It builds a
 * copy with the verifier swapped for a code it knows, and tests that copy.
 * Everything else about the file is the file that ships. */
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
