// f47_port_tabs_replay.js - settles genre cell F47 "docking opens a port interior with its own
// screens." Two facts, both read from the real source:
//   OPEN: the dock flow hands off to the SR planet screen - index.html calls PLANETMENU.open(p,...)
//         when you dock ("the SR planet screen owns docking now" :3234), with a dock sound.
//   SCREENS: PLANETMENU (planetmenu.js) is a tabbed port interior - CFG.TABS lists the screens and
//         renderBody() dispatches each S.tab to its own *Html() renderer.
// The replay parses CFG.TABS, asserts every tab is both a declared screen AND wired to a renderer,
// and asserts docking opens the menu. (planetmenu.js is DOM-heavy; this reads structure, not runs it.)
const fs = require('fs');
const path = require('path');
const PM = fs.readFileSync(path.join(__dirname, '..', 'planetmenu.js'), 'utf8');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

// parse CFG.TABS
const tabsBlk = PM.slice(PM.indexOf('TABS:'), PM.indexOf(']', PM.indexOf('TABS:')) + 1);
const tabs = [...tabsBlk.matchAll(/\{k:'(\w+)',\s*n:'([^']+)'/g)].map(m => ({ k: m[1], n: m[2] }));
// the renderBody dispatch block
const bodyBlk = PM.slice(PM.indexOf('function renderBody'), PM.indexOf('function renderBody') + 900);

console.log('F47 port-interior replay - CFG.TABS + renderBody dispatch (planetmenu.js), dock hook (index.html)\n');
ok('CFG.TABS parsed with >= 5 screens', tabs.length >= 5);
console.log('  the port interior screens:');
for (const t of tabs) {
  const dispatched = new RegExp("S\\.tab==='" + t.k + "'\\)\\s*h=(\\w+Html)\\(").exec(bodyBlk);
  console.log(`    ${t.n.padEnd(9)} (tab '${t.k}')  -> ${dispatched ? dispatched[1] + '()' : 'NO RENDERER'}`);
  ok(`screen '${t.k}' (${t.n}) is dispatched to its own renderer`, !!dispatched);
}

// docking opens the port interior
const dockOpens = /if\(window\.PLANETMENU&&PLANETMENU\.open\)\{[^\n]*PLANETMENU\.open\(p,\{isBase/.test(IDX);
const ownsDocking = /the SR planet screen owns docking now/.test(IDX);
ok('docking hands off to PLANETMENU.open(p, {isBase...}) - "the SR planet screen owns docking now"', dockOpens && ownsDocking);
ok('opening the port plays a dock sound', /PLANETMENU\.open\(p,\{isBase[^\n]*SOUND\.play\('dock'\)/.test(IDX));

console.log('\nRESULT: ' + (pass
  ? `PASS - F47 yes: docking opens the PLANETMENU port interior (SR planet screen), a tabbed UI with ${tabs.length} own screens (${tabs.map(t => t.n).join(', ')}), each with its own renderer`
  : 'FAIL'));
process.exit(pass ? 0 : 1);
