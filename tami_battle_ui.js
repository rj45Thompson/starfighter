// tami_battle_ui.js -- window.TAMIBATTLEUI
// Pure HTML-string renderer for the Starfighter away-mission turn-based battle HUD, restyled to look
// like an actual Tami menu (real type/category icons + gradient HP bars + affliction chips) instead of
// the bare unicode-block debug dump. Plain <script src> compatible: no ES modules, no top-level await,
// no import/export keywords. ASCII ONLY in source (no smart quotes / em-dashes / unicode arrows in code).
//
// CONTRACT (must not drift -- read by the orchestrator's existing click-wiring in starfighter.html):
//   Technique buttons emit:  data-tech="<techId>"
//   Action buttons emit:     data-act="end" | data-act="retreat" | data-act="return"
// These are the exact attribute names/values drawBattleUI() already emits in starfighter.html
// (see: `<button data-tech="${tk}" ...>`, `<button data-act="end" ...>`, `data-act="retreat"`,
// `data-act="return"`). The host queries `button[data-tech]` and `button[data-act]` and attaches
// .onclick itself -- this module never touches the DOM, never attaches a handler, never mutates
// any input it is given. render() is a pure function: same inputs -> same HTML string, no side effects.
//
// 'use strict' IIFE so it is safe as a plain global-scope <script src="tami_battle_ui.js"> tag AND
// runnable directly via `node tami_battle_ui.js` (guards `window`/`document` before touching them).
(function(){
  'use strict';

  // ============================== CONFIG (named constants, no magic numbers in logic below) ==============================
  var ICON_BASE = 'assets/tami_icons/';

  // Explicit hardcoded type-name -> icon-filename table. Deliberately NOT derived by string transform --
  // 4 of the 18 real Tami type names do not match their icon file's naming convention 1:1, and a clever
  // "guess the transform" approach would silently produce a 404 for exactly those 4. Every name listed by
  // hand, including the 14 that DO follow the '<Name>_Type.PNG' pattern, so this table is a single source
  // of truth that can be audited line-by-line against the file listing.
  var TYPE_ICON_MAP = {
    'Hydro':      'Hydro_Type.PNG',
    'Pyro':       'Pyro_Type.PNG',
    'Botanical':  'Botanical_Type.PNG',
    'Ionic':      'Ion_Type.PNG',        // EXCEPTION: not Ionic_Type.PNG
    'Avian':      'Avion_Type.PNG',      // EXCEPTION: not Avian_Type.PNG
    'Mineral':    'Mineral_Type.PNG',
    'Wind':       'Wind_Type.PNG',
    'Toxin':      'Toxin_Type.PNG',
    'Bug':        'Bug_Type.PNG',
    'Martial':    'Martial_Type.PNG',
    'Umbral':     'Umbral_Type.PNG',
    'Mystic':     'Mystic_Type.PNG',
    'Celestial':  'Celestial_Type.PNG',
    'Draconic':   'Draconic_type.PNG',   // EXCEPTION: lowercase "_type.PNG"
    'Sonic':      'Sound_Type.PNG',      // EXCEPTION: not Sonic_Type.PNG
    'Ice':        'Ice_Type.PNG',
    'Beast':      'Beast_Type.PNG',
    'Artificial': 'Artificial_Type.PNG'
  };

  // Technique/strike category -> icon filename. 'P'=Physical, 'M'=Magical, 'H'=Healing; anything else
  // (unknown/'special'/undefined/etc.) falls back to Misc so the caller never has to special-case it.
  var CATEGORY_ICON_MAP = {
    'P': 'Physical_AatackType.PNG',   // typo "AAtack" preserved verbatim -- must match the file on disk
    'M': 'Magical_AttackType.PNG',
    'H': 'Healing_AttackType.PNG'
  };
  var CATEGORY_ICON_FALLBACK = 'Misc_AttackType.PNG';

  // Palette -- matches the game's existing dark-navy/cyan look (sampled from starfighter.html's own
  // drawBattleUI/drawCoreUI inline styles: #46d6ff ally, #ff5a6e foe, #8fd0ff header, #7fdc8a good,
  // #ff8a8a/#ff6a6a bad, #ffcf52/#ffd27a warn, #22344c/#2a3f5c borders, rgba(6,11,20,.82) panel bg).
  var COLOR = {
    panelBg:      'rgba(6,11,20,.90)',
    panelBorder:  '#22344a',
    cardBg:       '#0a1420',
    cardBorder:   '#22344a',
    header:       '#8fd0ff',
    allyAccent:   '#46d6ff',
    foeAccent:    '#ff5a6e',
    good:         '#7fdc8a',
    bad:          '#ff8a8a',
    badStrong:    '#ff6a6a',
    warn:         '#ffd27a',
    warnStrong:   '#ffcf52',
    textDim:      '#9fb3cc',
    textDimmer:   '#5a6a80',
    text:         '#cfe2f5',
    hpGreen1:     '#3fae55', 'hpGreen2': '#7fdc8a',
    hpAmber1:     '#b3852a', 'hpAmber2': '#ffd27a',
    hpRed1:       '#a53a44', 'hpRed2':   '#ff5a6e',
    techArmedBorder: '#9fe6ff',
    techArmedBg:  '#173049',
    techOffBorder:'#2a3f5c',
    techOffBg:    '#0e1a2a',
    dangerBorder: '#5c2a2a',
    dangerBg:     '#1a1216',
    dangerArmedBorder: '#ff9a9a',
    dangerArmedBg: '#3a1414',
    winBorder:    '#2f6a4a',
    winBg:        '#13251b',
    winText:      '#9fe6b0',
    loseBorder:   '#6a2f2f',
    loseBg:       '#251313',
    loseText:     '#ffb3b3'
  };

  var HP_BAR_WIDTH_PX = 120;
  var HP_HIGH_THRESHOLD = 0.60;   // >60% -> green
  var HP_MID_THRESHOLD  = 0.30;   // 30-60% -> amber; below -> red
  var LOG_MAX_LINES = 6;          // matches drawCoreUI's `.slice(-6)`

  // ============================== small safe helpers ==============================
  function esc(s){
    // Minimal HTML-escape for any string interpolated into markup (unit/tech names come from data files,
    // never trust them blindly even in a single-player local game).
    if(s===null || s===undefined) return '';
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function clamp01(n){ if(!isFinite(n)) return 0; return n<0?0:(n>1?1:n); }

  function stripNumericSuffix(name){
    // "Warden_2" / "Warden 2" / "Warden2" -> "Warden", so a unit instance name can still resolve to its
    // base species entry in tami_data.json. Only strips a TRAILING numeric suffix, never mid-string.
    return String(name||'').replace(/[\s_]*\d+$/,'');
  }

  function findSpeciesByName(name, speciesList){
    if(!name || !speciesList || !speciesList.length) return null;
    var target = stripNumericSuffix(name).trim().toLowerCase();
    if(!target) return null;
    for(var i=0;i<speciesList.length;i++){
      var sp = speciesList[i];
      if(sp && typeof sp.name === 'string' && sp.name.trim().toLowerCase() === target) return sp;
    }
    return null;
  }

  // ============================== public: icon resolvers ==============================
  function iconFor(typeName){
    if(!typeName) return null;
    var file = TYPE_ICON_MAP[typeName];
    if(!file) return null;
    return ICON_BASE + file;
  }

  function categoryIconFor(category){
    var file = CATEGORY_ICON_MAP[category] || CATEGORY_ICON_FALLBACK;
    return ICON_BASE + file;
  }

  // ============================== HP bar ==============================
  function hpBar(hp, maxhp){
    var ratio = clamp01(maxhp>0 ? (hp/maxhp) : 0);
    var pct = Math.round(ratio*100);
    var grad;
    if(ratio > HP_HIGH_THRESHOLD)      grad = 'linear-gradient(90deg,'+COLOR.hpGreen1+','+COLOR.hpGreen2+')';
    else if(ratio > HP_MID_THRESHOLD)  grad = 'linear-gradient(90deg,'+COLOR.hpAmber1+','+COLOR.hpAmber2+')';
    else                                grad = 'linear-gradient(90deg,'+COLOR.hpRed1+','+COLOR.hpRed2+')';
    return '<div style="position:relative;width:'+HP_BAR_WIDTH_PX+'px;height:10px;border-radius:5px;'+
      'background:#101c2c;border:1px solid #182740;overflow:hidden">'+
      '<div style="position:absolute;left:0;top:0;bottom:0;width:'+pct+'%;background:'+grad+'"></div>'+
      '</div>';
  }

  // ============================== affliction chips ==============================
  function afflictionChips(aff){
    if(!aff) return '';
    var out = [];
    for(var key in aff){
      if(!Object.prototype.hasOwnProperty.call(aff,key)) continue;
      var turns = aff[key];
      if(!(turns>0)) continue;
      out.push('<span style="display:inline-block;margin:0 3px 2px 0;padding:1px 6px;border-radius:9px;'+
        'background:rgba(255,210,122,.14);border:1px solid rgba(255,210,122,.4);color:'+COLOR.warn+';'+
        'font-size:11px;line-height:15px;white-space:nowrap">'+esc(key)+' <b>'+esc(turns)+'</b></span>');
    }
    return out.join('');
  }

  // ============================== type icon(s) for a unit, via species lookup ==============================
  function unitTypeIconsHtml(unit, tamiData){
    // Resolve the unit's species by case-insensitive name match (numeric-suffix-stripped) against
    // tami_data.json species[].name. If no match (or no tamiData at all), render nothing -- never
    // speculate an <img> tag that might 404.
    var species = null;
    try{
      var lookupName = unit && (unit.speciesName || unit.name);
      var list = tamiData && tamiData.species;
      species = findSpeciesByName(lookupName, list);
    }catch(e){ species = null; }
    if(!species || !species.types || !species.types.length) return '';
    var out = [];
    for(var i=0;i<species.types.length;i++){
      var url = iconFor(species.types[i]);
      if(!url) continue;
      out.push('<img src="'+esc(url)+'" alt="'+esc(species.types[i])+'" title="'+esc(species.types[i])+'" '+
        'style="width:16px;height:16px;vertical-align:middle;margin-right:3px;object-fit:contain">');
    }
    return out.join('');
  }

  // ============================== unit card ==============================
  function unitCard(unit, isCurrent){
    var dead = !unit.alive;
    var accent = unit.side==='ally' ? COLOR.allyAccent : COLOR.foeAccent;
    var typeIcons = unitTypeIconsHtml(unit, unitCard._tamiData);
    var chips = afflictionChips(unit.aff);
    var marker = isCurrent ? '<span style="color:'+accent+'">&#9654;</span>' : '<span style="opacity:0">&#9654;</span>';
    return '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;margin:3px 0;'+
      'border-radius:7px;background:'+COLOR.cardBg+';border:1px solid '+COLOR.cardBorder+';'+
      'border-left:3px solid '+accent+';opacity:'+(dead?0.38:1)+'">'+
      '<div style="min-width:14px;text-align:center">'+marker+'</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+
          typeIcons+
          '<span style="color:'+COLOR.text+';font-weight:bold">'+esc(unit.name)+'</span>'+
          (dead?'<span style="color:'+COLOR.textDimmer+';font-size:11px;margin-left:4px">DOWN</span>':'')+
        '</div>'+
        '<div style="display:flex;align-items:center;gap:6px;margin-top:2px">'+
          hpBar(unit.hp, unit.maxhp)+
          '<span style="color:'+COLOR.textDim+';font-size:11px;white-space:nowrap">'+esc(unit.hp)+'/'+esc(unit.maxhp)+'</span>'+
        '</div>'+
        (chips?('<div style="margin-top:2px">'+chips+'</div>'):'')+
      '</div>'+
    '</div>';
  }

  // ============================== technique card / button ==============================
  // Emits the SAME data-tech attribute name/value the host's drawBattleUI() emits, so the orchestrator's
  // existing `ui.querySelectorAll('button[data-tech]').forEach(b=>b.onclick=...)` wiring keeps working
  // untouched. Everything else (inner layout) is free to restyle.
  function techButton(techId, info, isArmed, cooldown){
    var disabled = !!cooldown;
    var borderCol = isArmed ? COLOR.techArmedBorder : COLOR.techOffBorder;
    var bgCol = isArmed ? COLOR.techArmedBg : COLOR.techOffBg;
    var textCol = disabled ? COLOR.textDimmer : COLOR.text;
    var typeIconUrl = info && info.el ? iconFor(info.el) : null;
    var catIconUrl = categoryIconFor(info && info.kind);
    var rangeTxt = (info && info.range!==undefined && info.range!==null) ? esc(info.range) : '?';
    var apTxt = (info && (info.apCost!==undefined && info.apCost!==null)) ? (' &middot; AP '+esc(info.apCost)) : '';
    var cdTxt = disabled ? (' &middot; CD '+esc(cooldown)) : '';
    var iconsHtml = '';
    if(typeIconUrl) iconsHtml += '<img src="'+esc(typeIconUrl)+'" alt="" style="width:14px;height:14px;vertical-align:middle;margin-right:2px;object-fit:contain">';
    if(catIconUrl)  iconsHtml += '<img src="'+esc(catIconUrl)+'" alt="" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;object-fit:contain">';
    var name = (info && info.name) ? info.name : techId;
    return '<button data-tech="'+esc(techId)+'" '+(disabled?'disabled':'')+' style="pointer-events:auto;'+
      'display:inline-flex;align-items:center;gap:4px;margin:3px;padding:6px 9px;border-radius:7px;'+
      'border:1px solid '+borderCol+';background:'+bgCol+';color:'+textCol+';font:inherit;'+
      'cursor:'+(disabled?'default':'pointer')+'">'+
      iconsHtml+
      '<span>'+esc(name)+'</span>'+
      '<span style="opacity:.6;font-size:11px">r'+rangeTxt+apTxt+cdTxt+'</span>'+
    '</button>';
  }

  // ============================== action button (End turn / Retreat / Return) ==============================
  // Emits the SAME data-act attribute name/value the host emits ("end" | "retreat" | "return").
  function actButton(act, label, armed){
    var borderCol, bgCol, textCol;
    if(act==='retreat'){
      borderCol = armed ? COLOR.dangerArmedBorder : COLOR.dangerBorder;
      bgCol     = armed ? COLOR.dangerArmedBg     : COLOR.dangerBg;
      textCol   = COLOR.bad;
    } else if(act==='return'){
      // caller decides win/lose styling via the label's context; keep this a plain neutral fallback.
      borderCol = COLOR.dangerBorder; bgCol = COLOR.dangerBg; textCol = COLOR.bad;
    } else {
      borderCol = COLOR.techOffBorder; bgCol = COLOR.dangerBg; textCol = COLOR.bad;
    }
    return '<button data-act="'+esc(act)+'" style="pointer-events:auto;margin:3px;padding:6px 9px;'+
      'border-radius:7px;border:1px solid '+borderCol+';background:'+bgCol+';color:'+textCol+';'+
      'font:inherit;cursor:pointer">'+esc(label)+'</button>';
  }

  function returnButton(label, win){
    var borderCol = win ? COLOR.winBorder : COLOR.loseBorder;
    var bgCol     = win ? COLOR.winBg     : COLOR.loseBg;
    var textCol   = win ? COLOR.winText   : COLOR.loseText;
    return '<button data-act="return" style="pointer-events:auto;margin:6px;padding:7px 12px;'+
      'border-radius:8px;border:1px solid '+borderCol+';background:'+bgCol+';color:'+textCol+';'+
      'font:inherit;cursor:pointer">'+esc(label)+'</button>';
  }

  // ============================== main render() ==============================
  // render(units, cur, bstate, selTech, TECHS, blog, retreatArmed, opts) -> HTML string. PURE: no DOM
  // access, no mutation of any argument, no globals read besides this module's own CONFIG constants
  // above and (optionally) opts.tamiData passed in by the caller.
  function render(units, cur, bstate, selTech, TECHS, blog, retreatArmed, opts){
    units = units || [];
    TECHS = TECHS || {};
    blog = blog || [];
    opts = opts || {};
    var tamiData = opts.tamiData || null;
    unitCard._tamiData = tamiData;   // stashed only for the duration of this synchronous call; render() itself stays pure w.r.t. its arguments

    // ---- unit cards ----
    var cardsHtml = '';
    for(var i=0;i<units.length;i++){
      cardsHtml += unitCard(units[i], units[i]===cur);
    }

    // ---- control area (mirrors drawBattleUI's bstate switch exactly) ----
    var ctrl = '';
    if(bstate==='player' && cur){
      var techsList = cur.techs || [];
      var techBtns = '';
      for(var t=0;t<techsList.length;t++){
        var tk = techsList[t];
        var info = TECHS[tk] || {};
        var cd = (cur.cd && cur.cd[tk]) || 0;
        var armed = (selTech===tk);
        techBtns += techButton(tk, info, armed, cd);
      }
      // preserves the original "click a green tile to move first" hint (opts.moved / opts.moveWord let both the
      // legacy grid-move battle and the core no-move-hint battle reuse this same renderer honestly)
      var moveHint = opts.moved===false ? ('<span style="opacity:.7">click a green tile to MOVE, then</span> ') : '';
      ctrl += '<div style="margin-top:8px;color:'+COLOR.textDim+';font-size:12px">'+moveHint+'pick a technique:</div>'+
        '<div style="display:flex;flex-wrap:wrap">'+techBtns+'</div>'+
        actButton('end','End turn',false)+
        actButton('retreat', retreatArmed?'Confirm retreat?':'Retreat', retreatArmed);
      if(selTech && TECHS[selTech]){
        var selInfo = TECHS[selTech];
        var wantAlly = selInfo.kind==='heal';
        ctrl += '<div style="margin-top:4px;color:'+COLOR.techArmedBorder+';font-size:12px">'+
          esc(selInfo.name)+' armed - click a '+(wantAlly?'ally':'foe')+' in range ('+esc(selInfo.range)+').</div>';
      }
    } else if(bstate==='win'){
      ctrl = '<div style="margin-top:8px;color:'+COLOR.good+';font-size:16px">VICTORY - the away team prevails.</div>'+
        returnButton('Back to the surface', true);
    } else if(bstate==='lose'){
      ctrl = '<div style="margin-top:8px;color:'+COLOR.badStrong+';font-size:16px">DEFEAT - you retreat to your ship.</div>'+
        returnButton('Retreat', false);
    } else {
      var waitName = cur ? esc(cur.name) : '';
      var waitTxt = bstate==='ai' ? ' (enemy) is acting...' : '...';
      ctrl = '<div style="margin-top:6px;opacity:.7">'+waitName+waitTxt+'</div>';
    }

    // ---- log strip (trailing lines only, matches LOG_MAX_LINES) ----
    var logLines = blog.slice(Math.max(0, blog.length-LOG_MAX_LINES));
    var logHtml = '';
    for(var l=0;l<logLines.length;l++){
      logHtml += '&middot; '+esc(logLines[l])+(l<logLines.length-1?'<br>':'');
    }

    var html =
      '<div style="position:absolute;top:12px;left:12px;right:12px;max-width:440px;'+
      'background:'+COLOR.panelBg+';border:1px solid '+COLOR.panelBorder+';border-radius:10px;padding:10px 12px">'+
        '<div style="color:'+COLOR.header+';font-weight:bold;margin-bottom:6px">TURN-BASED BATTLE '+
          '<span style="opacity:.5;font-weight:normal"> - a Tami-style away-team fight</span></div>'+
        cardsHtml+
        ctrl+
      '</div>'+
      '<div style="position:absolute;bottom:12px;left:12px;right:12px;color:'+COLOR.textDim+'">'+logHtml+'</div>';

    unitCard._tamiData = null;
    return html;
  }

  // ============================== export ==============================
  var TAMIBATTLEUI = {
    render: render,
    iconFor: iconFor,
    categoryIconFor: categoryIconFor
  };

  if(typeof window !== 'undefined'){
    window.TAMIBATTLEUI = TAMIBATTLEUI;
  }
  if(typeof module !== 'undefined' && module.exports){
    module.exports = TAMIBATTLEUI;
  }

  // ============================== inline self-test (only runs under `node tami_battle_ui.js`) ==============================
  // Guarded so a plain <script src> include never runs this (browsers have no `require`/`module` in
  // this file's own scope acting as the entry point check -- we specifically check for the Node-only
  // `require.main === module` pattern via a safe existence check).
  var isNodeMain = false;
  try{
    isNodeMain = (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module);
  }catch(e){ isNodeMain = false; }

  if(isNodeMain){
    (function selfTest(){
      var pass = 0, fail = 0;
      function check(label, cond){
        if(cond){ pass++; console.log('PASS - '+label); }
        else { fail++; console.log('FAIL - '+label); }
      }
      function checkNoThrow(label, fn){
        try{ fn(); check(label, true); }
        catch(e){ fail++; console.log('FAIL - '+label+' (threw: '+e.message+')'); }
      }

      console.log('=== TAMIBATTIEUI self-test ===');

      // ---- fake data ----
      var fakeTamiData = {
        types: ['Hydro','Pyro','Botanical','Ionic','Avian','Mineral','Wind','Toxin','Bug','Martial',
                'Umbral','Mystic','Celestial','Draconic','Sonic','Ice','Beast','Artificial'],
        species: [
          { name: 'Warden', types: ['Martial'] },
          { name: 'Ranger', types: ['Ionic','Wind'] }
        ]
      };

      var units = [
        { name: 'Warden_2', side: 'ally', hp: 40, maxhp: 56, alive: true, aff: {} },                 // resolvable species (numeric suffix stripped, case-insens)
        { name: 'Mystery Blob', side: 'foe', hp: 20, maxhp: 40, alive: true, aff: { Poison: 2 } },    // unresolvable species + has an affliction
        { name: 'Ranger', side: 'ally', hp: 44, maxhp: 44, alive: true, aff: {} },                    // exact-case resolvable species
        { name: 'Fallen One', side: 'foe', hp: 0, maxhp: 30, alive: false, aff: {} }                  // dead unit
      ];

      var TECHS = {
        strike: { name: 'Strike', kind: 'phys', range: 1, el: 'Martial', apCost: 2 },
        mend:   { name: 'Mend',   kind: 'heal', range: 2, apCost: 3 },
        bolt:   { name: 'Ion Bolt', kind: 'special', range: 4, el: 'Ionic' }
      };
      units[0].techs = ['strike','mend'];
      units[0].cd = { mend: 1 };
      units[2].techs = ['bolt'];
      units[2].cd = {};

      var blog = ['The battle begins!', 'Warden attacks.', 'Ranger uses Ion Bolt.'];

      // ---- render() across every bstate, must not throw and must contain the right attributes ----
      checkNoThrow('render(bstate=player) does not throw', function(){
        var html = TAMIBATTLEUI.render(units, units[0], 'player', 'strike', TECHS, blog, false, { tamiData: fakeTamiData });
        check('render(player) is a string', typeof html === 'string' && html.length > 0);
        check('render(player) emits data-tech="strike"', html.indexOf('data-tech="strike"') !== -1);
        check('render(player) emits data-tech="mend"', html.indexOf('data-tech="mend"') !== -1);
        check('render(player) emits data-act="end"', html.indexOf('data-act="end"') !== -1);
        check('render(player) emits data-act="retreat"', html.indexOf('data-act="retreat"') !== -1);
        check('render(player) mend button is disabled (cooldown)', /data-tech="mend"[^>]*disabled/.test(html));
        check('render(player) includes an affliction chip for Poison', html.indexOf('Poison') !== -1);
        check('render(player) includes a resolvable species type icon (Martial_Type.PNG)', html.indexOf('Martial_Type.PNG') !== -1);
        check('render(player) never emits a broken speculative img for Mystery Blob', html.indexOf('undefined.PNG') === -1);
      });

      checkNoThrow('render(bstate=win) does not throw', function(){
        var html = TAMIBATTLEUI.render(units, null, 'win', null, TECHS, blog, false, {});
        check('render(win) emits data-act="return"', html.indexOf('data-act="return"') !== -1);
        check('render(win) mentions VICTORY', html.indexOf('VICTORY') !== -1);
      });

      checkNoThrow('render(bstate=lose) does not throw', function(){
        var html = TAMIBATTLEUI.render(units, null, 'lose', null, TECHS, blog, false, {});
        check('render(lose) emits data-act="return"', html.indexOf('data-act="return"') !== -1);
        check('render(lose) mentions DEFEAT', html.indexOf('DEFEAT') !== -1);
      });

      checkNoThrow('render(bstate=ai) does not throw', function(){
        var html = TAMIBATTLEUI.render(units, units[1], 'ai', null, TECHS, blog, false, {});
        check('render(ai) is a non-empty string', typeof html === 'string' && html.length > 0);
      });

      checkNoThrow('render(bstate=ai) with retreatArmed=true does not throw', function(){
        var html = TAMIBATTLEUI.render(units, units[0], 'player', null, TECHS, blog, true, {});
        check('render(retreatArmed) shows Confirm retreat?', html.indexOf('Confirm retreat?') !== -1);
      });

      checkNoThrow('render() with empty units/TECHS/blog does not throw', function(){
        var html = TAMIBATTLEUI.render([], null, 'wait', null, {}, [], false, {});
        check('render(empty) is a string', typeof html === 'string');
      });

      // ---- pureness spot-check: same inputs -> identical output ----
      checkNoThrow('render() is deterministic for identical inputs', function(){
        var a = TAMIBATTLEUI.render(units, units[0], 'player', 'strike', TECHS, blog, false, { tamiData: fakeTamiData });
        var b = TAMIBATTLEUI.render(units, units[0], 'player', 'strike', TECHS, blog, false, { tamiData: fakeTamiData });
        check('render() output identical across two calls with same args', a === b);
      });

      // ---- iconFor() across all 18 real type names, including the 4 named exceptions ----
      var ALL_TYPES = ['Hydro','Pyro','Botanical','Ionic','Avian','Mineral','Wind','Toxin','Bug','Martial',
                        'Umbral','Mystic','Celestial','Draconic','Sonic','Ice','Beast','Artificial'];
      for(var ti=0; ti<ALL_TYPES.length; ti++){
        (function(typeName){
          checkNoThrow('iconFor("'+typeName+'") does not throw', function(){
            var url = TAMIBATTLEUI.iconFor(typeName);
            check('iconFor("'+typeName+'") returns a non-null string prefixed assets/tami_icons/',
              typeof url === 'string' && url.indexOf('assets/tami_icons/') === 0);
          });
        })(ALL_TYPES[ti]);
      }

      // exception assertions (exact filename match required)
      check('iconFor("Ionic") ends in Ion_Type.PNG', /Ion_Type\.PNG$/.test(TAMIBATTLEUI.iconFor('Ionic')||''));
      check('iconFor("Avian") ends in Avion_Type.PNG', /Avion_Type\.PNG$/.test(TAMIBATTLEUI.iconFor('Avian')||''));
      check('iconFor("Sonic") ends in Sound_Type.PNG', /Sound_Type\.PNG$/.test(TAMIBATTLEUI.iconFor('Sonic')||''));
      check('iconFor("Draconic") ends in Draconic_type.PNG', /Draconic_type\.PNG$/.test(TAMIBATTLEUI.iconFor('Draconic')||''));

      // non-exception spot checks (direct '<Name>_Type.PNG' pattern)
      check('iconFor("Hydro") ends in Hydro_Type.PNG', /Hydro_Type\.PNG$/.test(TAMIBATTLEUI.iconFor('Hydro')||''));
      check('iconFor("Mineral") ends in Mineral_Type.PNG', /Mineral_Type\.PNG$/.test(TAMIBATTLEUI.iconFor('Mineral')||''));

      // unknown type name -> null, never a speculative broken URL
      check('iconFor("NotARealType") returns null', TAMIBATTLEUI.iconFor('NotARealType') === null);
      check('iconFor(null) returns null', TAMIBATTLEUI.iconFor(null) === null);
      check('iconFor(undefined) returns null', TAMIBATTLEUI.iconFor(undefined) === null);

      // ---- categoryIconFor() across P/M/H/other ----
      checkNoThrow('categoryIconFor("P") does not throw', function(){
        check('categoryIconFor("P") ends in Physical_AatackType.PNG', /Physical_AatackType\.PNG$/.test(TAMIBATTLEUI.categoryIconFor('P')));
      });
      checkNoThrow('categoryIconFor("M") does not throw', function(){
        check('categoryIconFor("M") ends in Magical_AttackType.PNG', /Magical_AttackType\.PNG$/.test(TAMIBATTLEUI.categoryIconFor('M')));
      });
      checkNoThrow('categoryIconFor("H") does not throw', function(){
        check('categoryIconFor("H") ends in Healing_AttackType.PNG', /Healing_AttackType\.PNG$/.test(TAMIBATTLEUI.categoryIconFor('H')));
      });
      checkNoThrow('categoryIconFor("phys") (unrecognized) does not throw', function(){
        check('categoryIconFor("phys") falls back to Misc_AttackType.PNG', /Misc_AttackType\.PNG$/.test(TAMIBATTLEUI.categoryIconFor('phys')));
      });
      checkNoThrow('categoryIconFor(undefined) does not throw', function(){
        check('categoryIconFor(undefined) falls back to Misc_AttackType.PNG', /Misc_AttackType\.PNG$/.test(TAMIBATTLEUI.categoryIconFor(undefined)));
      });

      // ---- attempt to load the REAL tami_data.json if present alongside this file, as an extra honesty check ----
      // (best-effort only -- self-test must still pass standalone if the file is missing/relocated)
      try{
        var fs = require('fs');
        var path = require('path');
        var realDataPath = path.join(__dirname, 'tami_data.json');
        if(fs.existsSync(realDataPath)){
          var realData = JSON.parse(fs.readFileSync(realDataPath, 'utf8'));
          checkNoThrow('render() with REAL tami_data.json species does not throw', function(){
            var realUnits = [
              { name: (realData.species[0]||{}).name || 'Nobody', side: 'ally', hp: 10, maxhp: 20, alive: true, aff: {}, techs: [], cd: {} }
            ];
            var html = TAMIBATTLEUI.render(realUnits, realUnits[0], 'player', null, {}, [], false, { tamiData: realData });
            check('render() with real species data is a string', typeof html === 'string');
          });
          if(realData.types){
            checkNoThrow('every real tami_data.json type resolves via iconFor without throwing', function(){
              var allOk = true;
              for(var rt=0; rt<realData.types.length; rt++){
                var u = TAMIBATTLEUI.iconFor(realData.types[rt]);
                if(typeof u !== 'string'){ allOk = false; console.log('  (missing icon mapping for real type: '+realData.types[rt]+')'); }
              }
              check('all '+realData.types.length+' real tami_data.json types map to an icon URL', allOk);
            });
          }
        } else {
          console.log('(tami_data.json not found alongside this file -- skipping optional real-data cross-check)');
        }
      }catch(e){
        console.log('(optional real-data cross-check skipped: '+e.message+')');
      }

      console.log('=== '+pass+' PASS, '+fail+' FAIL ===');
      if(fail > 0){ process.exit(1); }
    })();
  }
})();
