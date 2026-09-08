"""equirect_to_cubemap.py - turn one 2:1 panorama into the six seam-exact faces of a WebGL cube map.

WHY THIS EXISTS. Six independently generated sky faces cannot match at the twelve cube edges, and the mismatch is
the most visible thing in a space skybox: a hard line straight down the sky. Generating ONE equirectangular
panorama and RESAMPLING it into faces makes the seams exact by construction, because every face samples the same
continuous function. The generator then only has to solve the single 360-degree wrap, which circular padding
already does.

THE SHARPNESS PROBLEM, AND THE FIX. A 2048x1024 panorama is a 1:1 sample for 512px faces; asking for 1024px faces
upsamples 2x. For NEBULA that is invisible - it is low-frequency by nature. For STARS it would be fatal: they are
the highest-frequency thing in the image, and an upsampled star is a grey smudge. So stars are not taken from the
panorama at all. They are placed as 3D DIRECTIONS and splatted into each face at its native resolution, which is
both sharp and automatically seam-exact: a star near an edge lands in both faces, at matching sub-pixel positions,
because both faces project the same direction.

Usage:
    py equirect_to_cubemap.py --in nebula.jpg --out-dir <dir> --size 1024 --stars 9000
"""
import argparse, math, os
import numpy as np
from PIL import Image

# WebGL cube-map face bases. For face pixel (a, b) in [-1, 1] these give the world direction.
# three.js CubeTextureLoader takes the files in the order px, nx, py, ny, pz, nz.
FACES = {
    'px': lambda a, b: (np.ones_like(a), -b, -a),
    'nx': lambda a, b: (-np.ones_like(a), -b, a),
    'py': lambda a, b: (a, np.ones_like(a), b),
    'ny': lambda a, b: (a, -np.ones_like(a), -b),
    'pz': lambda a, b: (a, -b, np.ones_like(a)),
    'nz': lambda a, b: (-a, -b, -np.ones_like(a)),
}
ORDER = ['px', 'nx', 'py', 'ny', 'pz', 'nz']

# For projecting a world direction BACK into a face: (major axis, its sign, a-axis, a-sign, b-axis, b-sign)
INV = {
    'px': (0, 1, 2, -1, 1, -1), 'nx': (0, -1, 2, 1, 1, -1),
    'py': (1, 1, 0, 1, 2, 1), 'ny': (1, -1, 0, 1, 2, -1),
    'pz': (2, 1, 0, 1, 1, -1), 'nz': (2, -1, 0, -1, 1, -1),
}


def sample_equirect(img, dx, dy, dz):
    """Bilinear sample of an equirect panorama along unit directions. Wraps in longitude, clamps in latitude."""
    h, w, _ = img.shape
    n = np.sqrt(dx * dx + dy * dy + dz * dz)
    dx, dy, dz = dx / n, dy / n, dz / n
    lon = np.arctan2(dx, -dz)
    lat = np.arcsin(np.clip(dy, -1.0, 1.0))
    u = (lon / (2 * math.pi) + 0.5) * w - 0.5
    v = (0.5 - lat / math.pi) * h - 0.5
    u0 = np.floor(u).astype(np.int64)
    v0 = np.floor(v).astype(np.int64)
    fu = (u - u0)[..., None]
    fv = (v - v0)[..., None]
    u0m = u0 % w
    u1m = (u0 + 1) % w                                  # longitude wraps: this IS the 360 seam, and it is exact
    v0c = np.clip(v0, 0, h - 1)
    v1c = np.clip(v0 + 1, 0, h - 1)
    a = img[v0c, u0m]; b = img[v0c, u1m]
    c = img[v1c, u0m]; d = img[v1c, u1m]
    return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv


def heal_wrap(img, band=96):
    """Remove the residual left/right discontinuity of an equirect panorama.

    MEASURED 2026-09-07: SDXL with every Conv2d switched to circular padding still produced a visible wrap seam
    (0.0596 against an adjacent-column control of 0.0223 - 2.7x). Circular padding wraps the LATENT; the VAE then
    decodes it with `enable_vae_tiling()`, and those tiles do not wrap, so the seam comes back at pixel level.
    Turning tiling off is the root fix but costs the memory headroom a 2048x1024 decode needs.

    So the step is removed rather than hidden: take the per-row discontinuity d = left - right, and ramp half of it
    off each side across `band` columns. The two edges then meet exactly (d becomes 0 by construction) and no
    texture is blurred or duplicated - only a low-frequency correction is added, which is invisible in content
    that has no low-frequency structure at that scale, exactly like a nebula.
    """
    out = img.astype(np.float32).copy()
    d = (out[:, 0] - out[:, -1]) * 0.5                      # half the step, per row, per channel
    ramp = np.linspace(1.0, 0.0, band, dtype=np.float32)[None, :, None]
    out[:, :band] -= d[:, None, :] * ramp
    out[:, -band:] += d[:, None, :] * ramp[:, ::-1]
    return np.clip(out, 0.0, 1.0)


def face_dirs(face, size):
    """Unit directions for every pixel of one face, sampled at pixel CENTRES."""
    t = (np.arange(size) + 0.5) / size * 2.0 - 1.0
    a, b = np.meshgrid(t, t)
    dx, dy, dz = FACES[face](a, b)
    n = np.sqrt(dx * dx + dy * dy + dz * dz)
    return dx / n, dy / n, dz / n


def make_stars(count, seed=7):
    """Stars as DIRECTIONS, not pixels. Real starfields are mostly warm; a minority are hot blue."""
    rng = np.random.default_rng(seed)
    v = rng.normal(size=(count, 3))
    v /= np.linalg.norm(v, axis=1, keepdims=True)
    mag = rng.power(0.42, count)                        # steep: most stars faint, a handful carry the sky
    hot = rng.random(count) < 0.22
    warm = np.array([1.00, 0.86, 0.68], np.float32)
    blue = np.array([0.72, 0.83, 1.00], np.float32)
    col = np.where(hot[:, None], blue, warm).astype(np.float32)
    col = col * (1.0 - rng.random((count, 1)).astype(np.float32) * 0.35)
    return v.astype(np.float32), mag.astype(np.float32), col


def splat_stars(buf, face, size, dirs, mag, col, gain):
    """Project every star into this face and splat it. A star outside the face produces no pixels; a star ON an
    edge lands in both faces at matching positions, which is what keeps the seams exact."""
    ax, sgn, ai, asg, bi, bsg = INV[face]
    major = dirs[:, ax] * sgn
    ok = major > 1e-6
    if not ok.any():
        return 0
    d = dirs[ok]; m = mag[ok]; c = col[ok]
    mj = d[:, ax] * sgn
    a = (d[:, ai] * asg) / mj
    b = (d[:, bi] * bsg) / mj
    inside = (np.abs(a) <= 1.02) & (np.abs(b) <= 1.02)  # 2% margin so an edge star draws on BOTH faces
    a, b, m, c = a[inside], b[inside], m[inside], c[inside]
    px = (a * 0.5 + 0.5) * size - 0.5
    py = (b * 0.5 + 0.5) * size - 0.5
    sig = 0.62 + m * 0.55                               # a bright star is the same point, it just saturates more
    rad = 3
    yy, xx = np.mgrid[-rad:rad + 1, -rad:rad + 1]
    drawn = 0
    for i in range(len(px)):
        x0 = int(round(px[i])); y0 = int(round(py[i]))
        xs0 = max(0, x0 - rad); ys0 = max(0, y0 - rad)
        xs1 = min(size, x0 + rad + 1); ys1 = min(size, y0 + rad + 1)
        if xs1 <= xs0 or ys1 <= ys0:
            continue
        gx = xx + x0 - px[i]; gy = yy + y0 - py[i]
        g = np.exp(-(gx * gx + gy * gy) / (2 * sig[i] * sig[i])) * (m[i] ** 1.6) * gain
        sub = g[ys0 - (y0 - rad):ys1 - (y0 - rad), xs0 - (x0 - rad):xs1 - (x0 - rad)]
        buf[ys0:ys1, xs0:xs1] += sub[..., None] * c[i]
        drawn += 1
    return drawn


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--in', dest='src', required=True)
    ap.add_argument('--out-dir', required=True)
    ap.add_argument('--prefix', default='sky_')
    ap.add_argument('--size', type=int, default=1024)
    ap.add_argument('--stars', type=int, default=9000)
    ap.add_argument('--star-gain', type=float, default=1.35)
    ap.add_argument('--exposure', type=float, default=1.0)
    ap.add_argument('--quality', type=int, default=92)
    ap.add_argument('--heal-wrap', type=int, default=96, help='columns to ramp the wrap discontinuity over; 0 disables')
    args = ap.parse_args()

    pano = np.asarray(Image.open(args.src).convert('RGB')).astype(np.float32) / 255.0
    before = float(np.abs(pano[:, 0] - pano[:, -1]).mean())
    ctrl = float(np.abs(pano[:, 0] - pano[:, 1]).mean())
    if args.heal_wrap:
        pano = heal_wrap(pano, args.heal_wrap)
    after = float(np.abs(pano[:, 0] - pano[:, -1]).mean())
    print('panorama %dx%d  mean %.4f' % (pano.shape[1], pano.shape[0], pano.mean()))
    print('  wrap seam %.5f -> %.5f   (adjacent-column control %.5f)  %s'
          % (before, after, ctrl, 'OK' if after <= ctrl * 1.2 else 'STILL SEAMED'))
    dirs, mag, col = make_stars(args.stars)

    faces = {}
    for f in ORDER:
        dx, dy, dz = face_dirs(f, args.size)
        buf = sample_equirect(pano, dx, dy, dz) * args.exposure
        n = splat_stars(buf, f, args.size, dirs, mag, col, args.star_gain)
        faces[f] = np.clip(buf, 0.0, 1.0)
        print('  %s  %5d stars  mean %.4f  p99 %.4f' % (f, n, faces[f].mean(), np.percentile(faces[f], 99)))

    os.makedirs(args.out_dir, exist_ok=True)
    for f in ORDER:
        p = os.path.join(args.out_dir, args.prefix + f + '.jpg')
        Image.fromarray((faces[f] * 255 + 0.5).astype(np.uint8)).save(p, 'JPEG', quality=args.quality)
        print('wrote %s  %.1f KB' % (p, os.path.getsize(p) / 1024))

    seam_report(faces, args.size)


def project_into(face, d):
    """World directions -> (x, y) pixel coords on `face`, plus a mask of which ones actually land on it."""
    ax, sgn, ai, asg, bi, bsg = INV[face]
    mj = d[:, ax] * sgn
    ok = mj > 1e-9
    a = np.zeros(len(d), np.float64); b = np.zeros(len(d), np.float64)
    a[ok] = (d[ok, ai] * asg) / mj[ok]
    b[ok] = (d[ok, bi] * bsg) / mj[ok]
    ok &= (np.abs(a) <= 1.0 + 1e-9) & (np.abs(b) <= 1.0 + 1e-9)
    return a, b, ok


def bilinear(img, x, y):
    h, w, _ = img.shape
    x = np.clip(x, 0, w - 1.001); y = np.clip(y, 0, h - 1.001)
    x0 = np.floor(x).astype(np.int64); y0 = np.floor(y).astype(np.int64)
    fx = (x - x0)[..., None]; fy = (y - y0)[..., None]
    a = img[y0, x0]; b = img[y0, x0 + 1]; c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def seam_report(faces, size):
    """The check that matters, and it has to be able to FAIL.

    Take the outer border pixels of face A, turn them into world directions, and step each one slightly ACROSS
    the edge so it now belongs to the neighbouring face. Find which face owns it, sample that face's RENDERED
    image there, and compare against A's own border pixel. A wrong axis convention, a flipped face or an
    off-by-one in the sampler all show up here as a large number; only a genuinely continuous sky reads small.
    Reported against a control: the same comparison against a face picked at random, which is what "no
    agreement at all" looks like on this image.
    """
    eps = 2.2 / size                                       # just over one pixel, in face-normalised units
    rows = []
    for f1 in ORDER:
        d = np.stack(face_dirs(f1, size), axis=-1)
        for name, border, push in (('top', d[0], (0, -1)), ('bottom', d[-1], (0, 1)),
                                   ('left', d[:, 0], (-1, 0)), ('right', d[:, -1], (1, 0))):
            ax, sgn, ai, asg, bi, bsg = INV[f1]
            out = border.copy()
            out[:, ai] += asg * push[0] * eps * np.abs(out[:, ax])
            out[:, bi] += bsg * push[1] * eps * np.abs(out[:, ax])
            out /= np.linalg.norm(out, axis=1, keepdims=True)
            mine = faces[f1][0 if name == 'top' else (size - 1 if name == 'bottom' else slice(None)),
                             0 if name == 'left' else (size - 1 if name == 'right' else slice(None))]
            got = np.zeros_like(mine); hit = np.zeros(len(out), bool)
            for f2 in ORDER:
                if f2 == f1:
                    continue
                a, b, ok = project_into(f2, out)
                ok &= ~hit
                if not ok.any():
                    continue
                got[ok] = bilinear(faces[f2], (a[ok] * 0.5 + 0.5) * size - 0.5, (b[ok] * 0.5 + 0.5) * size - 0.5)
                hit |= ok
            rows.append((f1, name, float(np.abs(mine[hit] - got[hit]).mean()) if hit.any() else float('nan'),
                         int(hit.sum()), len(out)))
    worst = max(r[2] for r in rows)
    ctrl = float(np.abs(faces['px'] - faces['nz']).mean())      # the null case: two unrelated faces
    for f1, name, diff, hit, tot in rows:
        if diff > 0.02:
            print('  SEAM %s/%-6s diff %.4f  (%d/%d matched)' % (f1, name, diff, hit, tot))
    print('  worst of 24 borders: %.4f      control (two unrelated faces): %.4f' % (worst, ctrl))
    print('  VERDICT: %s' % ('seamless' if worst < ctrl * 0.25 else 'SEAM VISIBLE - do not ship'))


if __name__ == '__main__':
    main()
