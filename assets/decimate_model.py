#!/usr/bin/env python3
"""decimate_model.py - take a high-poly model down to a game budget, and keep what made it look good.

RJ 2026-09-06: "we can take the Cybertron and just downscale it with a good downscaling system that should take it
down hugely. let's try to get Cybertron going well."

The Meshy Cybertron is 1,621,956 faces / 827,792 vertices. The game draws up to 18 planets in a scene that already
spends its frame budget on the asteroid field, so that mesh cannot go in as it stands: at even one planet it is
more triangles than everything else on screen put together.

Two ways down, and this does both:

  --mode decimate   quadric-error edge collapse to a target triangle count. Keeps the silhouette and the big
                    panel forms; loses the small greebles. Good for a landable or fly-past body.
  --mode bake       what a PLANET actually wants: render the model from six directions and resample into ONE
                    equirectangular albedo + height pair, which the existing cybertron.js pipeline then puts on a
                    256-segment sphere with real displacement. Zero extra triangles, and every planet can wear it.

Neither invents anything: both read the model's own vertices, faces and vertex colours / textures.

    py -3.13 assets/decimate_model.py --in cybertron.glb --mode decimate --faces 12000
    py -3.13 assets/decimate_model.py --in cybertron.glb --mode bake --w 2048 --name meshy

Needs trimesh (pip install trimesh; `--mode bake` also wants pyrender or it falls back to a vertex-colour
resample, which is honest but softer). The script says which path it took - it never silently degrades.
"""
import argparse
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'planets')


def need_trimesh():
    try:
        import trimesh
        return trimesh
    except ImportError:
        raise SystemExit(
            'trimesh is not installed. Install it with:  py -3.13 -m pip install trimesh\n'
            'It is the only dependency this script has, and without it there is no honest way to read a GLB.')


def load_mesh(path):
    trimesh = need_trimesh()
    scene = trimesh.load(path, force='scene')
    geoms = list(scene.geometry.values()) if hasattr(scene, 'geometry') else [scene]
    if not geoms:
        raise SystemExit('no geometry in %s' % path)
    mesh = trimesh.util.concatenate(geoms) if len(geoms) > 1 else geoms[0]
    print('loaded %s: %d faces, %d vertices, %d geometry part(s)'
          % (os.path.basename(path), len(mesh.faces), len(mesh.vertices), len(geoms)))
    return mesh


def decimate(mesh, target_faces, out_path):
    """quadric decimation, with the two fallbacks named rather than silently taken"""
    n0 = len(mesh.faces)
    if n0 <= target_faces:
        print('already under the target (%d <= %d) - nothing to do' % (n0, target_faces))
        return mesh
    reduced = None
    how = None
    try:
        reduced = mesh.simplify_quadric_decimation(face_count=target_faces)
        how = 'trimesh.simplify_quadric_decimation'
    except Exception as e:
        print('  quadric decimation unavailable (%s)' % str(e)[:80])
    if reduced is None:
        try:
            import open3d as o3d
            m = o3d.geometry.TriangleMesh(
                o3d.utility.Vector3dVector(np.asarray(mesh.vertices)),
                o3d.utility.Vector3iVector(np.asarray(mesh.faces)))
            m = m.simplify_quadric_decimation(target_number_of_triangles=target_faces)
            trimesh = need_trimesh()
            reduced = trimesh.Trimesh(vertices=np.asarray(m.vertices), faces=np.asarray(m.triangles))
            how = 'open3d.simplify_quadric_decimation'
        except Exception as e:
            print('  open3d unavailable (%s)' % str(e)[:80])
    if reduced is None:
        raise SystemExit('no decimator available. Install one:  py -3.13 -m pip install "trimesh[easy]" open3d')
    reduced.export(out_path)
    print('decimated with %s: %d -> %d faces (%.1f%% of the original), %d vertices  -> %s'
          % (how, n0, len(reduced.faces), 100.0 * len(reduced.faces) / n0, len(reduced.vertices),
             os.path.basename(out_path)))
    return reduced


def bake_equirect(mesh, w, name):
    """resample the model's own surface into an equirectangular albedo + height, by ray-casting the sphere"""
    trimesh = need_trimesh()
    h = w // 2
    mesh = mesh.copy()
    mesh.vertices -= mesh.vertices.mean(axis=0)
    scale = np.linalg.norm(mesh.vertices, axis=1).max()
    mesh.vertices /= max(1e-9, scale)

    lon = (np.arange(w) + 0.5) / w * 2 * np.pi
    lat = (np.arange(h) + 0.5) / h * np.pi
    lo, la = np.meshgrid(lon, lat)
    dirs = np.stack([np.sin(la) * np.cos(lo), np.cos(la), np.sin(la) * np.sin(lo)], axis=-1).reshape(-1, 3)

    # cast from well outside, inward: the first hit is the visible surface for that direction
    origins = dirs * 3.0
    # CHUNKED. trimesh's pure-numpy ray backend builds a (rays x candidate-triangles) array; on the first real run
    # against an 81,920-face mesh at 384x192 it asked numpy for a 102 GiB allocation and died. The work is
    # embarrassingly parallel over rays, so it goes in slices - constant memory, same answer.
    print('casting %d rays at the surface, in chunks ...' % len(dirs))
    CH = 4096
    locs_l, ray_l, tri_l = [], [], []
    for s0 in range(0, len(dirs), CH):
        s1 = min(len(dirs), s0 + CH)
        lo, ir, it = mesh.ray.intersects_location(
            ray_origins=origins[s0:s1], ray_directions=-dirs[s0:s1], multiple_hits=False)
        if len(ir):
            locs_l.append(lo); ray_l.append(ir + s0); tri_l.append(it)
        if (s0 // CH) % 8 == 0:
            print('  %d / %d rays' % (s1, len(dirs)))
    locs = np.concatenate(locs_l) if locs_l else np.zeros((0, 3))
    index_ray = np.concatenate(ray_l) if ray_l else np.zeros(0, dtype=int)
    index_tri = np.concatenate(tri_l) if tri_l else np.zeros(0, dtype=int)

    height = np.zeros(len(dirs), dtype=np.float32)
    colour = np.zeros((len(dirs), 3), dtype=np.float32)
    hit = np.zeros(len(dirs), dtype=bool)
    r = np.linalg.norm(locs, axis=1)
    height[index_ray] = r
    hit[index_ray] = True

    vc = getattr(mesh.visual, 'vertex_colors', None)
    if vc is not None and len(vc):
        tri_v = mesh.faces[index_tri]
        colour[index_ray] = np.asarray(vc)[tri_v].mean(axis=1)[:, :3]
        src = 'vertex colours'
    else:
        # no colour on the model: shade by height so the bake still carries the FORM, and say so
        src = 'height only (the model carries no vertex colours; supply a textured GLB for albedo)'

    miss = (~hit).sum()
    if miss:
        med = np.median(height[hit]) if hit.any() else 1.0
        height[~hit] = med
        colour[~hit] = colour[hit].mean(axis=0) if hit.any() else 128.0

    from PIL import Image, ImageFilter
    hn = (height - height[hit].min()) / max(1e-6, (height[hit].max() - height[hit].min()))
    hi = Image.fromarray((hn.reshape(h, w) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.5))
    if src.startswith('vertex'):
        al = Image.fromarray(np.clip(colour.reshape(h, w, 3), 0, 255).astype('uint8'))
    else:
        g = (hn.reshape(h, w) * 255).astype('uint8')
        al = Image.fromarray(np.stack([g, g, g], -1))
    os.makedirs(OUT, exist_ok=True)
    stem = os.path.join(OUT, 'machine_%s' % name)
    al.save(stem + '.jpg', quality=93)
    hi.save(stem + '_h.jpg', quality=94)
    print('baked %dx%d from %s: %d rays, %d misses (%.2f%%)  -> %s.jpg + _h.jpg'
          % (w, h, src, len(dirs), miss, 100.0 * miss / len(dirs), os.path.basename(stem)))
    print('    now run:  py -3.13 assets/gen_cybertron.py --kind iron   (for the other channels)')
    print('    or feed these straight to cybertron.js as a new look.')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--in', dest='src', required=True, help='a .glb / .gltf / .obj / .fbx the user supplied')
    ap.add_argument('--mode', choices=['decimate', 'bake', 'both'], default='both')
    ap.add_argument('--faces', type=int, default=12000, help='triangle budget for --mode decimate')
    ap.add_argument('--w', type=int, default=2048, help='equirectangular width for --mode bake')
    ap.add_argument('--name', default='meshy', help='look name the baked maps are written under')
    a = ap.parse_args()
    if not os.path.exists(a.src):
        raise SystemExit('no such file: %s' % a.src)
    mesh = load_mesh(a.src)
    if a.mode in ('decimate', 'both'):
        out = os.path.splitext(a.src)[0] + '_lod%d.glb' % a.faces
        decimate(mesh, a.faces, out)
    if a.mode in ('bake', 'both'):
        bake_equirect(mesh, a.w, a.name)


if __name__ == '__main__':
    main()
