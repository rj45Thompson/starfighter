/*
  Package the extension.

  This exists because the packaged copy was checked into git and went stale:
  content.js and fields.js - the fill logic and the list of things the
  extension refuses to touch - had both moved on, and anyone who downloaded the
  zip got the older ones. A build artifact that can disagree with its source is
  worse than no build artifact, so it is built here and never committed.

  Deliberately dependency-free: it writes the zip byte by byte (stored, no
  compression) rather than pulling in an archiver, because a packaging step is
  the last place that should be able to break on an npm install.
*/
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { deflateRawSync, crc32 } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "apply-assist");
const OUT = join(HERE, "..", "apply-assist.zip");

// The test folder is for this repo, not for the browser. Shipping it would put
// fixture pages and a browser resolver inside everyone's extension.
const SKIP = new Set(["test", "node_modules", ".git"]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir).sort()) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = walk(SRC);
if (!files.length) throw new Error("nothing to package - is apply-assist/ there?");

const chunks = [], central = [];
let offset = 0;

for (const file of files) {
  // Chrome loads the folder inside the zip, so keep the apply-assist/ prefix:
  // unzip, then Load unpacked on the folder that appears.
  const name = "apply-assist/" + relative(SRC, file).split(sep).join("/");
  const body = readFileSync(file);
  const deflated = deflateRawSync(body, { level: 9 });
  const useDeflate = deflated.length < body.length;
  const data = useDeflate ? deflated : body;
  const method = useDeflate ? 8 : 0;
  const crc = crc32(body) >>> 0;
  const nameBuf = Buffer.from(name, "utf8");

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);            // version needed
  local.writeUInt16LE(0, 6);             // flags
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(0, 10);            // time - fixed, so the zip is reproducible
  local.writeUInt16LE(0x21, 12);         // date - 1 Jan 1996, likewise
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(body.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);
  chunks.push(local, nameBuf, data);

  const dir = Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50, 0);
  dir.writeUInt16LE(20, 4);
  dir.writeUInt16LE(20, 6);
  dir.writeUInt16LE(0, 8);
  dir.writeUInt16LE(method, 10);
  dir.writeUInt16LE(0, 12);
  dir.writeUInt16LE(0x21, 14);
  dir.writeUInt32LE(crc, 16);
  dir.writeUInt32LE(data.length, 20);
  dir.writeUInt32LE(body.length, 24);
  dir.writeUInt16LE(nameBuf.length, 28);
  dir.writeUInt32LE(0, 38);              // external attrs
  dir.writeUInt32LE(offset, 42);
  central.push(dir, nameBuf);

  offset += local.length + nameBuf.length + data.length;
}

const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);

const zip = Buffer.concat([...chunks, centralBuf, end]);
writeFileSync(OUT, zip);

const sum = createHash("sha256").update(zip).digest("hex").slice(0, 12);
console.log(`apply-assist.zip  ${files.length} files  ${zip.length} bytes  sha256:${sum}`);
