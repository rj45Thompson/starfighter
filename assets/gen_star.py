#!/usr/bin/env python3
"""gen_star.py - photosphere maps for the suns.

RJ 2026-09-06: "there is one planet that has a washed out texture just solid white almost with a fire ring. fix that."

Measured before touching anything: it is not a planet. All 16 planets have loaded, dark skins. The scene holds NINE
spheres of radius 34 whose material is a `MeshBasicMaterial` with colour 0xffe0a0 and NO map at all - the suns - each
inside a radius-44 solid red shell, which is the "fire ring". A flat unlit cream ball is exactly what that looks like.

So the suns get a real surface. Two maps per star class, in the same equirectangular layout everything else uses:

  <class>.jpg      the photosphere: granulation cells, darker spots, brighter faculae along the cell walls
  <class>_e.jpg    the emissive channel, hotter than the albedo so the limb still burns

Star classes are named by temperature the way stars actually are, and each gets its own granule scale and colour
ramp, so a red dwarf does not look like a blue giant with a filter over it.

    py -3.13 assets/gen_star.py --all --w 2048
"""
import argparse
import math
import os

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'planets')

# class: (cool colour, hot colour, granule scale, spot amount, spot darkness)
CLASSES = {
    'red':    ((0.55, 0.12, 0.05), (1.00, 0.42, 0.16), 14.0, 0.16, 0.45),
    'orange': ((0.72, 0.26, 0.07), (1.00, 0.62, 0.26), 17.0, 0.13, 0.50),
    'yellow': ((0.90, 0.52, 0.16), (1.00, 0.90, 0.60), 21.0, 0.10, 0.55),
    'white':  ((0.86, 0.80, 0.66), (1.00, 0.98, 0.92), 26.0, 0.07, 0.60),
    'blue':   ((0.55, 0.68, 0.95), (0.92, 0.96, 1.00), 30.0, 0.05, 0.65),
}


def seeded(name):
    h = 2166136261
    for ch in str(name):
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return np.random.default_rng(h)


def sphere_dirs(w, h):
    lon = (np.arange(w) + 0.5) / w * 2 * math.pi
    lat = (np.arange(h) + 0.5) / h * math.pi
    lo, la = np.meshgrid(lon, lat)
    return np.stack([np.sin(la) * np.cos(lo), np.cos(la), np.sin(la) * np.sin(lo)], axis=-1)


def value_noise(dirs, rng, freq, octaves=4):
    out = np.zeros(dirs.shape[:2]); amp, f, total = 1.0, freq, 0.0
    for _ in range(octaves):
        for _ in range(3):
            k = rng.normal(size=3); k /= np.linalg.norm(k)
            out += amp * np.sin((dirs @ k) * f + rng.uniform(0, 2 * math.pi))
        total += amp * 3; amp *= 0.5; f *= 2.07
    return (out / total + 1) * 0.5


def granules(dirs, rng, n_cells):
    """convection cells: distance to the nearest of n_cells points, so cell CENTRES are hot and walls are dark"""
    pts = rng.normal(size=(n_cells, 3)); pts /= np.linalg.norm(pts, axis=1, keepdims=True)
    flat = dirs.reshape(-1, 3)
    d1 = np.full(flat.shape[0], 9.0); d2 = np.full(flat.shape[0], 9.0)
    for p in pts:
        d = np.arccos(np.clip(flat @ p, -1, 1))
        closer = d < d1
        d2 = np.where(closer, d1, np.minimum(d2, d))
        d1 = np.where(closer, d, d1)
    return d1.reshape(dirs.shape[:2]), d2.reshape(dirs.shape[:2])


def build(cls, w, h):
    cool, hot, gscale, spot_amt, spot_dark = CLASSES[cls]
    rng = seeded('star|' + cls)
    dirs = sphere_dirs(w, h)

    d1, d2 = granules(dirs, rng, int(gscale * 22))
    wall = np.clip((d2 - d1) / 0.05, 0, 1)          # 0 on a cell wall, 1 at a cell centre
    fine = value_noise(dirs, rng, gscale * 2.2, 4)  # smaller convection on top of the big cells
    heat = np.clip(0.30 + 0.55 * wall + 0.35 * (fine - 0.5), 0, 1)

    # spots: cool regions with a penumbra, clustered in two latitude bands the way real spots are
    sd1, _ = granules(dirs, rng, 26)
    lat = np.abs((np.arange(h) + 0.5) / h - 0.5)[:, None]
    band = np.exp(-((lat - 0.17) ** 2) / 0.006)
    spots = np.clip(1 - sd1 / 0.085, 0, 1) ** 1.6 * band * (spot_amt * 6)
    heat = np.clip(heat - spots * spot_dark, 0, 1)

    # faculae: bright threads along the cell walls near the spots
    heat = np.clip(heat + (1 - wall) * band * 0.18, 0, 1)

    rgb = np.zeros((h, w, 3))
    for c in range(3):
        rgb[..., c] = cool[c] + (hot[c] - cool[c]) * heat
    alb = Image.fromarray(np.clip(rgb * 255, 0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.4))

    # the emissive runs hotter and crushes the spots less, so the star still burns where it is cool
    em = np.clip(rgb * (0.75 + 0.85 * heat[..., None]), 0, 1)
    emi = Image.fromarray((em * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.5))
    return alb, emi


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cls', default='yellow', choices=sorted(CLASSES))
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--w', type=int, default=2048)
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    for cls in (sorted(CLASSES) if a.all else [a.cls]):
        alb, emi = build(cls, a.w, a.w // 2)
        stem = os.path.join(OUT, 'star_' + cls)
        alb.save(stem + '.jpg', quality=93)
        emi.save(stem + '_e.jpg', quality=93)
        g = np.asarray(alb.convert('L'), dtype=np.float32)
        print('%-7s %dx%d  albedo mean %.1f  min %d  max %d  -> %s.jpg/_e'
              % (cls, a.w, a.w // 2, g.mean(), int(g.min()), int(g.max()), os.path.basename(stem)))


if __name__ == '__main__':
    main()
