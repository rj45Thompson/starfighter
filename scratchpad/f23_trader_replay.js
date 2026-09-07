// f23_trader_replay.js - headless proof that NPC traders PHYSICALLY MOVE GOODS between markets and
// CAN BE ATTACKED (their hold spills as scoopable cargo when killed, and the player can loot it).
// buy/sell (index.html:1847-1851), dropCargo (:1911-1912), scoopPod (:1913-1915) and cargoTotal
// (:1845) are transcribed VERBATIM; killShip :2820 calls dropCargo on every ship death. CFG values are
// the real ones (CREDIT_RESERVE 12, HOLD_CAP 40, POD_CHUNK 8, SALVAGE 0.6, SKILL_TRADE_PRICE 0.02, :487/:516/:511).
'use strict';
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } }

const CFG = { CREDIT_RESERVE: 12, HOLD_CAP: 40, POD_CHUNK: 8, SALVAGE: 0.6, SKILL_TRADE_PRICE: 0.02, TRADE_QTY: 20 };
const GKEY = { ore: { n: 'Ore', base: 14, cat: 'raw' } };
function priceOf(p, k) { return p.price[k]; }           // fixed per-market price (F19 price dynamics settled separately)
function repBuyFactor() { return 1; } function repSellFactor() { return 1; }
function skillLvl() { return 0; }
function repAdd() {}                                     // player-only rep side effect, irrelevant to a trader

// ---- VERBATIM index.html ----
function cargoTotal(s) { let n = 0; for (const k in s.cargo) n += s.cargo[k]; return n; }
function buy(s, p, gk, qty) { let price = priceOf(p, gk); if (s.role === 'player') price *= repBuyFactor(p); price *= (1 - CFG.SKILL_TRADE_PRICE * skillLvl(s, 'trade')); const reserve = s.role === 'player' ? 0 : CFG.CREDIT_RESERVE;
  qty = Math.min(qty, Math.floor(Math.max(0, s.credits - reserve) / price), (s.holdCap || CFG.HOLD_CAP) - cargoTotal(s), Math.floor(p.stock[gk] - 4));
  if (qty <= 0) return 0; s.credits -= Math.round(price * qty); p.stock[gk] -= qty; s.cargo[gk] = (s.cargo[gk] || 0) + qty; if (s.role === 'player') { repAdd(p, 0); } return qty; }
function sell(s, p, gk, qty) { qty = Math.min(qty, s.cargo[gk] || 0); if (qty <= 0) return 0; let price = priceOf(p, gk); if (s.role === 'player') price *= repSellFactor(p); price *= (1 + CFG.SKILL_TRADE_PRICE * skillLvl(s, 'trade'));
  const rev = Math.round(price * qty); s.credits += rev; p.stock[gk] += qty; s.cargo[gk] -= qty; if (s.cargo[gk] <= 0) delete s.cargo[gk]; if (s.role === 'player') { repAdd(p, 0); } return rev; }
const cargoPods = [];
function spawnCargoPod(pos, good, qty) { qty = Math.round(qty); if (qty <= 0) return; cargoPods.push({ good, qty }); }
function dropCargo(s) { for (const k in s.cargo) { let left = s.cargo[k]; while (left > 0) { const q = Math.min(left, CFG.POD_CHUNK);
  spawnCargoPod(s.pos, k, q); left -= q; } } s.cargo = {}; }
function scoopPod(s, c) { const g = GKEY[c.good];
  if (s.role === 'trader' && cargoTotal(s) + c.qty <= CFG.HOLD_CAP) { s.cargo[c.good] = (s.cargo[c.good] || 0) + c.qty; }
  else { const val = Math.round(c.qty * g.base * CFG.SALVAGE); s.credits += val; return val; } return 0; }

const A = { name: 'Halcyon', price: { ore: 10 }, stock: { ore: 100 } };   // cheap market
const B = { name: 'Cydon',   price: { ore: 25 }, stock: { ore: 100 } };   // dear market
const T = { role: 'trader', name: 'HAUL-3', credits: 1000, cargo: {}, holdCap: 40, pos: { x: 0 } };

// 1) trader BUYS at the cheap market A: goods LEAVE A's stock and enter the trader's hold
const bq = buy(T, A, 'ore', CFG.TRADE_QTY);
check('[buy] trader buys 20 ore at A', bq === 20 && T.cargo.ore === 20 && T.credits === 800);
check('[buy] goods PHYSICALLY leave market A (stock 100 -> 80)', A.stock.ore === 80);

// 2) trader flies to B and SELLS: goods ARRIVE in B's stock, leave the hold -> goods moved A->B
const rev = sell(T, B, 'ore', CFG.HOLD_CAP);
check('[sell] trader sells 20 ore at B for 500c', rev === 500 && T.credits === 1300 && !T.cargo.ore);
check('[move] goods ARRIVED at market B (stock 100 -> 120) - a real A->B goods movement', B.stock.ore === 120);
check('[move] 20 units left A and 20 arrived at B (conserved physical transfer)', (100 - A.stock.ore) === 20 && (B.stock.ore - 100) === 20);
check('[profit] the run cleared +300c (bought 200, sold 500)', T.credits - 1000 === 300);

// 3) the trader picks up another load, then is KILLED -> killShip :2820 dropCargo spills the hold as pods
buy(T, A, 'ore', CFG.TRADE_QTY);                       // 20 ore aboard again
check('[reload] trader carrying 20 ore before interception', T.cargo.ore === 20);
cargoPods.length = 0;
dropCargo(T);                                          // <- killShip(:2820) on any ship death
const dropped = cargoPods.reduce((n, c) => n + c.qty, 0);
check('[intercept] killing the trader spills its ENTIRE hold as pods (20 units)', dropped === 20 && cargoTotal(T) === 0);
check('[intercept] the hold is chunked by POD_CHUNK 8 -> 3 pods (8+8+4)', cargoPods.length === 3);

// 4) the PLAYER intercepts by scooping the pods -> credits (loot), not free re-stock
const player = { role: 'player', credits: 0, cargo: {} };
let looted = 0; for (const c of cargoPods.slice()) looted += scoopPod(player, c) || 0;
// 8*14*.6=67.2->67, 8*14*.6->67, 4*14*.6=33.6->34  => 168
check('[loot] player loots the intercepted cargo for credits (168c)', looted === 168 && player.credits === 168);

// 5) a passing TRADER re-scoops into its hold instead of cashing out (role-aware scoop)
const T2 = { role: 'trader', credits: 0, cargo: {}, holdCap: 40 };
const v = scoopPod(T2, { good: 'ore', qty: 8 });
check('[rescoop] another trader re-holds the salvage (cargo, not credits)', v === 0 && T2.cargo.ore === 8 && T2.credits === 0);

console.log('---');
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
console.log('RESULT: ' + (fail === 0 ? 'PASS' : 'FAIL'));
if (fail > 0) process.exit(1);
