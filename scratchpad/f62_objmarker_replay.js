// f62_objmarker_replay.js - settles genre cell F62 "an on-screen marker or arrow points at the active
// objective" (anchor: genre_matrix seed "updateMissionArrow and updateMissionMarker"). Verdict: YES.
// A 2nd independent read that CONFIRMS the seed via the MECHANISM. index.html draws the HUD with the DOM +
// Three.js projection, which cannot be rasterised headlessly, so PART A asserts the wiring the render is
// built from (like f59/f61), and PART B drives the ARROW BEARING FORMULA numerically with plain vectors
// (the exact atan2(rx,fz) the code uses) to prove the arrow actually points AT the objective.
//   MISSION TRACKER: a top-centre arrow (glyph ▲) that ROTATES to the active contract's bearing, plus an
//     in-world MARKER - a diamond (◇) at the target's projected screen point while it is in frame, and an
//     edge-pinned pointer (➤) rotated toward the target when it is off-screen/behind. Both carry the
//     mission title/type + live distance, and both hide when there is no active target. Driven every frame.
//   ACTIVE OBJECTIVE: m = MISSIONS.active(); tp = missionTargetPos(m); missionAutoTick accepts the first
//     posting you qualify for when you hold none, so there is always something to fly toward.
const fs = require('fs');
const path = require('path');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = true;
const ok = (label, cond) => { console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${label}`); if (!cond) pass = false; };

console.log('F62 objective-marker replay - index.html mission arrow + marker\n');

// ---- PART A: the real HUD wiring ----
ok('missionArrow + missionMarker HUD elements exist (glyphs ▲ / ◇)', /id="missionArrow"/.test(IDX) && /id="missionArrowGlyph"[^>]*>▲/.test(IDX) && /id="missionMarker"/.test(IDX) && /id="missionMarkerGlyph"[^>]*>◇/.test(IDX));
ok('updateMissionArrow + updateMissionMarker are defined', /function updateMissionArrow\(dt\)\{/.test(IDX) && /function updateMissionMarker\(tp, dist, m\)\{/.test(IDX));
ok('the arrow updates EVERY frame (called in the main loop)', /updateMissionArrow\(dt\);/.test(IDX) && /step\(dt\); updateCamera\(dt\)/.test(IDX));
ok('the target is the ACTIVE objective (MISSIONS.active + missionTargetPos)', /const m=window\.MISSIONS&&MISSIONS\.active&&MISSIONS\.active\(\)/.test(IDX) && /const tp = \(P&&P\.alive\) \? missionTargetPos\(m\) : null/.test(IDX) && /function missionTargetPos\(m\)/.test(IDX));
ok('no active target -> the arrow is HIDDEN (opacity 0)', /if\(!tp\)\{ missionArrowEl\.style\.opacity='0'; return; \}/.test(IDX));
ok('the arrow ROTATES by the bearing atan2(rx,fz) toward the objective', /const rx=_v\.dot\(RGT[^]*fz=_v\.dot\(FWD/.test(IDX) && /const angDeg=Math\.atan2\(rx,fz\)\*180\/Math\.PI/.test(IDX) && /missionArrowGlyphEl\.style\.transform='rotate\('\+angDeg/.test(IDX));
ok('the arrow label shows the mission title + live distance in units', /missionArrowLabelEl\.textContent='MISSION ▸ '\+\(m\.title\|\|m\.type\|\|'contract'\)\+' · '\+Math\.round\(dist\)\+' u'/.test(IDX));
ok('the marker projects the target through the camera; on-screen -> diamond ◇', /_mmv\.copy\(tp\)\.project\(cam\)/.test(IDX) && /missionMarkerGlyphEl\.textContent='◇'/.test(IDX));
ok('off-screen/behind -> an edge-pinned pointer ➤ rotated toward the target (behind flip handled)', /const behind=_mmv\.z>1/.test(IDX) && /if\(behind\)\{ dx=-dx; dy=-dy; \}/.test(IDX) && /missionMarkerGlyphEl\.textContent='➤'/.test(IDX) && /CFG\.MARKER_EDGE_PAD/.test(IDX));
ok('AUTO-SELECT keeps a target: missionAutoTick accepts the first qualifying posting when you hold none', /function missionAutoTick\(dt\)/.test(IDX) && /if\(!P\|\|!P\.alive\|\|MISSIONS\.active\(\)\) return/.test(IDX) && /there is always something to fly toward/.test(IDX));

// ---- PART B: drive the exact bearing formula (angDeg = atan2(rx,fz)) with plain vectors ----
// rx = dir . shipRight, fz = dir . shipForward. Ship looks down +forward; right is +right. 0deg = dead ahead.
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const FWD = [0, 0, 1], RGT = [1, 0, 0];
const bearing = (dir) => { const rx = dot(dir, RGT), fz = dot(dir, FWD); return Math.atan2(rx, fz) * 180 / Math.PI; };
const near = (a, b) => Math.abs(((a - b + 540) % 360) - 180) < 0.5;   // circular deg compare
const ahead = bearing([0, 0, 1]), right = bearing([1, 0, 0]), behind = bearing([0, 0, -1]), left = bearing([-1, 0, 0]);
console.log(`  bearing: ahead=${ahead}deg right=${right}deg behind=${behind}deg left=${left}deg`);
ok('objective dead AHEAD -> arrow ~0deg (its resting orientation)', near(ahead, 0));
ok('objective to the RIGHT -> arrow ~+90deg', near(right, 90));
ok('objective BEHIND -> arrow ~180deg', near(behind, 180));
ok('objective to the LEFT -> arrow ~-90deg', near(left, -90));

console.log('\nRESULT: ' + (pass
  ? 'PASS - F62 yes: a top-centre arrow rotates to the active contract\'s bearing (atan2(rx,fz) verified: ahead 0, right 90, behind 180, left -90) and an in-world marker shows a diamond on-screen / an edge-pinned pointer off-screen, both labelled with the mission + distance, auto-kept by missionAutoTick - confirms the seed to anchors=2'
  : 'FAIL'));
process.exit(pass ? 0 : 1);
