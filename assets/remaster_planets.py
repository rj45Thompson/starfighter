#!/usr/bin/env python3
"""remaster_planets.py - put the GENERATED surface detail onto the generated planet structure.

RJ 2026-09-06: "okay try another way for planets. let me see if we have a generator that works. it looking like
meshy is needed" - after showing a Meshy Cybertron (1,621,956 faces) that looks exactly right.

WHAT WE FOUND. We do have one that works, and it is not the endpoint that failed before:

  free FLUX endpoint (gen_sprite.py)   4 prompts, 4 COMPOSITIONS. centre/edge luminance 1.47, where a flat
                                       texture is 1.00. It draws subjects, never surfaces.
  SDXL-turbo on Kaggle, with every
  Conv2d switched to CIRCULAR padding  centre/edge 0.96-1.02 and seam delta 0.7-9.9 on three prompts. Real,
                                       tileable textures - panels, rivets, vents, circuit districts, trench walls.

Circular padding is the whole difference: it makes the convolutions wrap, so the model cannot compose a framed
picture and the left edge continues into the right by construction.

WHY NOT JUST USE THE MESHY MESH. Its value is the LOOK, not the geometry - 827,792 vertices for one planet, times
18 planets, against a game that already spends half its frame on 7,600 asteroids. This pipeline takes the same look
and puts it on a 33k-vertex sphere: the tiles supply panel detail and relief, the structure maps supply the
planet-scale layout (plates, trench networks, districts, poles) and the equirectangular wrapping.

    py -3.13 assets/remaster_planets.py --look iron
    py -3.13 assets/remaster_planets.py --all

Reads   assets/planets/machine_<look>{,_e,_h,_ao,_r}.jpg   (structure, from gen_cybertron.py)
        assets/planets/tile_{plate,city,trench}.jpg        (detail, from SDXL-turbo)
Writes  the same machine_<look>* names, remastered in place after a .orig backup.
"""
import argparse
import os
import shutil

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'planets')
TILES = ('plate', 'city', 'trench')


def load(path, mode='RGB'):
    return np.asarray(Image.open(path).convert(mode), dtype=np.float32)


def tile_to(sheet, W, H, repeats, flip_alternate=True):
    """lay a square tile repeats times around the equator, mirroring alternate copies so the joins match"""
    tw = max(1, W // repeats)
    t = Image.fromarray(sheet.astype('uint8')).resize((tw, tw), Image.LANCZOS)
    tf = t.transpose(Image.FLIP_LEFT_RIGHT)
    out = Image.new('RGB', (W, H))
    for x in range(0, W, tw):
        for y in range(0, H, tw):
            use = t if (not flip_alternate or ((x // tw) + (y // tw)) % 2 == 0) else tf
            out.paste(use, (x, y))
    return np.asarray(out, dtype=np.float32)


def high_pass(a, radius):
    lo = np.asarray(Image.fromarray(np.clip(a, 0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(radius)),
                    dtype=np.float32)
    return a - lo


def remaster(look, repeats, strength, relief):
    stem = os.path.join(OUT, 'machine_' + look)
    need = [stem + '.jpg', stem + '_e.jpg', stem + '_h.jpg']
    for p in need:
        if not os.path.exists(p):
            raise SystemExit('missing %s - run gen_cybertron.py first' % os.path.basename(p))
    for p in (stem + '.jpg', stem + '_e.jpg', stem + '_h.jpg', stem + '_ao.jpg', stem + '_r.jpg'):
        if os.path.exists(p) and not os.path.exists(p + '.orig'):
            shutil.copy2(p, p + '.orig')

    alb = load(stem + '.jpg')
    emi = load(stem + '_e.jpg')
    hgt = load(stem + '_h.jpg', 'L')
    H, W = alb.shape[:2]

    tiles = {}
    for k in TILES:
        p = os.path.join(OUT, 'tile_%s.jpg' % k)
        if not os.path.exists(p):
            raise SystemExit('missing %s - generate the SDXL tiles first' % os.path.basename(p))
        tiles[k] = tile_to(load(p), W, H, repeats)

    # WHERE each tile belongs, read from the structure maps rather than invented:
    #   the height map's low ground is trench, its high ground is plate, and the emissive marks the districts.
    h01 = hgt / 255.0
    lit = np.clip(emi.mean(axis=2) / 90.0, 0, 1)
    w_trench = np.clip((0.46 - h01) / 0.22, 0, 1)
    w_city = np.clip(lit, 0, 1) * (1 - w_trench)
    w_plate = np.clip(1 - w_trench - w_city, 0, 1)
    tot = np.maximum(1e-3, w_trench + w_city + w_plate)
    w_trench, w_city, w_plate = w_trench / tot, w_city / tot, w_plate / tot

    # poles: a square tile stretched over a pole is a smear, so the detail fades out before it gets there
    lat = np.linspace(0, 1, H)[:, None]
    fade = np.clip(1 - (np.abs(lat - 0.5) - 0.28) / 0.18, 0, 1)

    detail = (tiles['plate'] * w_plate[..., None] + tiles['city'] * w_city[..., None]
              + tiles['trench'] * w_trench[..., None])
    # LUMINANCE ONLY. The first version added the high-passed detail in RGB, which carried the tile's own colour
    # into the world and left green and brown blotches across a gunmetal planet - the look's palette is decided by
    # gen_cybertron.py and the detail layer has no business overriding it. Taking the mean keeps the panel
    # STRUCTURE and throws away its hue.
    hp = high_pass(detail, max(2.0, W / (repeats * 12.0))).mean(axis=2)
    new_alb = np.clip(alb + hp[..., None] * strength * fade[..., None], 0, 255)

    # RELIEF: the panel edges become real geometry, because the height map shares the albedo's UVs and the sphere
    # is displaced through it. This is what buys the Meshy look on a 33k-vertex ball.
    hp_l = hp / max(1.0, np.abs(hp).max())
    new_h = np.clip(h01 + hp_l * relief * fade[:, :1], 0, 1) * 255

    # EMISSIVE: the tiles' own hot pixels (the lit ports and conduits the model drew) added where the structure
    # already says something is lit, so the planet does not glow uniformly.
    warm = np.clip(detail.mean(axis=2) - 150, 0, 255) / 105.0
    new_emi = np.clip(emi + (warm * 120.0 * np.clip(lit + 0.25, 0, 1) * fade)[..., None], 0, 255)

    Image.fromarray(new_alb.astype('uint8')).save(stem + '.jpg', quality=92)
    Image.fromarray(new_h.astype('uint8')).convert('L').save(stem + '_h.jpg', quality=94)
    Image.fromarray(new_emi.astype('uint8')).save(stem + '_e.jpg', quality=92)

    # the normal map has to be rebuilt or it describes the OLD surface
    grey = np.asarray(Image.fromarray(new_alb.astype('uint8')).convert('L').filter(ImageFilter.GaussianBlur(0.9)),
                      dtype=np.float32) / 255.0
    gx = np.roll(grey, -1, axis=1) - np.roll(grey, 1, axis=1)
    gy = np.zeros_like(grey); gy[1:-1] = grey[2:] - grey[:-2]
    nz = np.ones_like(grey); nx, ny = -gx * 3.2, -gy * 3.2
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    Image.fromarray((np.stack([nx / ln * .5 + .5, ny / ln * .5 + .5, nz / ln * .5 + .5], -1) * 255).astype('uint8')
                    ).save(stem + '_n.jpg', quality=92)

    a0 = load(stem + '.jpg.orig').mean() if os.path.exists(stem + '.jpg.orig') else float('nan')
    print('%-9s %dx%d  albedo %.1f -> %.1f  detail repeats %d  relief %.2f  emissive %.1f -> %.1f'
          % (look, W, H, a0, new_alb.mean(), repeats, relief, emi.mean(), new_emi.mean()))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--look', default='iron')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--repeats', type=int, default=8, help='how many times the detail tiles wrap the equator')
    ap.add_argument('--strength', type=float, default=0.85)
    ap.add_argument('--relief', type=float, default=0.30)
    a = ap.parse_args()
    looks = ([f[len('machine_'):-len('.jpg')] for f in os.listdir(OUT)
              if f.startswith('machine_') and f.endswith('.jpg') and '_' not in f[len('machine_'):-len('.jpg')]]
             if a.all else [a.look])
    for look in sorted(looks):
        remaster(look, a.repeats, a.strength, a.relief)


if __name__ == '__main__':
    main()
