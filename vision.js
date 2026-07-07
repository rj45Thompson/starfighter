// vision.js — THE ARC3 EYE ON THE SPACE LEVEL + FOG OF WAR. Per the user (2026-07-07): "let the creativity center
// access the space level data — they should SEE it; look at the arc3 work (same repo family): use that so the agi
// can SEE. And give it fog of war on its vision of the tree until he moves position."
//
// PORTED FROM arc3_unified_v2.py / arc3_perception (D:/code/arcWelderPro/state/): the agent sees a GRID of OPAQUE
// colour codes (never labeled types), segments it into connected-component OBJECTS {code,size,bbox,centroid}, and
// groups them by SAMENESS (code + size-class) — the arc3 SEE+SORT prior ("go toward things that look the same").
// Nothing is handed: what code 3 MEANS is learnable only by acting on it (discover_vec already learns type-blind
// values; this gives that machinery a spatial retina).
//
// FOG OF WAR (the user's rule — vision is positional):
//   • UNKNOWN  — never seen: the agent's view literally contains no value (structural, not cosmetic).
//   • LIVE     — within senseR of the CURRENT position: true current values.
//   • STALE    — seen before, not currently in range: the LAST-SEEN value is remembered (may be wrong now — honest
//                memory, exactly like INH's decaying world model). Moving is the only way to refresh.
//   The world's truth lives INSIDE this module (blackbox_env.py structure: privileged snapshot in, narrow fogged
//   channel out). Agents can only call view()/see()/describe() — there is no handle to the unfogged world.
// WHO LOOKS THROUGH IT: ORION (the Inhabitant) and the player's Passenger each get their own retina (factory —
// separate fog per mind). The creativity/goal machinery reads see(): same-group salience (arc3 SORT) + FRONTIER
// cells (edge of the fog = curiosity goals). The worm's describe() is grounded in see() stats only.
'use strict';
(function(){
const VCFG = {
  GRID: 48,                 // retina resolution (GRID x GRID over the arena square)
  UNKNOWN: -1,              // fog value: absence of knowledge, not a colour
  SIZE_CLASSES: [2, 6, 18], // object size buckets for sameness (<=2 small, <=6 mid, <=18 big, else huge)
  MAX_OBJECTS: 96,          // segmentation cap per look (perf guard)
  FRONTIER_MAX: 24,         // frontier goal candidates returned
};

function create(opts){
  // opts: { arenaR:number, entities:()=>[{x,z,code}], pos:()=>({x,z}), senseR:()=>number, name?:string }
  const G=VCFG.GRID, N=G*G;
  const cells=new Int16Array(N).fill(VCFG.UNKNOWN);   // the agent's remembered map (STALE memory lives here)
  const liveMask=new Uint8Array(N);                   // 1 = currently in senseR (LIVE), else stale/unknown
  const seenT=new Float64Array(N);                    // last reveal tick (staleness bookkeeping)
  let ticks=0, revealedCount=0;
  const R=Math.max(1,opts.arenaR||600);
  const w2g=v=>Math.max(0,Math.min(G-1,Math.floor((v+R)/(2*R)*G)));   // world coord -> grid index
  const g2w=i=>((i+0.5)/G)*2*R-R;                                      // grid index -> world coord (cell centre)

  function tick(){
    ticks++;
    const p=opts.pos(); if(!p) return;
    const sr=Math.max(1,opts.senseR?opts.senseR():60);
    const es=opts.entities()||[];
    // 1. rasterize the PRIVILEGED snapshot (module-internal only — never exposed raw)
    const frame=new Int16Array(N);                    // 0 = empty space
    for(const e of es){ const gx=w2g(e.x), gz=w2g(e.z); frame[gz*G+gx]=e.code|0; }
    // 2. reveal the senseR disc around the CURRENT position — fog of war: move to see more
    liveMask.fill(0);
    const cgx=w2g(p.x), cgz=w2g(p.z), cr=Math.ceil(sr/(2*R)*G);
    for(let dz=-cr;dz<=cr;dz++) for(let dx=-cr;dx<=cr;dx++){
      const gx=cgx+dx, gz=cgz+dz; if(gx<0||gz<0||gx>=G||gz>=G) continue;
      const wx=g2w(gx)-p.x, wz=g2w(gz)-p.z; if(wx*wx+wz*wz>sr*sr) continue;
      const i=gz*G+gx;
      if(cells[i]===VCFG.UNKNOWN) revealedCount++;
      cells[i]=frame[i]; liveMask[i]=1; seenT[i]=ticks;               // LIVE truth replaces memory
    }
  }

  // ---- the AGENT channel (narrow): fogged view only ------------------------------------------------------------
  function view(){ return { G, cells, liveMask, explored:+(revealedCount/N).toFixed(4), ticks }; }

  // arc3 SEE: connected-component segmentation over REVEALED cells only (4-neighbour, same code)
  function see(){
    const objs=[]; const seen=new Uint8Array(N);
    for(let i=0;i<N && objs.length<VCFG.MAX_OBJECTS;i++){
      const v=cells[i]; if(v===VCFG.UNKNOWN||v===0||seen[i]) continue;
      // flood fill
      const q=[i]; seen[i]=1; let size=0,sx=0,sz=0,minx=G,maxx=0,minz=G,maxz=0,liveN=0;
      while(q.length){ const j=q.pop(); const x=j%G, z=(j/G)|0;
        size++; sx+=x; sz+=z; if(x<minx)minx=x; if(x>maxx)maxx=x; if(z<minz)minz=z; if(z>maxz)maxz=z; if(liveMask[j])liveN++;
        for(const d of [j-1,j+1,j-G,j+G]){ if(d<0||d>=N||seen[d]) continue;
          if((d===j-1&&x===0)||(d===j+1&&x===G-1)) continue;
          if(cells[d]===v){ seen[d]=1; q.push(d); } } }
      const sc=VCFG.SIZE_CLASSES.findIndex(t=>size<=t);
      objs.push({ code:v, size, sizeClass:sc<0?VCFG.SIZE_CLASSES.length:sc,
        cx:+(sx/size).toFixed(1), cz:+(sz/size).toFixed(1), bbox:[minx,minz,maxx,maxz],
        live:liveN>0, stale:liveN===0 });
    }
    // arc3 SORT prior: group by sameness (code + sizeClass), salience = group cell mass, largest first
    const groups={};
    for(const o of objs){ const k=o.code+':'+o.sizeClass; (groups[k]=groups[k]||{key:k,code:o.code,sizeClass:o.sizeClass,n:0,mass:0,members:[]});
      groups[k].n++; groups[k].mass+=o.size; groups[k].members.push(o); }
    const same=Object.values(groups).filter(g=>g.n>=2).sort((a,b)=>b.mass-a.mass);
    // FRONTIER: revealed cells adjacent to UNKNOWN — the edge of the fog = curiosity goals ("move to see the tree")
    const frontier=[];
    for(let i=0;i<N && frontier.length<VCFG.FRONTIER_MAX*8;i++){
      if(cells[i]===VCFG.UNKNOWN) continue; const x=i%G,z=(i/G)|0;
      const nb=[[x-1,z],[x+1,z],[x,z-1],[x,z+1]];
      if(nb.some(([a,b])=>a>=0&&b>=0&&a<G&&b<G&&cells[b*G+a]===VCFG.UNKNOWN)) frontier.push({x,z,wx:+g2w(x).toFixed(0),wz:+g2w(z).toFixed(0)});
    }
    // thin the frontier deterministically (every kth) to the cap
    const step=Math.max(1,Math.floor(frontier.length/VCFG.FRONTIER_MAX));
    return { objects:objs, sameGroups:same, frontier:frontier.filter((_,i)=>i%step===0).slice(0,VCFG.FRONTIER_MAX), explored:view().explored };
  }

  // grounded description for the worm (facts from see() only — no invention surface)
  function describe(){
    const s=see(); const parts=[];
    parts.push(`I have seen ${Math.round(s.explored*100)}% of this space; the rest is dark to me until you move, and I see nothing there.`);
    if(s.objects.length){ const live=s.objects.filter(o=>o.live).length;
      parts.push(`My retina holds ${s.objects.length} shapes — ${live} live on the lattice now, ${s.objects.length-live} remembered from where we have been.`); }
    if(s.sameGroups.length){ const g=s.sameGroups[0];
      parts.push(`The largest kinship on the map: ${g.n} things of the same make (code ${g.code}); like calls to like — worth a look.`); }
    if(s.frontier.length) parts.push(`The fog has ${s.frontier.length} edges I can name; pick one and fly at it.`);
    return parts;
  }

  // ASCII minimap for the terminal `vision` command: fog=·, stale=lowercase hex, live=UPPER hex, @=agent
  function ascii(){
    const p=opts.pos()||{x:0,z:0}; const ax=w2g(p.x), az=w2g(p.z);
    const rows=[];
    for(let z=0;z<G;z+=2){                             // vertical downsample x2 so it fits a terminal
      let row='';
      for(let x=0;x<G;x++){
        const i=z*G+x;
        if(x===ax&&Math.abs(z-az)<=1){ row+='@'; continue; }
        const v=cells[i];
        if(v===VCFG.UNKNOWN){ row+='·'; continue; }
        if(v===0){ row+=' '; continue; }
        const h=(v%16).toString(16); row+= liveMask[i]? h.toUpperCase() : h;
      }
      rows.push(row);
    }
    return rows;
  }

  return { tick, view, see, describe, ascii, name:opts.name||'retina',
    _wipe(){ cells.fill(VCFG.UNKNOWN); liveMask.fill(0); seenT.fill(0); revealedCount=0; } };
}

const api={ VCFG, create };
if(typeof window!=='undefined') window.VISION=api;
if(typeof module!=='undefined'&&module.exports) module.exports=api;
})();
