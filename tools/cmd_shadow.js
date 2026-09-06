// cmd_shadow.js - find terminal commands that can never run, and commands the player cannot find.
//
// Why this exists: runCmd() is a long chain of `if (c === 'x' || c === 'y') { ... return; }`. The first branch
// that claims an alias wins and every later branch claiming the same alias is DEAD CODE - reachable only by
// deleting the earlier one. On 2026-09-06 an audit found six aliases in that state, and nothing about the source
// looks wrong: each handler is complete, sensible, and 300 lines away from the one shadowing it.
//
// The live examples this was written against:
//   `tom` and `mind`  - the whole theory-of-mind accuracy handler is unreachable
//   `reason`, `deliberate`, `talk` - each answered by an earlier branch that means something else
//   `mute`            - `mute` reaches the SOUND handler, `unmute` reaches the VOICES one, so the two are not
//                       inverses of each other, which no amount of reading either handler would reveal
//
//   node tools/cmd_shadow.js              # exit 1 on any shadowed alias
//   node tools/cmd_shadow.js --undiscoverable   # also list aliases `help` never names (informational, exit 0)
//   node tools/cmd_shadow.js --self-test  # prove the check works by planting a shadow in a copy first
//
// Deliberately a TEXT scan, like cfg_dupes.js: no JS parser, because index.html is a 7,400-line inline script and
// the thing being checked is which literal appears first. It reads `if (c === '...')` chains only, so a handler
// that dispatches some other way is invisible to it - that is a known limit, stated rather than papered over.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const FILE = path.join(ROOT, 'index.html');

// `if(c==='a'||c==='b'||c2==='c')` - collect every quoted literal compared against the command variable.
const BRANCH = /if\s*\(\s*c\s*===\s*'([^']+)'((?:\s*\|\|\s*c\s*===\s*'[^']+')*)\s*\)/g;
const MORE = /\|\|\s*c\s*===\s*'([^']+)'/g;

function scan(src) {
  const seen = new Map();      // alias -> first line that claimed it
  const shadowed = [];
  let m;
  BRANCH.lastIndex = 0;
  while ((m = BRANCH.exec(src)) !== null) {
    const line = src.slice(0, m.index).split('\n').length;
    const aliases = [m[1]];
    if (m[2]) {
      let e;
      MORE.lastIndex = 0;
      while ((e = MORE.exec(m[2])) !== null) aliases.push(e[1]);
    }
    for (const a of aliases) {
      if (seen.has(a)) shadowed.push({ alias: a, deadLine: line, liveLine: seen.get(a) });
      else seen.set(a, line);
    }
  }
  return { seen, shadowed };
}

function helpText(src) {
  // the block that prints the command list - everything `help` actually names
  const i = src.indexOf("if(c==='help'");
  if (i < 0) return '';
  return src.slice(i, i + 12000);
}

function main() {
  const args = process.argv.slice(2);
  let src = fs.readFileSync(FILE, 'utf8');

  if (args.includes('--self-test')) {
    // plant a shadow that is not there, and require the check to catch it. A checker nobody has seen fail is
    // not a checker - this is the same discipline cfg_dupes.js uses.
    const planted = src.replace("if(c==='ponder')", "if(c==='ponder'){} if(c==='help'||c==='ponder')");
    const r = scan(planted);
    const caught = r.shadowed.some(s => s.alias === 'help' || s.alias === 'ponder');
    console.log(caught
      ? 'self-test PASS - the planted shadow was caught'
      : 'self-test FAIL - a planted shadow went unnoticed, this checker proves nothing');
    process.exit(caught ? 0 : 1);
  }

  const { seen, shadowed } = scan(src);
  console.log(`scanned runCmd: ${seen.size} distinct aliases across the if-chain`);

  if (args.includes('--undiscoverable')) {
    const h = helpText(src);
    const missing = [...seen.keys()].filter(a => !h.includes(`>${a}<`) && !h.includes(`${a} `) && !h.includes(`${a}<`));
    console.log(`\naliases the help block never names: ${missing.length}`);
    console.log('  ' + missing.join(' · '));
    console.log('\n(informational - a command the player cannot discover is not broken, only unreachable)');
  }

  if (!shadowed.length) {
    console.log('no shadowed aliases - every command in the chain can be reached');
    process.exit(0);
  }
  console.log(`\nSHADOWED - these handlers can never run (${shadowed.length}):`);
  for (const s of shadowed) {
    console.log(`  '${s.alias}'  dead at line ${s.deadLine}, already claimed at line ${s.liveLine}`);
  }
  console.log('\nEach one is complete, sensible code that the chain answers before it is reached.');
  process.exit(1);
}

main();
