"""First-pass weapon models for the caveman, built in Blender from code.

Run:  python weapons.py [-- item_id ...]   (needs the `bpy` package: pip install bpy)
Writes public/models/weapons/<id>.glb (raw; run optimize.sh after) and renders to SHOTS.

Every file is in the same "held" space: the grip end (butt) at the origin, the weapon pointing
up +Z in Blender (+Y in glTF), sized so zack's club is 1.0 long. The game scales that to the hand
(src/scene/models.js, heldWeapon), so a replacement model only has to follow the same convention.
The club-based weapons reuse zack's club.glb (re-seated into this space) so they match his art.
"""
import sys, os, math, random
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'wearables'))
import bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix, noise
from gearlib import mat, prim, horn, cord, paint, gradient, finish, join, bumps, subsurf, new_obj, tube, linspace
from common import cam_render, REPO

OUT = os.path.join(REPO, 'public/models/weapons')
SHOTS = os.environ.get('SHOTS', os.path.join(REPO, 'tools/weapons/shots'))  # renders, not committed

BONE = ((0.92, 0.87, 0.74), (0.72, 0.64, 0.50))
IVORY = ((0.95, 0.90, 0.78), (0.80, 0.72, 0.56))
FLINT = ((0.42, 0.44, 0.48), (0.16, 0.17, 0.20))
STONE = ((0.58, 0.55, 0.50), (0.36, 0.33, 0.29))
CORD = ((0.50, 0.36, 0.22), (0.30, 0.21, 0.12))
LEATHER = ((0.40, 0.25, 0.14), (0.24, 0.14, 0.08))
WOLF = ((0.62, 0.61, 0.58), (0.28, 0.27, 0.26))

M = lambda: mat('wpn', rough=0.85)
M_SHINY = lambda: mat('wpn_shiny', rough=0.3)


def P(o, pal, scale=40, sharp=1.6, seed=0, **kw):
    paint(o, pal[0], pal[1], scale=scale, sharp=sharp, seed=seed, **kw)
    return o


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    from gearlib import MATS
    MATS.clear()


# ------------------------------------------------------------------ zack's club, re-seated
def club(tint=None):
    """Import club.glb and move it so the thin end is at the origin and it points +Z, 1.0 long.
    tint(rgb array) -> rgb array recolours a copy of its texture."""
    bpy.ops.import_scene.gltf(filepath=os.path.join(REPO, 'public/models/club.glb'))
    o = [x for x in bpy.context.selected_objects if x.type == 'MESH'][0]
    o.data.transform(o.matrix_world)
    o.matrix_world = Matrix()
    pts = [v.co.copy() for v in o.data.vertices]
    c = sum(pts, Vector()) / len(pts)
    a = max(pts, key=lambda p: (p - c).length)
    b = max(pts, key=lambda p: (p - a).length)
    axis = (b - a).normalized()
    L = (b - a).length

    def girth(lo, hi):
        s = n = 0
        for p in pts:
            d = p - a
            t = d.dot(axis) / L
            if lo <= t <= hi:
                s += (d - axis * d.dot(axis)).length; n += 1
        return s / max(n, 1)
    if girth(0, 0.2) > girth(0.8, 1):
        a, b = b, a
        axis = -axis
    q = axis.rotation_difference(Vector((0, 0, 1)))
    o.data.transform(Matrix.Translation(-a))
    o.data.transform(q.to_matrix().to_4x4())
    o.data.transform(Matrix.Scale(1 / L, 4))
    # recentre the shaft on the Z axis (the farthest-point line runs along the surface)
    xs = [v.co for v in o.data.vertices if v.co.z < 0.25]
    cx = sum(v.x for v in xs) / len(xs); cy = sum(v.y for v in xs) / len(xs)
    o.data.transform(Matrix.Translation((-cx * 0.5, -cy * 0.5, 0)))
    o.name = 'club'
    if tint:
        m = o.data.materials[0].copy()
        o.data.materials[0] = m
        tex = [n for n in m.node_tree.nodes if n.type == 'TEX_IMAGE'][0]
        img = tex.image.copy()
        w, h = img.size
        px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
        px[..., :3] = tint(px[..., :3], h, w)
        img.pixels[:] = px.ravel()
        img.pack()
        tex.image = img
    return o


def radius_at(o, z, band=0.03):
    """Mean distance of the club's surface from the Z axis around height z."""
    r = [math.hypot(v.co.x, v.co.y) for v in o.data.vertices if abs(v.co.z - z) < band]
    return sum(r) / len(r) if r else 0.05


def centre_at(o, z, band=0.03):
    vs = [v.co for v in o.data.vertices if abs(v.co.z - z) < band]
    return Vector((sum(v.x for v in vs) / len(vs), sum(v.y for v in vs) / len(vs), z))


def lashing(name, o, z, turns=3, gap=0.012, r=0.0045, extra=0.004, seed=0):
    """Cord wound round the club at height z."""
    rnd = random.Random(seed)
    out = []
    for i in range(turns):
        zz = z + (i - (turns - 1) / 2) * gap
        rad = radius_at(o, zz, 0.015) + extra
        c = centre_at(o, zz, 0.02)
        pts = [(c.x + math.cos(t) * rad, c.y + math.sin(t) * rad, zz + math.sin(t * 2 + i) * 0.002)
               for t in [2 * math.pi * k / 14 for k in range(14)]]
        out.append(cord(f'{name}{i}', pts, r=r, closed=True))
    w = join(name, out)
    return P(w, CORD, scale=90, seed=seed)


def shard(name, loc, direction, length, width, thick, seed=0, facets=True):
    """A knapped flint blade: a flattened, chipped pyramid pointing along `direction`."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    d = Vector(direction).normalized()
    side = d.cross(Vector((0, 0, 1)))
    if side.length < 1e-3:
        side = d.cross(Vector((1, 0, 0)))
    side.normalize()
    up = side.cross(d).normalized()
    base = Vector(loc)
    ring = []
    n = 6
    for k in range(n):
        a = 2 * math.pi * k / n
        j = 0.8 + 0.4 * rnd.random()
        ring.append(bm.verts.new(base + side * math.cos(a) * width * j + up * math.sin(a) * thick * j))
    mid = []
    for k in range(n):
        a = 2 * math.pi * (k + 0.5) / n
        j = 0.7 + 0.5 * rnd.random()
        mid.append(bm.verts.new(base + d * length * 0.45 + side * math.cos(a) * width * 0.8 * j + up * math.sin(a) * thick * 0.7 * j))
    tip = bm.verts.new(base + d * length + side * (rnd.random() - 0.5) * width * 0.2)
    for k in range(n):
        k2 = (k + 1) % n
        bm.faces.new((ring[k], ring[k2], mid[k]))
        bm.faces.new((ring[k2], mid[k2], mid[k]))
        bm.faces.new((mid[k], mid[k2], tip))
    bm.faces.new(list(reversed(ring)))
    return new_obj(name, bm)


def knapped_stone(name, loc, size, seed=0):
    o = prim('ico', name, loc, scale=size, subdivisions=1)
    rnd = random.Random(seed)
    for v in o.data.vertices:
        v.co += Vector((rnd.random() - .5, rnd.random() - .5, rnd.random() - .5)) * 0.25 * min(size)
    return o


# ------------------------------------------------------------------ weapons
def cracked_club():
    def weather(rgb, h, w):
        g = rgb.mean(axis=2, keepdims=True)
        out = rgb * 0.45 + g * 0.55        # bleached, grey
        return np.clip(out * 0.85 + 0.03, 0, 1)
    c = club(weather)
    c.data.transform(Matrix.Scale(0.94, 4))
    # the split: a dark jagged sliver down one side of the head, and a chipped notch at the tip
    rnd = random.Random(3)
    bm = bmesh.new()
    rows = []
    for i in range(14):
        z = 0.48 + i * 0.032
        r = radius_at(c, z, 0.02) * 1.01
        a = -0.35 + (rnd.random() - 0.5) * 0.18
        cen = centre_at(c, z, 0.02)
        p = cen + Vector((math.cos(a) * r, math.sin(a) * r, 0))
        wdt = 0.006 + 0.008 * math.sin(i / 13 * math.pi)
        t = Vector((-math.sin(a), math.cos(a), 0))
        rows.append((bm.verts.new(p - t * wdt), bm.verts.new(p + t * wdt)))
    for (a0, b0), (a1, b1) in zip(rows, rows[1:]):
        bm.faces.new((a0, b0, b1, a1))
    crack = new_obj('crack', bm)
    gradient(crack, lambda v: (0.10, 0.07, 0.05))
    finish(crack, M(), smooth=False)
    # a second, shorter crack on the other side
    bind = lashing('bind', c, 0.62, turns=3, seed=1)
    bind2 = lashing('bind2', c, 0.36, turns=2, seed=2)
    return [c, finish(join('cracked_club_bits', [bind, bind2]), M()), crack]


def stone_club():
    c = club()
    c.data.transform(Matrix.Scale(0.92, 4))
    top = 0.92
    zc = top - 0.12
    cen = centre_at(c, zc, 0.03)
    r = radius_at(c, zc, 0.03)
    # a knapped hand-axe stone lashed across the head, sticking out on both sides
    st = knapped_stone('stone', (cen.x, cen.y, zc), (0.25, 0.09, 0.10), seed=4)
    for v in st.data.vertices:  # taper both ends to rough edges
        k = abs(v.co.x - cen.x) / 0.25
        v.co.y = cen.y + (v.co.y - cen.y) * (1 - 0.5 * k)
        v.co.z = zc + (v.co.z - zc) * (1 - 0.35 * k)
    P(st, STONE, scale=60, sharp=2.0)
    finish(st, M(), smooth=False)
    # criss-cross lashing over the stone
    ties = []
    for s in (-1, 1):
        pts = []
        for k in range(16):
            t = 2 * math.pi * k / 16
            pts.append((cen.x + math.cos(t) * (r + 0.012) + s * 0.03 * math.sin(t), cen.y + math.sin(t) * (r + 0.03), zc + s * 0.045 * math.cos(t)))
        ties.append(cord(f'x{s}', pts, r=0.006, closed=True))
    ties = P(join('ties', ties), CORD, scale=90)
    wrap = lashing('wrap', c, zc - 0.1, turns=3, seed=5)
    grip = lashing('grip', c, 0.12, turns=5, gap=0.016, r=0.006, seed=6)
    return [c, finish(join('stone_club_bits', [ties, wrap, grip]), M()), st]


def flint_club():
    c = club()
    shards = []
    rnd = random.Random(7)
    # rows of flint blades set into the head, jutting out like teeth
    for i, z in enumerate((0.60, 0.70, 0.80, 0.89)):
        r = radius_at(c, z, 0.025)
        cen = centre_at(c, z, 0.025)
        for k in range(3):
            a = (i * 0.9 + k * 2 * math.pi / 3) + (rnd.random() - 0.5) * 0.4
            d = Vector((math.cos(a), math.sin(a), 0.25 + 0.15 * rnd.random()))
            p = cen + Vector((math.cos(a), math.sin(a), 0)) * (r * 0.75)
            shards.append(shard(f's{i}{k}', p, d, 0.085 + 0.03 * rnd.random(), 0.05, 0.013, seed=i * 3 + k))
    tipd = shard('tip', centre_at(c, 0.95, 0.03), (0, 0, 1), 0.13, 0.04, 0.014, seed=99)
    fl = join('flint', shards + [tipd])
    P(fl, FLINT, scale=120, sharp=1.8)
    finish(fl, M_SHINY(), smooth=False)
    wraps = join('wraps', [lashing('w1', c, 0.55, turns=2, seed=1), lashing('grip', c, 0.12, turns=5, gap=0.016, r=0.006, seed=6)])
    return [c, finish(wraps, M()), fl]


def grip_wrap(name, z0, z1, r, turns=7, cr=0.007, seed=0):
    pts = []
    n = turns * 10
    for k in range(n + 1):
        t = k / n
        a = 2 * math.pi * turns * t
        pts.append((math.cos(a) * r, math.sin(a) * r, z0 + (z1 - z0) * t))
    return cord(name, pts, r=cr)


def alpha_fang():
    # bone grip with a leather spiral, a wolf-fur collar, and a great curved fang as the blade
    grip = prim('cyl', 'grip', (0, 0, 0.16), scale=(0.028, 0.028, 0.16), vertices=12)
    P(grip, BONE, scale=50)
    pommel = prim('sphere', 'pommel', (0, 0, 0.0), scale=(0.045, 0.045, 0.035), segments=12, ring_count=8)
    P(pommel, BONE, scale=50, seed=2)
    wrapc = grip_wrap('wrap', 0.04, 0.28, 0.031, turns=6, cr=0.0075)
    P(wrapc, LEATHER, scale=80)
    fur = []
    rnd = random.Random(11)
    for k in range(18):
        a = 2 * math.pi * k / 18 + rnd.random() * 0.3
        d = Vector((math.cos(a), math.sin(a), -0.5 - rnd.random() * 0.6))
        fur.append(horn(f'f{k}', (math.cos(a) * 0.03, math.sin(a) * 0.03, 0.34), d, 0.07 + 0.04 * rnd.random(), 0.016, seg=5, rings=4))
    fur = P(join('fur', fur), WOLF, scale=60, sharp=2)
    collar = prim('torus', 'collar', (0, 0, 0.33), major_radius=0.042, minor_radius=0.02, major_segments=16, minor_segments=8)
    P(collar, LEATHER, scale=60, seed=3)
    blade = horn('blade', (0, 0, 0.32), (0, 0, 1), 0.62, 0.08, bend=(0.22, 0, 0), seg=14, rings=18)
    for v in blade.data.vertices:  # flatten into a broad fang, sharp along the inside curve
        v.co.y *= 0.62
    def fang_col(v):
        t = max(0.0, min(1.0, (v.z - 0.32) / 0.62))
        base = Vector(IVORY[0]); tip = Vector((0.55, 0.45, 0.30))
        c = base.lerp(tip, t ** 2.5)
        n = noise.noise(v * 40) * 0.05
        return (c.x + n, c.y + n, c.z + n)
    gradient(blade, fang_col)
    finish(blade, M_SHINY())
    return [finish(join('alpha_fang', [grip, pommel, wrapc, fur, collar]), M()), blade]


def tusk_club():
    # a whole mammoth tusk: curved ivory, a hide-wrapped grip at the root and cord bands
    tusk = horn('tusk', (0, 0, 0.02), (0, 0, 1), 1.12, 0.085, bend=(0.38, 0, 0), seg=18, rings=24)
    for v in tusk.data.vertices:
        v.co.y *= 0.9
    def tusk_col(v):
        t = max(0.0, min(1.0, v.z / 1.1))
        root = Vector((0.55, 0.40, 0.25)); body = Vector(IVORY[0]); tip = Vector((0.88, 0.82, 0.66))
        c = root.lerp(body, min(1, t * 4)) if t < 0.25 else body.lerp(tip, (t - 0.25) / 0.75)
        stripe = 0.04 * math.sin(v.z * 90 + noise.noise(v * 10) * 3)
        return (c.x + stripe, c.y + stripe, c.z + stripe)
    gradient(tusk, tusk_col)
    finish(tusk, M_SHINY())
    hide = tube('hide', linspace(0.0, 0.30, 8), lambda z: 0.092 - z * 0.04, lambda z: 0.084 - z * 0.04, cy=0.0)
    bumps(hide, 0.004, 40)
    P(hide, LEATHER, scale=40)
    wrapc = grip_wrap('wrap', 0.02, 0.29, 0.088, turns=5, cr=0.008)
    P(wrapc, CORD, scale=80, seed=4)
    bands = []
    for z in (0.42, 0.47):
        r = 0.085 * (1 - z / 1.12) ** 0.9 + 0.006
        cx = 0.38 * (z / 1.12) ** 2 * 1.12
        bands.append(cord(f'b{z}', [(cx + math.cos(t) * r, math.sin(t) * r * 0.9, z) for t in [2 * math.pi * k / 16 for k in range(16)]], r=0.007, closed=True))
    bands = P(join('bands', bands), CORD, scale=80, seed=5)
    # a tuft of mammoth hair hanging from the bands
    rnd = random.Random(5)
    hair = []
    for k in range(9):
        a = math.pi * (0.6 + 0.8 * rnd.random())
        hair.append(horn(f'h{k}', (0.04 + math.cos(a) * 0.06, math.sin(a) * 0.06, 0.44), (rnd.random() * 0.3 - 0.15, rnd.random() * 0.3 - 0.15, -1), 0.14 + 0.06 * rnd.random(), 0.012, seg=5, rings=4))
    hair = P(join('hair', hair), ((0.36, 0.22, 0.12), (0.20, 0.12, 0.06)), scale=60)
    cap = prim('cyl', 'cap', (0, 0, 0.0), scale=(0.095, 0.087, 0.02), vertices=16)
    P(cap, LEATHER, scale=60, seed=7)
    return [finish(join('tusk_club', [hide, wrapc, bands, hair, cap]), M()), tusk]


ITEMS = {
    'cracked_club': cracked_club,
    'stone_club': stone_club,
    'flint_club': flint_club,
    'alpha_fang': alpha_fang,
    'tusk_club': tusk_club,
}


def export(path, objs):
    for s in bpy.context.selected_objects:
        s.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_vertex_color='ACTIVE', export_normals=True,
                              export_materials='EXPORT', export_extras=False, export_animations=False,
                              export_skins=False, export_image_format='JPEG')


def main(names):
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(SHOTS, exist_ok=True)
    for name in names:
        reset()
        objs = ITEMS[name]()
        export(f'{OUT}/{name}.glb', objs)
        cam_render(f'{SHOTS}/{name}.png', (0.9, -1.1, 0.75), (0.05, 0, 0.55), res=(420, 520))
        print('built', name)


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(ITEMS)
    main(args)
