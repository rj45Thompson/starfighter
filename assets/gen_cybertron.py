#!/usr/bin/env python3
"""gen_cybertron.py - a MACHINE WORLD skin: albedo, emissive and normal, generated not painted.

RJ 2026-09-06: "make the planet dark with emissive lights like a Cybertron. dark and mysterious" and then, when a
darkened rock skin was not that: "generate a Cybertron model with our unity modeling tools. let me see the best
three options."

This is OPTION A of the three: the whole surface is built, so it can be dark by construction rather than dimmed
after the fact, it wraps exactly at the seam, and every world gets its own layout from its own name.

    py -3.13 assets/gen_cybertron.py --name Cybertron --w 2048
    py -3.13 assets/gen_cybertron.py --all            # one set per planet type used by the game

What it lays down, in order:
  PLATES     a Worley/cellular partition of the sphere into tectonic plates of metal, each with its own shade and
             a darker trench along every plate boundary - the continental structure of a built world
  DECKS      rectangular deck blocks inside each plate at two scales, the city-sized structure you read from orbit
  TRENCHES   deep canals that follow plate boundaries, unlit and near-black
  CIRCUIT    a lit trace network that runs along the trenches and across the decks, the EMISSIVE channel
  FOUNDRIES  a handful of hot nodes where traces converge, brighter and warmer than the traces
  POLES      an ice-free machine cap: concentric rings, dimmer, so the poles do not read as a smear

Every band is written into an equirectangular map: x is longitude (wraps), y is latitude (does not). Longitude
wrapping is enforced by generating the noise on a CYLINDER - the cell seeds are placed in angle space and compared
with a wrapped delta - not by blurring a seam afterwards.
"""
import argparse
import math
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'planets')

# A LOOK is a whole world, not a colour swap: the palette AND the structure that goes with it. RJ asked for more
# options and AAA quality, so each of these changes the plate count, the city density, how deep the trenches cut
# and how hot the foundries burn - two looks never differ only in hue.
#   metal_dark / metal_light / trace / foundry, then the structural knobs
LOOKS = {
    'iron':     dict(dark=(0.15,0.15,0.17), light=(0.36,0.35,0.36), trace=(1.00,0.52,0.14), foundry=(1.00,0.78,0.30),
                     plates=20, city=7.0, block=26.0, bld=88.0, trench=3.0, glow=0.90, greeble=0.955, weather=0.22),
    'circuit':  dict(dark=(0.07,0.09,0.12), light=(0.22,0.28,0.34), trace=(0.20,0.85,1.00), foundry=(0.55,0.95,1.00),
                     plates=30, city=11.0, block=40.0, bld=150.0, trench=4.2, glow=1.25, greeble=0.930, weather=0.10),
    'rust':     dict(dark=(0.20,0.12,0.08), light=(0.44,0.28,0.18), trace=(1.00,0.62,0.22), foundry=(1.00,0.42,0.12),
                     plates=16, city=5.5, block=19.0, bld=64.0, trench=2.4, glow=0.70, greeble=0.965, weather=0.42),
    'warlord':  dict(dark=(0.07,0.06,0.07), light=(0.20,0.17,0.18), trace=(1.00,0.16,0.20), foundry=(1.00,0.36,0.16),
                     plates=24, city=8.0, block=30.0, bld=110.0, trench=3.6, glow=1.10, greeble=0.945, weather=0.18),
    'glacier':  dict(dark=(0.16,0.19,0.23), light=(0.52,0.58,0.66), trace=(0.72,0.92,1.00), foundry=(0.90,0.98,1.00),
                     plates=18, city=6.0, block=22.0, bld=76.0, trench=2.8, glow=0.85, greeble=0.960, weather=0.14),
    'verdant':  dict(dark=(0.10,0.15,0.11), light=(0.26,0.36,0.26), trace=(0.45,1.00,0.55), foundry=(0.85,1.00,0.40),
                     plates=22, city=6.5, block=24.0, bld=84.0, trench=3.0, glow=0.80, greeble=0.958, weather=0.30),
    'imperial': dict(dark=(0.13,0.11,0.17), light=(0.33,0.28,0.42), trace=(0.80,0.55,1.00), foundry=(1.00,0.80,0.45),
                     plates=26, city=9.0, block=34.0, bld=120.0, trench=3.4, glow=1.00, greeble=0.950, weather=0.16),
}
PALETTES = dict((k, (v['dark'], v['light'], v['trace'], v['foundry'])) for k, v in LOOKS.items())


def seeded(name):
    h = 2166136261
    for ch in str(name):
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return np.random.default_rng(h)


def sphere_dirs(w, h):
    """unit direction per texel of an equirectangular map - the honest way to keep the seam and the poles right"""
    lon = (np.arange(w) + 0.5) / w * 2 * math.pi
    lat = (np.arange(h) + 0.5) / h * math.pi
    lo, la = np.meshgrid(lon, lat)
    return np.stack([np.sin(la) * np.cos(lo), np.cos(la), np.sin(la) * np.sin(lo)], axis=-1)


def worley(dirs, rng, n_cells):
    """distance to the nearest and second-nearest of n_cells points ON THE SPHERE, so nothing seams or pinches"""
    pts = rng.normal(size=(n_cells, 3))
    pts /= np.linalg.norm(pts, axis=1, keepdims=True)
    flat = dirs.reshape(-1, 3)
    d1 = np.full(flat.shape[0], 9.0)
    d2 = np.full(flat.shape[0], 9.0)
    idx = np.zeros(flat.shape[0], dtype=np.int32)
    for i, p in enumerate(pts):
        d = np.arccos(np.clip(flat @ p, -1, 1))
        closer = d < d1
        d2 = np.where(closer, d1, np.minimum(d2, d))
        idx = np.where(closer, i, idx)
        d1 = np.where(closer, d, d1)
    shape = dirs.shape[:2]
    return d1.reshape(shape), d2.reshape(shape), idx.reshape(shape)


def value_noise(dirs, rng, freq, octaves=4):
    """cheap band-limited noise on the sphere: sums of random directional sinusoids, so it cannot seam"""
    out = np.zeros(dirs.shape[:2])
    amp, f = 1.0, freq
    total = 0.0
    for _ in range(octaves):
        for _ in range(3):
            k = rng.normal(size=3)
            k /= np.linalg.norm(k)
            phase = rng.uniform(0, 2 * math.pi)
            out += amp * np.sin((dirs @ k) * f + phase)
        total += amp * 3
        amp *= 0.5
        f *= 2.1
    return (out / total + 1) * 0.5


def build(name, kind, w, h):
    rng = seeded(name + '|' + kind)
    dirs = sphere_dirs(w, h)
    L = LOOKS.get(kind, LOOKS['iron'])
    dark, light, trace_c, foundry_c = L['dark'], L['light'], L['trace'], L['foundry']

    # --- plates -------------------------------------------------------------------------------------------
    d1, d2, cell = worley(dirs, rng, L['plates'])
    edge = np.clip((d2 - d1) / 0.10, 0, 1)          # 0 exactly on a plate boundary, 1 deep inside a plate
    plate_shade = rng.uniform(0.72, 1.18, size=cell.max() + 1)[cell]

    # --- decks: CITY BLOCKS, laid out in each plate's own axes ---------------------------------------------
    # The first attempt banded smooth noise and came out as leather, not machinery. A built world reads as
    # rectangles: every plate gets its own basis on the sphere, the surface is quantised in that basis at three
    # scales, and each block takes a shade from a hash of its own index. Grid LINES fall where a coordinate is
    # near a block edge, which is also where the lit traces run.
    n_plates = int(cell.max()) + 1
    bu = rng.normal(size=(n_plates, 3)); bu /= np.linalg.norm(bu, axis=1, keepdims=True)
    bv = np.cross(bu, rng.normal(size=(n_plates, 3))); bv /= np.linalg.norm(bv, axis=1, keepdims=True)
    U = np.einsum('ijk,ijk->ij', dirs, bu[cell])
    V = np.einsum('ijk,ijk->ij', dirs, bv[cell])

    def blocks(scale):
        bx = np.floor(U * scale); by = np.floor(V * scale)
        hsh = np.sin(bx * 12.9898 + by * 78.233 + cell * 3.7) * 43758.5453
        return bx, by, hsh - np.floor(hsh)

    def gridlines(scale, width):
        fx = np.abs(U * scale - np.round(U * scale))
        fy = np.abs(V * scale - np.round(V * scale))
        return np.clip(1 - np.minimum(fx, fy) / width, 0, 1)

    _, _, h_city = blocks(L['city'])   # districts
    _, _, h_blk = blocks(L['block'])   # blocks
    _, _, h_bld = blocks(L['bld'])     # buildings
    # a machine world reads by CONTRAST between adjacent panels, not by a gentle ramp: quantise the block shade to
    # a few alloy levels so neighbours differ sharply, the way plating does, and cut the streets in hard and thin.
    alloy = np.floor(h_blk * 5) / 4.0                      # five alloys, 0..1.25
    deck = 0.34 + 0.86 * alloy + 0.30 * (h_city - 0.5) + 0.10 * (h_bld - 0.5)
    avenue = np.maximum(gridlines(L['city'], 0.016), gridlines(L['block'], 0.012) * 0.85)   # the streets
    deck = deck * (1 - avenue * 0.82)
    # greebles: a scatter of small bright fittings, the thing that says "built" at any zoom
    _, _, h_greeble = blocks(L['bld'] * 2.4)
    deck = deck + (h_greeble > L['greeble']) * 0.55
    grain = value_noise(dirs, rng, 26, 3)   # kept only as a faint weathering pass over the metal
    # --- albedo -------------------------------------------------------------------------------------------
    base = np.zeros((h, w, 3))
    for c in range(3):
        base[..., c] = dark[c] + (light[c] - dark[c]) * np.clip(deck, 0, 1.6)
    base *= (plate_shade * ((1 - L['weather']) + L['weather'] * grain))[..., None]
    trench = np.clip(edge * L['trench'], 0, 1)      # the canals between plates
    base *= (0.22 + 0.78 * trench)[..., None]
    # poles: concentric machine rings rather than a smear
    lat = (np.arange(h) + 0.5) / h
    polar = np.clip((np.abs(lat - 0.5) - 0.34) / 0.16, 0, 1)[:, None]
    rings = 0.5 + 0.5 * np.sin(np.arange(h)[:, None] * 0.55)
    base = base * (1 - polar[..., None] * 0.55) + (polar * rings * 0.10)[..., None]

    # --- emissive: traces along the trenches, foundries where they meet ------------------------------------
    trace = np.clip(1.0 - edge * 7.0, 0, 1) ** 1.5                       # bright band hugging every boundary
    windows = (h_bld > 0.55).astype(np.float32) * (h_blk > 0.30).astype(np.float32)   # lit floors, block by block
    lit_avenue = np.maximum(gridlines(L['city'], 0.012), gridlines(L['block'], 0.009) * 0.8)
    trace = np.maximum(trace * 0.9, (windows * 0.42 + lit_avenue * 0.85) * (1 - polar)) * L['glow']
    fd1, _, _ = worley(dirs, rng, 9)
    foundry = np.clip(1.0 - fd1 / 0.10, 0, 1) ** 2.0                     # the hot nodes
    emis = np.zeros((h, w, 3))
    for c in range(3):
        emis[..., c] = trace * trace_c[c] * 0.85 + foundry * foundry_c[c]
    emis *= (1 - polar * 0.7)[..., None]
    emis = np.clip(emis, 0, 1)

    alb = Image.fromarray(np.clip(base * 255, 0, 255).astype('uint8'))
    emi = Image.fromarray(np.clip(emis * 255, 0, 255).astype('uint8'))

    # --- normal map from the albedo's structure ------------------------------------------------------------
    grey = np.asarray(alb.convert('L').filter(ImageFilter.GaussianBlur(1.1)), dtype=np.float32) / 255.0
    gx = np.roll(grey, -1, axis=1) - np.roll(grey, 1, axis=1)            # roll on x: the seam is handled for free
    gy = np.zeros_like(grey)
    gy[1:-1] = grey[2:] - grey[:-2]
    strength = 2.6
    nz = np.ones_like(grey)
    nx, ny = -gx * strength, -gy * strength
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    nrm = np.stack([(nx / ln * 0.5 + 0.5), (ny / ln * 0.5 + 0.5), (nz / ln * 0.5 + 0.5)], axis=-1)
    nor = Image.fromarray((nrm * 255).astype('uint8'))

    # --- AAA channels: what makes a surface read as METAL rather than a painted ball ------------------------
    # ROUGHNESS: plate tops are polished, trenches and weathered patches are rough. A single roughness number
    # over a whole planet is the main reason a textured sphere looks like a toy.
    rough = np.clip(0.28 + 0.55 * (1 - np.clip(deck - 0.3, 0, 1)) + 0.25 * (1 - trench) + 0.10 * grain, 0.05, 1)
    rgh = Image.fromarray((rough * 255).astype('uint8'))
    # AMBIENT OCCLUSION: the trenches and the streets are in their own shadow. Baked, because a real AO pass
    # is not available in this renderer.
    ao = np.clip(0.35 + 0.65 * trench, 0, 1) * np.clip(1 - avenue * 0.5, 0, 1)
    aoi = Image.fromarray((ao * 255).astype('uint8'))
    # HEIGHT: the same structure the albedo draws, as a displacement map. Because it shares the albedo's UV space,
    # a sphere displaced by it lines up EXACTLY with the picture on it - plates stand where the plates are drawn and
    # the trenches cut where the trenches are drawn. This is what makes option C a properly mapped mesh rather than
    # a ball with a hand-rolled bump pattern that does not agree with its own texture.
    height = np.clip(0.5 + 0.30 * (np.clip(deck, 0, 1.6) - 0.6) - 0.34 * (1 - trench) + 0.05 * (grain - 0.5), 0, 1)
    height = height * (1 - polar * 0.45) + polar * 0.45 * 0.5      # poles flatten so the cap does not spike
    hgt = Image.fromarray((height * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.6))
    # SMOG: a separate slowly-turning haze layer, densest over the cities. Alpha in the red channel.
    smog = np.clip(value_noise(dirs, rng, 3.2, 4) * 1.5 - 0.45, 0, 1) * (0.35 + 0.65 * np.clip(deck - 0.5, 0, 1))
    smog = smog * (1 - polar * 0.8)
    smg = Image.fromarray((np.stack([smog, smog, smog], -1) * 255).astype('uint8'))
    return alb, emi, nor, rgh, aoi, smg, hgt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--name', default='Cybertron')
    ap.add_argument('--kind', default='iron', choices=sorted(LOOKS))
    ap.add_argument('--w', type=int, default=2048)
    ap.add_argument('--all', action='store_true', help='one set per palette')
    ap.add_argument('--prefix', default='machine')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    kinds = sorted(LOOKS) if a.all else [a.kind]
    for k in kinds:
        w = a.w
        h = w // 2
        alb, emi, nor, rgh, aoi, smg, hgt = build(a.name if not a.all else k, k, w, h)
        stem = os.path.join(OUT, '%s_%s' % (a.prefix, k))
        alb.save(stem + '.jpg', quality=92)
        emi.save(stem + '_e.jpg', quality=92)
        nor.save(stem + '_n.jpg', quality=92)
        rgh.save(stem + '_r.jpg', quality=90)
        aoi.save(stem + '_ao.jpg', quality=90)
        smg.save(stem + '_smog.jpg', quality=88)
        hgt.save(stem + '_h.jpg', quality=94)
        arr = np.asarray(alb.convert('L'), dtype=np.float32)
        ea = np.asarray(emi.convert('L'), dtype=np.float32)
        print('%-10s %dx%d  albedo %.1f  emissive %.1f  lit %6d  ->  %s + _e/_n/_r/_ao/_smog/_h'
              % (k, w, h, arr.mean(), ea.mean(), int((ea > 120).sum()), os.path.basename(stem) + '.jpg'))


if __name__ == '__main__':
    main()
