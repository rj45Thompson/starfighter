#!/usr/bin/env python3
"""gen_painted_cybertron.py - OPTION B: the image generator's hull art, used where it actually works.

RJ 2026-09-06: "generate a Cybertron model with our unity modeling tools. let me see the best three options."

WHAT WAS TRIED AND WHAT IT MEASURED. The obvious version of option B is "ask FLUX for an equirectangular machine
planet and wrap it". That does not work, and this is the evidence rather than an opinion:

  1. "equirectangular texture map of an entire mechanical planet seen from orbit"  -> a PICTURE of a planet: a lit
     ball on black with a vignette.
  2. the same, rewritten to forbid the subject ("no globe, no horizon, no curvature, flat mosaic")  -> a dark frame
     with one glowing blob in the middle.
  3. a square tile laid twice around the equator  -> two glowing eyes, because the tile was itself a scene.
  4. an extreme close-up of hull plating  -> genuinely good plating, but shot at an angle with depth of field and a
     vignette: measured centre/edge luminance ratio 1.47, where a flat texture is near 1.00.

The generator composes SUBJECTS. It will not hand back a surface. So option B does not fight it: it takes the one
thing attempt 4 proved it can draw - convincing metal plating - HIGH-PASSES it to throw away the baked lighting and
the vignette, and uses it as a DETAIL layer over option A's generated structure. The plates, trenches, cities and
foundries stay generated (they have to be: they must wrap and vary per world); the surface texture on top of them
is the generator's.

    py -3.13 assets/gen_painted_cybertron.py            # needs assets/planets/machine_cybertron.jpg to exist
"""
import argparse
import importlib.util
import os

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'planets')
GEN = 'D:/code/Tami/.opus-tools/gen_sprite.py'

PANEL_PROMPT = ("extreme close up flat lay photograph of dark gunmetal spacecraft hull plating filling the entire "
                "frame, rectangular panel lines, rivets, vents, exposed conduits, thin glowing cyan light strips "
                "running between the panels, industrial weathering, no background, no sky, no object, no logo, "
                "no text, even lighting, macro texture")


def load_generator():
    if not os.path.exists(GEN):
        raise SystemExit('gen_sprite.py not found at %s - option B cannot be generated' % GEN)
    spec = importlib.util.spec_from_file_location('gen_sprite', GEN)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def scene_ratio(a):
    """centre luminance over edge luminance: ~1.0 for a flat texture, well above for a vignetted composition"""
    g = a.mean(axis=2) if a.ndim == 3 else a
    h, w = g.shape
    mid = g[h // 4:3 * h // 4, w // 4:3 * w // 4].mean()
    edge = (g[:h // 8].mean() + g[-h // 8:].mean() + g[:, :w // 8].mean() + g[:, -w // 8:].mean()) / 4
    return float(mid / max(1.0, edge))


def high_pass(a, radius):
    """keep the structure, throw away the lighting: the image minus its own heavy blur, recentred on zero"""
    im = Image.fromarray(np.clip(a, 0, 255).astype('uint8'))
    lo = np.asarray(im.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32)
    return a.astype(np.float32) - lo


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tile', type=int, default=1024)
    ap.add_argument('--seed', type=int, default=41)
    ap.add_argument('--repeat', type=int, default=6, help='how many times the plating tiles around the equator')
    ap.add_argument('--strength', type=float, default=0.55)
    ap.add_argument('--base', default=os.path.join(OUT, 'machine_cybertron.jpg'))
    ap.add_argument('--base_e', default=os.path.join(OUT, 'machine_cybertron_e.jpg'))
    ap.add_argument('--stem', default='painted_cybertron')
    a = ap.parse_args()

    if not os.path.exists(a.base):
        raise SystemExit('option B builds ON option A - run gen_cybertron.py first (%s missing)' % a.base)
    base = Image.open(a.base).convert('RGB')
    base_e = Image.open(a.base_e).convert('RGB') if os.path.exists(a.base_e) else None
    W, H = base.size

    gs = load_generator()
    print('asking FLUX for a %dpx plating tile ...' % a.tile)
    path = gs.call_pollinations(PANEL_PROMPT, width=a.tile, height=a.tile, seed=a.seed, enhance=False)
    panel = Image.open(path).convert('RGB')
    pa = np.asarray(panel, dtype=np.float32)
    print('  tile centre/edge ratio %.2f - a scene, so its lighting is high-passed away' % scene_ratio(pa))

    # detail layer: high-passed luminance of the plating, tiled around the sphere and faded out toward the poles
    det = high_pass(pa, radius=a.tile / 22.0).mean(axis=2)
    det = det / max(1.0, np.abs(det).max())                       # -1..1
    dt = Image.fromarray(((det * 0.5 + 0.5) * 255).astype('uint8'))
    tw = max(1, W // a.repeat)
    dt = dt.resize((tw, tw), Image.LANCZOS)
    sheet = Image.new('L', (W, H))
    for x in range(0, W, tw):
        for y in range(0, H, tw):
            t = dt if ((x // tw) + (y // tw)) % 2 == 0 else dt.transpose(Image.FLIP_LEFT_RIGHT)
            sheet.paste(t.convert('L'), (x, y))
    sa = np.asarray(sheet, dtype=np.float32) / 255.0 * 2 - 1      # back to -1..1
    lat = np.linspace(0, 1, H)[:, None]
    fade = np.clip(1 - (np.abs(lat - 0.5) - 0.30) / 0.20, 0, 1)   # no plating detail smeared over the poles
    sa = sa * fade

    ba = np.asarray(base, dtype=np.float32)
    out = np.clip(ba + sa[..., None] * (255 * 0.22 * a.strength), 0, 255)
    alb = Image.fromarray(out.astype('uint8'))

    # emissive: option A's own lit network, plus the plating's brightest seams where they fall on lit ground
    if base_e is not None:
        ea = np.asarray(base_e, dtype=np.float32)
        seam = np.clip(sa, 0, 1)[..., None] * (ea.mean(axis=2, keepdims=True) > 12)
        emi = Image.fromarray(np.clip(ea + seam * 90, 0, 255).astype('uint8'))
    else:
        emi = Image.fromarray(np.zeros((H, W, 3), dtype='uint8'))

    grey = np.asarray(alb.convert('L').filter(ImageFilter.GaussianBlur(0.9)), dtype=np.float32) / 255.0
    gx = np.roll(grey, -1, axis=1) - np.roll(grey, 1, axis=1)
    gy = np.zeros_like(grey); gy[1:-1] = grey[2:] - grey[:-2]
    nz = np.ones_like(grey); nx, ny = -gx * 3.0, -gy * 3.0
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    nor = Image.fromarray((np.stack([nx / ln * .5 + .5, ny / ln * .5 + .5, nz / ln * .5 + .5], -1) * 255).astype('uint8'))

    stem = os.path.join(OUT, a.stem)
    alb.save(stem + '.jpg', quality=92); emi.save(stem + '_e.jpg', quality=92); nor.save(stem + '_n.jpg', quality=92)
    la = np.asarray(alb.convert('L'), dtype=np.float32)
    le = np.asarray(emi.convert('L'), dtype=np.float32)
    seam_delta = float(np.abs(np.asarray(alb, np.float32)[:, 0] - np.asarray(alb, np.float32)[:, -1]).mean())
    print('option B %dx%d  albedo mean %.1f  emissive mean %.1f  lit %d  seam delta %.2f  detail repeats %d  -> %s.jpg/_e/_n'
          % (W, H, la.mean(), le.mean(), int((le > 120).sum()), seam_delta, a.repeat, os.path.basename(stem)))


if __name__ == '__main__':
    main()
