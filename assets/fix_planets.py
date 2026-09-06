#!/usr/bin/env python3
"""fix_planets.py - make the generated planet maps WRAP a sphere.

RJ 2026-09-06: "the new art for planet didn't texture wrap the planet okay, that is a special texture." A text-to-image
model paints a flat 2:1 picture, not an equirectangular projection: its left and right edges do not meet, and its top
and bottom rows are ordinary picture rows, which a sphere's UV mapping pinches into a swirl at each pole. This pass
turns each map into something that wraps:
  1. wrap seam: the right edge cross-fades into the left edge's pixels over WRAP_BAND columns, so u=1 meets u=0;
  2. poles: the top and bottom POLE_FRAC of the rows converge (by row) to that row band's mean colour, so the pinch
     is a flat cap instead of a knot; the blend is smooth so no band shows at the cap edge;
  3. normal map re-derived from the fixed albedo, with the same seam fix (a normal map that does not wrap shows
     a lit crease down the planet).
Run after gen_art.py, or alone on the files already on disk:

    py -3.13 D:/code/starfighter/assets/fix_planets.py
"""
import glob, json, os, sys
import numpy as np
from PIL import Image, ImageOps, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
PLANETS = os.path.join(HERE, "planets")
WRAP_BAND_FRAC = 0.06    # of the width, cross-faded at the wrap seam
POLE_FRAC = 0.09         # of the height, at each pole, eased to a flat cap
NORMAL_STRENGTH = 1.6
NORMAL_BLUR = 1.5

def wrap_seam(a, band):
    left = a[:, :band].copy()
    for i in range(band):
        t = (i + 1) / band
        t = t * t * (3 - 2 * t)          # smoothstep
        col = a.shape[1] - band + i
        a[:, col] = a[:, col] * (1 - t) + left[:, i] * t
    return a

def pole_caps(a, rows):
    h = a.shape[0]
    top_mean = a[:rows].reshape(-1, a.shape[2]).mean(axis=0)
    bot_mean = a[h - rows:].reshape(-1, a.shape[2]).mean(axis=0)
    for r in range(rows):
        t = 1 - r / rows                  # 1 at the very edge, 0 at the inner boundary
        t = t * t * (3 - 2 * t)
        a[r] = a[r] * (1 - t) + top_mean * t
        a[h - 1 - r] = a[h - 1 - r] * (1 - t) + bot_mean * t
    return a

def normal_map(im, strength=NORMAL_STRENGTH, blur=NORMAL_BLUR):
    g = np.asarray(ImageOps.grayscale(im).filter(ImageFilter.GaussianBlur(blur))).astype(np.float32) / 255.0
    gx = np.roll(g, -1, axis=1) - np.roll(g, 1, axis=1)    # np.roll wraps, so the seam gradient is continuous
    gy = np.roll(g, -1, axis=0) - np.roll(g, 1, axis=0)
    nx, ny, nz = -gx * strength, gy * strength, np.ones_like(g)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    n = np.stack([nx / l, ny / l, nz / l], axis=-1)
    return Image.fromarray(np.clip((n * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8))

def main():
    files = [f for f in glob.glob(os.path.join(PLANETS, "*.jpg")) if not f.endswith("_n.jpg")]
    if not files: print("no planet maps in", PLANETS); return 1
    report = {}
    for f in sorted(files):
        im = Image.open(f).convert("RGB"); w, h = im.size
        a = np.asarray(im).astype(np.float32)
        a = wrap_seam(a, max(8, int(w * WRAP_BAND_FRAC)))
        a = pole_caps(a, max(4, int(h * POLE_FRAC)))
        out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        out.save(f, "JPEG", quality=90, optimize=True)
        nm = f[:-4] + "_n.jpg"; normal_map(out).save(nm, "JPEG", quality=88, optimize=True)
        # measure the seam after the fix: mean abs difference between column 0 and column w-1
        seam = float(np.abs(a[:, 0] - a[:, -1]).mean())
        report[os.path.basename(f)] = {"size": [w, h], "seam_mean_abs_diff": round(seam, 2), "normal": os.path.basename(nm)}
        print(os.path.basename(f), w, "x", h, "seam diff", round(seam, 2))
    json.dump(report, open(os.path.join(PLANETS, "wrap_report.json"), "w"), indent=1)
    return 0

if __name__ == "__main__":
    sys.exit(main())
