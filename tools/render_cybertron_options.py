#!/usr/bin/env python3
"""render_cybertron_options.py - offline equirectangular->lit-sphere renderer (task C5).

Renders the three machine-world OPTIONS through ONE identical pipeline so they compare
honestly side by side, and prints a real measurement block per render (disc mean, lit-face
mean, emissive mean, centre/edge ratio) taken FROM the produced pixels, not asserted. This
is the reproducer behind the C5 decision artifact; it is a comparison instrument, not the
shipping renderer - the shipped look is cybertron.js's three.js displaced PBR mesh.

  A  procedural surface (assets/gen_cybertron.py)        iron, flat-mapped, smooth normals
  B  generator-art hybrid (assets/gen_painted_cybertron) painted_cybertron
  C  displaced PBR mesh (cybertron.js, SHIPPED)          iron, height-displaced + AO + rim

C shares A's surface on purpose: the comparison isolates exactly what the proper mesh adds.

    py -3.13 tools/render_cybertron_options.py          # PNGs -> $RENDER_OUT or cwd
"""
import os, numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PL = os.path.join(os.path.dirname(HERE), 'assets', 'planets')   # <repo>/assets/planets
OUT = os.environ.get('RENDER_OUT') or os.getcwd()

N = 720                       # canvas px (square)
R = 330.0                     # disc radius px
CX = CY = N / 2.0
LON0 = 0.35                   # fixed world rotation (radians) so an interesting face shows
LDIR = np.array([-0.45, 0.42, 0.79]); LDIR = LDIR / np.linalg.norm(LDIR)  # key light
AMBIENT = 0.14
SKIN_DARK = 0.62             # ~cybertron.js SKIN_DARK: keeps the world dark by construction
EMIS_GAIN = 1.05

def load(name, size=None):
    im = Image.open(os.path.join(PL, name)).convert('RGB')
    if size: im = im.resize(size, Image.BILINEAR)
    return np.asarray(im).astype(np.float32) / 255.0

def sample(tex, u, v):
    """equirectangular sample (nearest, for speed); u wraps in longitude, v clamps."""
    h, w = tex.shape[:2]
    xu = (u % 1.0) * (w - 1)
    yv = np.clip(v, 0, 1) * (h - 1)
    return tex[yv.astype(np.int32), xu.astype(np.int32)]

def geom():
    py, px = np.mgrid[0:N, 0:N].astype(np.float32)
    nx = (px - CX) / R
    ny = -(py - CY) / R           # image y is down
    r2 = nx * nx + ny * ny
    disc = r2 <= 1.0
    nz = np.sqrt(np.clip(1.0 - r2, 0, 1))
    N3 = np.stack([nx, ny, nz], axis=-1)   # view-space surface normal
    lon = np.arctan2(N3[..., 0], N3[..., 2]) + LON0
    lat = np.arcsin(np.clip(N3[..., 1], -1, 1))
    return disc, nz, N3, 0.5 + lon / (2 * np.pi), 0.5 - lat / np.pi

def render(albedo, emissive, height=None, ao=None, pbr=False, atmo_tint=None):
    disc, nz, N3, u, v = geom()
    alb = sample(albedo, u, v)
    emi = sample(emissive, u, v) if emissive is not None else np.zeros_like(alb)
    Npert = N3.copy()
    if pbr and height is not None:
        # relief from the height map (offline stand-in for cybertron.js displacementMap
        # DISPLACE 0.055 + NORMAL_SCALE 1.15): perturb the normal by its screen gradient.
        hmap = sample(height, u, v).mean(axis=-1)
        gy, gx = np.gradient(hmap)
        s = 4.2
        Npert = N3 + np.stack([-gx * s, gy * s, np.zeros_like(gx)], axis=-1)
        Npert /= (np.linalg.norm(Npert, axis=-1, keepdims=True) + 1e-6)
    diff = np.clip((Npert * LDIR).sum(axis=-1), 0, 1)[..., None]
    shade = AMBIENT + (1 - AMBIENT) * diff
    aomap = np.power(sample(ao, u, v).mean(axis=-1), 1.5)[..., None] if (pbr and ao is not None) else 1.0
    col = alb * shade * SKIN_DARK * aomap + emi * EMIS_GAIN
    if atmo_tint is not None:                     # fresnel rim (cybertron.js ATMO_OPACITY 0.30)
        col = col + np.power(1.0 - nz, 2.6)[..., None] * np.array(atmo_tint, np.float32) * 1.7
    col = np.clip(col, 0, 1)
    rng = np.random.default_rng(7)
    bg = np.zeros((N, N, 3), np.float32)
    stars = rng.random((N, N)) > 0.9975
    bg[stars] = (0.6 + 0.4 * rng.random((stars.sum(), 1)))
    if atmo_tint is not None:                     # ionised-haze shell 5.5-7.5% past the limb
        py, px = np.mgrid[0:N, 0:N].astype(np.float32)
        rr = np.sqrt(((px - CX) / R) ** 2 + ((py - CY) / R) ** 2)
        shell = (rr > 1.0) & (rr < 1.075)
        glow = np.clip(1.0 - (rr - 1.0) / 0.075, 0, 1) ** 1.6
        bg = bg + (shell[..., None] * glow[..., None] * np.array(atmo_tint, np.float32) * 2.4)
    out = np.clip(np.where(disc[..., None], col, bg), 0, 1)
    img = (out * 255).astype(np.uint8)
    lum = (0.2126 * col[..., 0] + 0.7152 * col[..., 1] + 0.0722 * col[..., 2]) * 255
    lit = disc & (diff[..., 0] > 0.30)
    py, px = np.mgrid[0:N, 0:N].astype(np.float32)
    rr = np.sqrt(((px - CX) / R) ** 2 + ((py - CY) / R) ** 2)
    centre = disc & (rr < 0.30); edge = disc & (rr > 0.70) & (rr < 0.95)
    m = dict(disc_mean=float(lum[disc].mean()),
             lit_mean=float(lum[lit].mean()) if lit.any() else 0.0,
             emis_mean=float((emi.mean(axis=-1))[disc].mean() * 255),
             centre_edge=float(lum[centre].mean() / max(lum[edge].mean(), 1e-6)),
             lit_frac=float(lit.sum() / disc.sum()))
    return Image.fromarray(img), m

def main():
    os.makedirs(OUT, exist_ok=True)
    a_alb, a_emi = load('machine_iron.jpg', (2048, 1024)), load('machine_iron_e.jpg', (2048, 1024))
    jobs = [
        ('A', 'option_a.png', dict(albedo=a_alb, emissive=a_emi)),
        ('B', 'option_b.png', dict(albedo=load('painted_cybertron.jpg', (2048, 1024)),
                                    emissive=load('painted_cybertron_e.jpg', (2048, 1024)))),
        ('C', 'option_c.png', dict(albedo=a_alb, emissive=a_emi,
                                    height=load('machine_iron_h.jpg', (2048, 1024)),
                                    ao=load('machine_iron_ao.jpg', (2048, 1024)),
                                    pbr=True, atmo_tint=(0.10, 0.20, 0.42))),
    ]
    for k, fn, kw in jobs:
        img, m = render(**kw)
        p = os.path.join(OUT, fn); img.save(p)
        print(f"OPTION {k}: disc_mean={m['disc_mean']:.1f} lit_mean={m['lit_mean']:.1f} "
              f"emis_mean={m['emis_mean']:.2f} centre/edge={m['centre_edge']:.2f} "
              f"lit_frac={m['lit_frac']:.2f}  -> {p}")

if __name__ == '__main__':
    main()
