#!/usr/bin/env python3
"""gen_art.py - generate the space game's art with the free FLUX endpoint the Tami sprite tool uses, at the highest
resolution that endpoint accepts (2048 on the long edge), and derive normal maps from every surface texture.

RJ 2026-09-06: "generate all the art ... make sure every single thing is generated to the highest graphics we can
do". Each item records its prompt, seed, size and bytes in a manifest next to the files, so every generated file on
the page has provenance. Nothing is substituted at load: a missing file is reported by the game's loader.

    py -3.13 D:/code/starfighter/assets/gen_art.py             # everything not yet on disk at the current size
    py -3.13 D:/code/starfighter/assets/gen_art.py --force     # regenerate all
    py -3.13 D:/code/starfighter/assets/gen_art.py rock_dark   # one item
"""
import json, os, sys, time
import numpy as np
from PIL import Image, ImageOps, ImageFilter

sys.path.insert(0, r"D:\code\Tami\.opus-tools")
from gen_sprite import call_pollinations   # the free Pollinations.ai FLUX-schnell endpoint, no auth

HERE = os.path.dirname(os.path.abspath(__file__))
GEN = os.path.join(HERE, "gen")
PLANETS = os.path.join(HERE, "planets")
SEED_BASE = 60920
FLAT = "flat texture, full-bleed, no border, no frame, no text, no watermark, no logo"
EQUI = "seamless equirectangular planet surface texture map, 2:1 world map projection, full-bleed, no border, no text, no watermark, viewed flat, photoreal satellite imagery style"

# name -> (folder, prompt, width, height, post)
#   post 'tile'   surface texture: mirror-blend to seamless, JPEG, plus a derived normal map <name>_n.jpg
#   post 'equi'   planet map: JPEG at 2:1 (left/right edge blended so the seam does not show), plus a normal map
#   post 'black'  sprite on black for additive blending: PNG, near-black crushed to pure black
ITEMS = {
  # planets, one per economy type (PTYPES[].t in the game)
  "mining":   (PLANETS, "an ochre and rust-brown rocky mining world, deep canyons, cratered highlands, thin dust-storm streaks, no water, " + EQUI, 2048, 1024, "equi"),
  "agri":     (PLANETS, "a lush agrarian world, patchwork green farmland continents, winding rivers, shallow turquoise seas, sparse white cloud bands, " + EQUI, 2048, 1024, "equi"),
  "refinery": (PLANETS, "a grey-steel industrial refinery world, smog belts, dark basalt plains, glowing orange foundry cities in a grid, oil-black seas, " + EQUI, 2048, 1024, "equi"),
  "hitech":   (PLANETS, "a cool blue high-tech world, glassy city sprawl with cyan light grids, silver ice caps, deep navy oceans, " + EQUI, 2048, 1024, "equi"),
  "luxury":   (PLANETS, "an exotic magenta-and-gold luxury resort world, pink sand continents, violet lagoons, pearly cloud swirls, " + EQUI, 2048, 1024, "equi"),
  "garden":   (PLANETS, "an earth-like garden world, blue oceans, green forested continents, white polar caps, scattered clouds, " + EQUI, 2048, 1024, "equi"),
  # surfaces
  "rock_dark":   (GEN, "close-up seamless texture of dark grey asteroid rock, pitted regolith, small craters, matte, even lighting, " + FLAT, 1024, 1024, "tile"),
  "rock_light":  (GEN, "close-up seamless texture of pale grey-tan asteroid rock, dusty regolith, fine cracks, matte, even lighting, " + FLAT, 1024, 1024, "tile"),
  "station_hull":(GEN, "seamless texture of a space station hull, grey armour plating, panel lines, rivets, small blue running lights, " + FLAT, 1024, 1024, "tile"),
  # sprites on black (additive)
  "sun_corona":  (GEN, "a blazing star seen from space, brilliant white-yellow core with orange corona and wispy solar flares, centred, on pure black background, " + FLAT, 1024, 1024, "black"),
  "nebula_a":    (GEN, "a soft wispy blue and violet nebula cloud, translucent gas, faint stars, centred, fading to pure black at the edges, " + FLAT, 1024, 1024, "black"),
  "nebula_b":    (GEN, "a soft teal and magenta nebula cloud, translucent gas wisps, centred, fading to pure black at the edges, " + FLAT, 1024, 1024, "black"),
  "nebula_c":    (GEN, "a soft orange and rose nebula cloud, translucent gas wisps, centred, fading to pure black at the edges, " + FLAT, 1024, 1024, "black"),
  "engine_flame":(GEN, "a single vertical blue-white plasma engine exhaust flame, bright core, centred on pure black background, " + FLAT, 512, 1024, "black"),
  "gem_glow":    (GEN, "a glowing faceted crystal gem, cyan and violet light, centred on pure black background, " + FLAT, 512, 512, "black"),
  "explosion":   (GEN, "a fiery explosion fireball in space, orange and white plasma with dark smoke wisps, centred on pure black background, " + FLAT, 1024, 1024, "black"),
  "muzzle_flash":(GEN, "a bright cyan energy muzzle flash burst, radial rays, centred on pure black background, " + FLAT, 512, 512, "black"),
}

def make_seamless(im):
    """Mirror-blend the right and bottom halves into flipped copies so the texture tiles without a visible edge."""
    w, h = im.size
    mask_h = Image.linear_gradient("L").rotate(-90, expand=True).resize((w, h)).point(lambda v: max(0, (v - 128) * 2))
    x = Image.composite(ImageOps.mirror(im), im, mask_h)
    mask_v = Image.linear_gradient("L").resize((w, h)).point(lambda v: max(0, (v - 128) * 2))
    return Image.composite(ImageOps.flip(x), x, mask_v)

def blend_lr_seam(im, band=96):
    """Equirectangular maps wrap left-to-right: cross-fade a band at the right edge into the left edge's pixels."""
    w, h = im.size
    a = np.asarray(im).astype(np.float32)
    left = a[:, :band]
    for i in range(band):
        t = (i + 1) / band
        col = w - band + i
        a[:, col] = a[:, col] * (1 - t) + left[:, i] * t
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def normal_map(im, strength=2.2, blur=1.0):
    """Height from luminance, Sobel gradients, tangent-space normal (OpenGL +Y up, which is what three.js expects)."""
    g = np.asarray(ImageOps.grayscale(im).filter(ImageFilter.GaussianBlur(blur))).astype(np.float32) / 255.0
    gx = np.roll(g, -1, axis=1) - np.roll(g, 1, axis=1)
    gy = np.roll(g, -1, axis=0) - np.roll(g, 1, axis=0)
    nx, ny, nz = -gx * strength, gy * strength, np.ones_like(g)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    n = np.stack([nx / l, ny / l, nz / l], axis=-1)
    return Image.fromarray(np.clip((n * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8))

def crush_black(im, floor=18):
    """Push near-black to pure black so an additive sprite adds nothing outside its glow."""
    return im.point(lambda v: 0 if v < floor else int((v - floor) * 255 / (255 - floor)))

def main():
    force = "--force" in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    os.makedirs(GEN, exist_ok=True); os.makedirs(PLANETS, exist_ok=True)
    mpath = os.path.join(GEN, "manifest.json")
    manifest = json.load(open(mpath, encoding="utf-8")) if os.path.exists(mpath) else {"items": {}}
    manifest["source"] = "Pollinations.ai free endpoint (FLUX-schnell) via D:/code/Tami/.opus-tools/gen_sprite.call_pollinations; normal maps derived here (Sobel over luminance)"
    done = 0
    for i, (name, (folder, prompt, w, h, post)) in enumerate(ITEMS.items()):
        if only and name not in only: continue
        ext = ".png" if post == "black" else ".jpg"
        out = os.path.join(folder, name + ext)
        rec = manifest["items"].get(name) or {}
        if os.path.exists(out) and not force and rec.get("size") == [w, h]: print("skip", name, "(exists at", w, "x", h, ")"); done += 1; continue
        seed = SEED_BASE + i
        for attempt in range(3):
            try:
                p = call_pollinations(prompt, model="flux", width=w, height=h, seed=seed, enhance=False)
                im = Image.open(p).convert("RGB")
                if im.size != (w, h): im = im.resize((w, h), Image.LANCZOS)
                extra = {}
                if post == "tile":
                    im = make_seamless(im); im.save(out, "JPEG", quality=90, optimize=True)
                    nm = os.path.join(folder, name + "_n.jpg"); normal_map(im).save(nm, "JPEG", quality=90, optimize=True); extra["normal"] = os.path.basename(nm)
                elif post == "equi":
                    im = blend_lr_seam(im); im.save(out, "JPEG", quality=90, optimize=True)
                    nm = os.path.join(folder, name + "_n.jpg"); normal_map(im, strength=1.6, blur=1.5).save(nm, "JPEG", quality=88, optimize=True); extra["normal"] = os.path.basename(nm)
                else:
                    im = crush_black(im); im.save(out, "PNG", optimize=True)
                manifest["items"][name] = dict(file=os.path.basename(out), folder=os.path.basename(folder), prompt=prompt, seed=seed, size=[w, h], post=post, bytes=os.path.getsize(out), when=time.strftime("%Y-%m-%dT%H:%M:%S"), **extra)
                print("OK", name, w, "x", h, os.path.getsize(out), "bytes"); done += 1; break
            except Exception as e:
                print("retry", name, attempt + 1, str(e)[:120]); time.sleep(12)
        else:
            manifest["items"][name] = {"file": None, "prompt": prompt, "seed": seed, "size": [w, h], "error": "3 attempts failed"}; print("FAILED", name)
        json.dump(manifest, open(mpath, "w", encoding="utf-8"), indent=1)
    json.dump(manifest, open(mpath, "w", encoding="utf-8"), indent=1)
    print("DONE", done, "of", len(ITEMS) if not only else len(only))

if __name__ == "__main__":
    main()
