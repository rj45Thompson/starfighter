// empire.js - the screen for the EGOSOFT layer: what you own and what it is doing. Reads ECONOMY.snapshot() and
// acts through ECONOMY's own methods, so this file holds no state and can never disagree with the simulation.
// Registered with PANELS like every other window (shared opacity / hide / dock), opened from the shell's EMPIRE tab.
(function () {
  'use strict';
  var CFG = { TICK_MS: 500, EDGE: 'right', RGB: [12, 20, 30], DEFAULT_OPACITY: 0.9 };
  var el = null, body = null, last = '', pick = null;   // pick: {hauler id} while assigning a route

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function E() { return window.ECONOMY; }
  function H() { return window.HOST; }
  function planetNames() { var h = H(); return ((h && h.planets) || []).filter(function (p) { return !p._base; }).map(function (p) { return p.name; }); }
  function goodList() { var h = H(); return (h && h.GOODS) || []; }

  function bar(frac, col) {
    var pct = Math.max(0, Math.min(100, frac * 100));
    return '<span class="epBar"><i style="width:' + pct.toFixed(0) + '%;background:' + col + '"></i></span>';
  }
  function stationRow(st) {
    var pays = st.margin != null;
    return '<div class="epRow">'
      + '<div class="epMain"><b>' + esc(st.planet) + '</b> <span class="epDim">' + esc(st.kind) + ' Lv' + st.lvl + '</span>'
      + '<div class="epSub">' + esc(st.insName.join(' + ')) + ' &rarr; <b>' + esc(st.outName) + '</b> · '
      + st.batch + ' a cycle, every ' + st.cycle + 's'
      + (pays ? ' · <span style="color:' + (st.margin > 0 ? '#5ee6a8' : '#ff8a8a') + '">' + (st.margin > 0 ? '+' : '') + st.margin + 'c a unit here now</span>' : '')
      + '</div>'
      + (st.stalled ? '<div class="epWarn">held: ' + esc(st.stalled) + '</div>' : bar(st.progress, '#5ee6a8'))
      + '<div class="epSub">made ' + st.made + ' · earned <b style="color:' + (st.earned >= 0 ? '#ffd479' : '#ff8a8a') + '">' + st.earned + 'c</b></div></div>'
      + '<div class="epAct">'
      + (st.upgradeCost != null ? '<button data-up="' + st.id + '">UPGRADE ' + st.upgradeCost + 'c</button>' : '<span class="epDim">max level</span>')
      + '<button data-sell-st="' + st.id + '">SELL</button></div></div>';
  }
  function haulerRow(h) {
    var route = h.from ? (esc(h.from) + ' &rarr; ' + esc(h.to) + ' · ' + esc(h.goodName)) : '<span class="epDim">no route</span>';
    var stateName = { toBuy: 'flying to load', buying: 'loading', toSell: 'flying to sell', selling: 'unloading', idle: 'idle' }[h.state] || h.state;
    return '<div class="epRow">'
      + '<div class="epMain"><b>' + esc(h.name) + '</b> <span class="epDim">' + esc(stateName) + '</span>'
      + '<div class="epSub">' + route + '</div>'
      + (h.state === 'toBuy' || h.state === 'toSell' ? bar(h.pos, '#8ff5ff') : '')
      + '<div class="epSub">' + h.runs + ' run' + (h.runs === 1 ? '' : 's') + ' · <b style="color:' + (h.profit >= 0 ? '#ffd479' : '#ff8a8a') + '">'
      + (h.profit >= 0 ? '+' : '') + h.profit + 'c</b>' + (h.note ? ' · ' + esc(h.note) : '') + '</div></div>'
      + '<div class="epAct"><button data-route="' + h.id + '">ROUTE</button><button data-sell-h="' + h.id + '">SELL</button></div></div>';
  }
  function routeForm(h) {
    var names = planetNames(), gs = goodList();
    var opt = function (list, sel, val, label) {
      return '<select data-' + val + '>' + list.map(function (x) {
        var v = label ? x.k : x, t = label ? x.n : x;
        return '<option value="' + esc(v) + '"' + (sel === v ? ' selected' : '') + '>' + esc(t) + '</option>';
      }).join('') + '</select>';
    };
    return '<div class="epForm"><div class="epSub">route for <b>' + esc(h.name) + '</b>: buy at, sell at, carrying</div>'
      + opt(names, h.from, 'from') + opt(names, h.to, 'to') + opt(gs, h.good, 'good', true)
      + '<button data-assign="' + h.id + '">ASSIGN</button><button data-cancel="1">cancel</button></div>';
  }

  function render() {
    if (!body) return;
    var e = E(); if (!e) { body.innerHTML = '<div class="epPad epDim">economy module not loaded</div>'; return; }
    var s = e.snapshot();
    var key = JSON.stringify([s.stations.map(function (x) { return [x.planet, x.lvl, x.made, x.earned, x.stalled, Math.round(x.progress * 20), x.margin]; }),
      s.haulers.map(function (x) { return [x.name, x.state, x.runs, x.profit, x.note, Math.round(x.pos * 20)]; }), pick]);
    if (key === last) return; last = key;
    var h = H(), credits = h && h.P ? Math.round(h.P.credits || 0) : 0;
    var pickH = pick ? e.haulerById(pick) : null;
    body.innerHTML = '<div class="epPad">'
      + '<div class="epHead"><b>EMPIRE</b><span>' + s.totals.stations + ' station' + (s.totals.stations === 1 ? '' : 's') + ' · '
      + s.totals.haulers + ' hauler' + (s.totals.haulers === 1 ? '' : 's') + ' · net <b style="color:'
      + (s.totals.earned >= 0 ? '#ffd479' : '#ff8a8a') + '">' + (s.totals.earned >= 0 ? '+' : '') + s.totals.earned + 'c</b></span></div>'
      + '<h5>STATIONS</h5>'
      + (s.stations.length ? s.stations.map(stationRow).join('')
        : '<div class="epSub">None. Dock at a world and use <b>station build</b> - the chain is chosen from what that world makes, needs and charges.</div>')
      + '<h5>HAULERS</h5>'
      + (s.haulers.length ? s.haulers.map(haulerRow).join('') : '<div class="epSub">None yet.</div>')
      + (pickH ? routeForm(pickH) : '')
      + '<div class="epBuy"><button data-buy-h="1">BUY A HAULER · ' + e.CFG.HAULER_COST + 'c</button>'
      + '<span class="epDim">you hold ' + credits + 'c</span></div>'
      + (s.log.length ? '<h5>LOG</h5>' + s.log.map(function (l) { return '<div class="epLog">' + esc(l.text) + '</div>'; }).join('') : '')
      + '</div>';
  }

  function onClick(ev) {
    var e = E(); if (!e) return;
    var t = ev.target, b = t.closest ? t.closest('button') : null;
    if (!b) return;
    var r = null;
    if (b.dataset.up) r = e.upgradeStation(e.stationById(+b.dataset.up));
    else if (b.dataset.sellSt) r = e.sellStation(e.stationById(+b.dataset.sellSt));
    else if (b.dataset.sellH) r = e.sellHauler(e.haulerById(+b.dataset.sellH));
    else if (b.dataset.buyH) r = e.buyHauler();
    else if (b.dataset.route) { pick = (pick === +b.dataset.route) ? null : +b.dataset.route; }
    else if (b.dataset.cancel) { pick = null; }
    else if (b.dataset.assign) {
      var box = b.parentNode;
      r = e.assign(e.haulerById(+b.dataset.assign), box.querySelector('[data-from]').value,
        box.querySelector('[data-to]').value, box.querySelector('[data-good]').value);
      if (r && r.ok) pick = null;
    }
    if (r && !r.ok && window.HOST && HOST.term) HOST.term('&#9670; ' + r.msg, 'err');
    last = ''; render();
  }

  function init() {
    if (el) return;
    el = document.createElement('div'); el.id = 'empire'; el.innerHTML = '<div id="empireBody"></div>';
    document.body.appendChild(el); body = el.firstChild;
    var st = document.createElement('style'); st.textContent = ''
      + '#empire{ position:fixed; right:14px; top:96px; width:330px; max-height:70vh; overflow:auto; z-index:8;'
      + '  border:1px solid #22344a; border-radius:9px; font:12px/1.4 "Segoe UI",system-ui,sans-serif; color:#dbe7f1; }'
      + '#empire .epPad{ padding:9px 11px 12px; }'
      + '#empire .epHead{ display:flex; justify-content:space-between; align-items:baseline; gap:8px; border-bottom:1px solid #22344a; padding-bottom:5px; }'
      + '#empire .epHead b{ letter-spacing:.12em; color:#9fd8ff; } #empire .epHead span{ font-size:11px; opacity:.75; }'
      + '#empire h5{ margin:9px 0 4px; font-size:10px; letter-spacing:.1em; color:#9fd8ff; font-weight:600; }'
      + '#empire .epRow{ display:flex; gap:8px; align-items:flex-start; padding:5px 0; border-bottom:1px solid rgba(160,220,255,.10); }'
      + '#empire .epMain{ flex:1 1 auto; min-width:0; } #empire .epAct{ display:flex; flex-direction:column; gap:3px; }'
      + '#empire .epSub{ font-size:10px; opacity:.72; margin-top:2px; } #empire .epDim{ opacity:.55; }'
      + '#empire .epWarn{ font-size:10px; color:#ffb074; margin-top:2px; }'
      + '#empire .epBar{ display:block; height:4px; border-radius:2px; background:rgba(160,220,255,.16); margin-top:4px; overflow:hidden; }'
      + '#empire .epBar i{ display:block; height:100%; }'
      + '#empire button{ background:#16273a; color:#9fd8ff; border:1px solid #2b4560; border-radius:4px; padding:3px 7px; font:inherit; font-size:10px; cursor:pointer; white-space:nowrap; }'
      + '#empire button:hover{ background:#1d3450; }'
      + '#empire .epForm{ display:flex; flex-wrap:wrap; gap:4px; align-items:center; border:1px solid #2b4560; border-radius:6px; padding:6px; margin-top:6px; }'
      + '#empire .epForm .epSub{ width:100%; margin:0 0 3px; }'
      + '#empire select{ background:#0d1826; color:#dbe7f1; border:1px solid #2b4560; border-radius:4px; font:inherit; font-size:10px; padding:2px; max-width:96px; }'
      + '#empire .epBuy{ display:flex; align-items:center; gap:8px; margin-top:8px; }'
      + '#empire .epLog{ font-size:10px; opacity:.62; padding:1px 0; }';
    document.head.appendChild(st);
    el.addEventListener('click', onClick);
    if (window.PANELS && PANELS.register) PANELS.register('empire', el, { title: 'EMPIRE', edge: CFG.EDGE, rgb: CFG.RGB, defaultOpacity: CFG.DEFAULT_OPACITY, defaultOpen: false });
    setInterval(render, CFG.TICK_MS); render();
  }
  window.EMPIRE = { init: init, refresh: function () { last = ''; render(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
