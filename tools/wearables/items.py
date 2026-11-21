"""First-pass wearables for the caveman, built in Blender from code.

Run:  python items.py [-- item_id ...]   (needs the `bpy` package: pip install bpy)
Each item is exported to public/models/gear/<id>.glb and rendered to SHOTS.
See README.md for how the files are fitted to the hero in game.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from mathutils import Vector
from gearlib import *
import gearlib as GL
from common import cam_render, REPO

OUT = os.path.join(REPO, 'public/models/gear')
SHOTS = os.environ.get('SHOTS', os.path.join(REPO, 'tools/wearables/shots'))  # renders, not committed

# palette (sRGB 0..1)
HIDE = ((0.56, 0.38, 0.22), (0.40, 0.25, 0.14))
HIDE_DARK = ((0.36, 0.23, 0.13), (0.22, 0.14, 0.08))
HIDE_WORN = ((0.50, 0.40, 0.30), (0.30, 0.22, 0.15))
BONE = ((0.90, 0.85, 0.72), (0.70, 0.62, 0.48))
WOLF = ((0.62, 0.61, 0.58), (0.30, 0.29, 0.28))
TAWNY = ((0.82, 0.58, 0.30), (0.62, 0.38, 0.18))
BARK = ((0.42, 0.30, 0.19), (0.22, 0.15, 0.09))
WOOD = ((0.55, 0.38, 0.22), (0.38, 0.24, 0.13))
FLINT = ((0.50, 0.52, 0.55), (0.25, 0.26, 0.29))
CORD = ((0.45, 0.33, 0.20), (0.30, 0.21, 0.12))
STONE = ((0.55, 0.52, 0.47), (0.35, 0.32, 0.28))
OBSID = ((0.10, 0.09, 0.12), (0.03, 0.03, 0.05))

M = lambda: mat('gear', rough=0.85)
M_SHINY = lambda: mat('gear_shiny', rough=0.25)
M_GLASS = lambda: mat('gear_glass', rough=0.08, metal=0.1)


def P(o, pal, scale=40, sharp=1.6, seed=0, **kw):
    paint(o, pal[0], pal[1], scale=scale, sharp=sharp, seed=seed, **kw)
    return o


def glow(name, rgb, strength):
    return mat(name, color=rgb, emit=rgb, strength=strength, vcol=False, rough=0.3)


# ---------------------------------------------------------------- building blocks
def torso_shell(name, z0=0.585, z1=0.712, rx=0.105, ry=0.075, off=0.007, rings=16, smooth=8):
    o = tube(name, linspace(z0, z1, rings), rx, ry)
    wrap(o, off=off, smooth=smooth)
    return o


def ragged(o, z_edge, below=True, amp=0.008, scale=90, seed=0):
    """Tear the bottom (or top) edge with noise."""
    from mathutils import noise
    def pred(c):
        n = noise.noise(Vector((c.x * scale, c.y * scale, seed))) * amp
        return (c.z < z_edge + n) if below else (c.z > z_edge + n)
    delete_faces(o, pred)


def pauldron(name, side, r=0.042, z=0.708, out=0.118, flat=0.62):
    x = side * out
    o = prim('sphere', name, (x, 0.026, z), scale=(r * 1.05, r * 1.15, r * flat), segments=24, ring_count=12)
    # keep the top cap only, tilt it down the arm
    delete_faces(o, lambda c: c.z < z - r * flat * 0.35)
    from mathutils import Matrix
    c = Vector((x, 0.026, z))
    o.data.transform(Matrix.Translation(c) @ Matrix.Rotation(-side * 0.35, 4, 'Y') @ Matrix.Translation(-c))
    solidify(o, 0.004)
    return o


def mantle(name, z0=0.665, z1=0.742, rx=0.16, ry=0.10, off=0.014, fur=0.035, seed=3):
    """Fur collar over the shoulders with a ragged hanging fringe."""
    o = tube(name, linspace(z0, z1, 12), rx, ry)
    wrap(o, off=off, smooth=10, factor=0.7)
    bumps(o, amp=0.004, scale=70, seed=seed)
    tufts = fringe(name + '_f', o, lambda m: m.z < z0 + 0.03, length=fur, width=1.3, jitter=0.6, out=0.01, seed=seed)
    solidify(o, 0.006)
    solidify(tufts, 0.003)
    return o, tufts


def lacing(name, z0, z1, x=0.0, n=4, w=0.012):
    """Criss-cross lacing down the front."""
    pts = []
    for i in range(n * 2 + 1):
        z = z1 - (z1 - z0) * i / (n * 2)
        xx = x + (w if i % 2 else -w)
        p, _ = surf(xx, z, -1, 0.011)
        if p is not None:
            pts.append(tuple(p))
    return cord(name, pts, r=0.0016)


def strap(name, pts_xz, off=0.010, side=-1, r=0.0028):
    pts = []
    for x, z in pts_xz:
        p, _ = surf(x, z, side, off)
        if p is not None:
            pts.append(tuple(p))
    return cord(name, pts, r=r)


def shoulder_strap(name, side=1, off=0.012, r=0.006):
    """A strap over one shoulder: front chest -> over the top -> back."""
    pts = []
    for t in linspace(0, 1, 9):
        a = math.pi * t  # 0 front, pi back
        x = side * (0.045 + 0.025 * math.sin(a))
        y = 0.022 - 0.07 * math.cos(a)
        z = 0.64 + 0.085 * math.sin(a)
        p, _ = nearest((x, y, z), off)
        pts.append(tuple(p))
    o = cord(name, pts, r=r)
    o.scale = (1, 1, 1)
    return o


# ---------------------------------------------------------------- armour
def torn_hide():
    sh = torso_shell('torn', z0=0.545, z1=0.712, off=0.006)
    # one-shoulder: cut away the left upper chest diagonally, tear the hem and punch holes
    delete_faces(sh, lambda c: c.z > 0.655 + (-c.x) * 0.9 and c.x < 0.02)
    ragged(sh, 0.57, amp=0.012, scale=70, seed=2)
    from mathutils import noise
    delete_faces(sh, lambda c: noise.noise(c * 55 + Vector((4, 4, 4))) > 0.48)
    bumps(sh, 0.002, 70)
    solidify(sh, 0.004)
    P(sh, HIDE_WORN, scale=35, sharp=2.0, seed=1)
    tie = strap('tie', [(-0.06, 0.6), (0.0, 0.61), (0.06, 0.62)], off=0.012)
    P(tie, CORD)
    return [finish(join('torn_hide', [sh, tie]), M())]


def hide_wrap():
    sh = torso_shell('wrap', z0=0.515, z1=0.712)
    ragged(sh, 0.552, amp=0.006, scale=60, seed=5)
    bumps(sh, 0.0018, 80)
    solidify(sh, 0.0045)
    P(sh, HIDE, scale=30, sharp=1.8, seed=3)
    lace = lacing('lace', 0.61, 0.69, x=0.03, n=4)
    st = shoulder_strap('strap', side=-1, off=0.012, r=0.005)
    belt = strap('belt', [(-0.09, 0.6), (-0.04, 0.598), (0, 0.597), (0.04, 0.598), (0.09, 0.6)], off=0.01, r=0.004)
    for o in (lace, st, belt):
        P(o, CORD, seed=7)
    return [finish(join('hide_wrap', [sh, lace, st, belt]), M())]


def bone_plates(prefix, rows, cols, z0, z1, x0, x1, size=(0.011, 0.006, 0.016), off=0.014, side=-1, seed=0):
    rnd = random.Random(seed)
    out = []
    for r in range(rows):
        z = z0 + (z1 - z0) * r / max(1, rows - 1)
        for c in range(cols):
            x = x0 + (x1 - x0) * (c + (0.5 if r % 2 else 0)) / max(1, cols - 1)
            if x > x1 + 1e-4:
                continue
            p, n = surf(x, z, side, off)
            if p is None:
                continue
            o = prim('sphere', f'{prefix}{r}_{c}', tuple(p), scale=(size[0], size[2], size[1]), segments=10, ring_count=6)
            align_z(o, n, p)
            out.append(o)
    return out


def bone_mail():
    sh = torso_shell('vest', z0=0.515, z1=0.712)
    ragged(sh, 0.552, amp=0.005, scale=60, seed=8)
    solidify(sh, 0.0045)
    P(sh, HIDE_DARK, scale=30, sharp=1.6, seed=4)
    plates = bone_plates('pl', 7, 6, 0.572, 0.685, -0.068, 0.068, seed=1)
    plates += bone_plates('pb', 4, 6, 0.61, 0.69, -0.07, 0.07, side=1, seed=2)
    for o in plates:
        bumps(o, 0.0008, 300)
    pl = join('plates', plates)
    P(pl, BONE, scale=120, sharp=1.4, seed=2)
    pads = [pauldron('pd' + str(s), s) for s in (-1, 1)]
    pads = join('pads', pads)
    P(pads, BONE, scale=90, sharp=1.4)
    return [finish(join('bone_mail', [sh, pl, pads]), M())]


def wolf_pelt():
    sh = torso_shell('vest', z0=0.515, z1=0.70)
    ragged(sh, 0.552, amp=0.007, scale=60, seed=9)
    solidify(sh, 0.0045)
    P(sh, HIDE_DARK, scale=30, sharp=1.6, seed=5)
    m, t = mantle('mantle', fur=0.04, seed=4)
    for o in (m, t):
        gradient(o, lambda v: [a * (0.85 + 0.3 * (GL.noise.noise(v * 90) * 0.5 + 0.5)) for a in (0.42, 0.41, 0.39)])
    pads = join('pads', [pauldron('pd' + str(s), s, r=0.046) for s in (-1, 1)])
    P(pads, WOLF, scale=70, sharp=2.2)
    return [finish(join('wolf_pelt', [sh, m, t, pads]), M())]


def sabre_hide():
    sh = torso_shell('cuir', z0=0.515, z1=0.712, off=0.008)
    ragged(sh, 0.552, amp=0.006, scale=50, seed=11)
    bumps(sh, 0.002, 60)
    solidify(sh, 0.005)
    from mathutils import noise
    spot = lambda v: 1.0 if noise.noise(v * 70 + Vector((9, 1, 3))) > 0.35 else 0.0
    paint(sh, TAWNY[0], TAWNY[1], scale=30, sharp=1.5, seed=6, c3=(0.25, 0.14, 0.07), spot=spot)
    m, t = mantle('mantle', fur=0.045, rx=0.17, seed=6)
    for o in (m, t):
        paint(o, (0.86, 0.66, 0.40), (0.55, 0.35, 0.17), scale=60, sharp=2.0, seed=8)
    pads = [pauldron('pd' + str(s), s, r=0.05, z=0.712) for s in (-1, 1)]
    pads = join('pads', pads)
    P(pads, BONE, scale=90)
    fangs = []
    for s in (-1, 1):
        fangs.append(horn('fang', (s * 0.13, 0.0, 0.725), (s * 0.4, -0.5, -1), 0.06, 0.008, bend=(0, -0.4, 0)))
    fangs = join('fangs', fangs)
    gradient(fangs, lambda v: (0.95, 0.9, 0.78) if v.z > 0.69 else (0.8, 0.72, 0.55))
    return [finish(join('sabre_hide', [sh, m, t, pads, fangs]), M())]


# ---------------------------------------------------------------- helms (rigid on the Head bone)
HC = Vector((-0.007, 0.012, 0.792))  # centre of the hair mass


def dome(name, top=0.866, rx=0.075, ry=0.08, cut=0.815, back_cut=0.765, seg=32):
    rz = top - HC.z
    o = prim('sphere', name, tuple(HC), scale=(rx, ry, rz), segments=seg, ring_count=16)
    # open the bottom: higher at the brow (front, -y), lower at the back
    delete_faces(o, lambda c: c.z < (cut + (back_cut - cut) * max(0.0, min(1.0, (c.y - HC.y + ry) / (2 * ry)))))
    return o


def skull_cap():
    d = dome('cap', top=0.866, cut=0.818, back_cut=0.78)
    bumps(d, 0.0012, 120)
    solidify(d, 0.004, offset=1)
    # the old skull's upper teeth along the brow
    teeth = []
    for i in range(7):
        t = (i - 3) / 3.0
        ang = math.pi / 2 + t * 0.75
        x = HC.x + math.cos(ang) * 0.074
        y = HC.y - math.sin(ang) * 0.079
        teeth.append(horn('t', (x, y, 0.821), (0, -0.15, -1), 0.016 if i % 2 else 0.012, 0.004))
    sk = join('skull', [d] + teeth)
    P(sk, BONE, scale=90, sharp=1.6, seed=2)
    st = cord('chin', [(-0.058, 0.02, 0.79), (-0.05, -0.02, 0.74), (0, -0.045, 0.726), (0.05, -0.02, 0.74), (0.058, 0.02, 0.79)], r=0.0018)
    P(st, CORD)
    o = finish(join('skull_cap__Head', [sk, st]), M())
    return [o]


def bone_helm():
    d = dome('helm', top=0.87, rx=0.078, ry=0.083, cut=0.814, back_cut=0.77)
    bumps(d, 0.0015, 90)
    solidify(d, 0.005)
    band = prim('torus', 'band', (HC.x, HC.y, 0.818), scale=(0.077, 0.082, 0.03), major_radius=1, minor_radius=0.12,
                major_segments=32, minor_segments=6)
    horns = [horn('h', (s * 0.055, HC.y + 0.005, 0.835), (s * 1, 0.1, 0.35), 0.075, 0.012, bend=(0, 0.1, 0.9)) for s in (-1, 1)]
    cheeks = []
    h = join('helm', [d, band] + horns + cheeks)
    P(h, BONE, scale=80, sharp=1.5, seed=4)
    return [finish(join('bone_helm__Head', [h]), M())]


def lion_mask():
    d = dome('hood', top=0.872, rx=0.079, ry=0.084, cut=0.815, back_cut=0.765)
    bumps(d, 0.002, 70)
    solidify(d, 0.005)
    # muzzle over the brow with upper fangs
    snout = prim('sphere', 'snout', (HC.x, HC.y - 0.075, 0.83), scale=(0.04, 0.03, 0.022), segments=20, ring_count=10)
    nose = prim('sphere', 'nose', (HC.x, HC.y - 0.103, 0.834), scale=(0.012, 0.008, 0.008), segments=12, ring_count=6)
    fangs = [horn('f', (HC.x + s * 0.022, HC.y - 0.09, 0.815), (0, -0.15, -1), 0.03, 0.0045, bend=(0, 0.25, 0)) for s in (-1, 1)]
    ears = []
    for s in (-1, 1):
        e = prim('cone', 'ear', (s * 0.05, HC.y - 0.005, 0.862), scale=(0.016, 0.008, 0.02), rot=(0, s * 0.5, 0), vertices=10)
        ears.append(e)
    hood = join('hood', [d, snout] + ears)
    from mathutils import noise
    paint(hood, TAWNY[0], TAWNY[1], scale=50, sharp=1.5, seed=3)
    P(nose, ((0.2, 0.12, 0.08), (0.12, 0.07, 0.05)))
    fg = join('fangs', fangs)
    gradient(fg, lambda v: (0.96, 0.92, 0.82))
    # mane: a shaggy shell behind the head and down the neck, with a fringe of tufts
    mane = prim('sphere', 'mane', (HC.x, HC.y + 0.012, 0.79), scale=(0.088, 0.088, 0.085), segments=32, ring_count=16)
    delete_faces(mane, lambda c: c.y < HC.y - 0.01 or c.z < 0.725)
    bumps(mane, 0.007, 55, seed=2)
    tufts = fringe('mt', mane, lambda m: m.z < 0.74 or m.y < HC.y, length=0.03, width=1.5, out=0.006, seed=5)
    solidify(mane, 0.006)
    solidify(tufts, 0.003)
    mn = join('mane', [mane, tufts])
    paint(mn, (0.55, 0.33, 0.15), (0.30, 0.17, 0.07), scale=60, sharp=2.0, seed=9)
    return [finish(join('lion_mask__Head', [hood, nose, fg, mn]), M())]


def storm_crown():
    ring = prim('torus', 'ring', (HC.x, HC.y + 0.006, 0.815), scale=(0.07, 0.073, 0.05), rot=(-0.1, 0, 0), major_radius=1,
                minor_radius=0.13, major_segments=40, minor_segments=8)
    tines = []
    for i in range(9):
        a = math.pi * (0.1 + 0.8 * i / 8)  # front arc only (pi/2 = front)
        x = HC.x + math.cos(a) * 0.07
        y = HC.y + 0.006 - math.sin(a) * 0.073
        tall = 0.05 if i == 4 else 0.03 + 0.012 * (1 - abs(i - 4) / 4)
        tines.append(horn('t', (x, y, 0.812 - math.sin(a) * 0.009), (x * 0.4, (y - HC.y) * 0.4, 1), tall, 0.006, bend=(x * 2, (y - HC.y) * 2, 0)))
    cr = join('crown', [ring] + tines)
    gradient(cr, lambda v: [c * (0.75 + 0.25 * (GL.noise.noise(v * 120) * 0.5 + 0.5)) for c in (0.82, 0.76, 0.64)])
    finish(cr, M())
    gem = prim('ico', 'gem', (HC.x, HC.y - 0.072, 0.812), scale=(0.011, 0.007, 0.014), subdivisions=1)
    finish(gem, glow('storm_glow', (0.35, 0.65, 1.0), 1.6), smooth=False)
    setting = prim('torus', 'set', (HC.x, HC.y - 0.069, 0.812), scale=(0.014, 0.014, 0.016), rot=(math.pi / 2, 0, 0),
                   major_radius=1, minor_radius=0.25, major_segments=16, minor_segments=6)
    P(setting, ((0.3, 0.3, 0.33), (0.15, 0.15, 0.18)))
    finish(setting, M())
    o = join('storm_crown__Head', [cr, setting])
    gem.name = 'storm_gem__Head'
    return [o, gem]


# ---------------------------------------------------------------- offhand (rigid on the left forearm)
# T-pose: the left forearm runs along +x at z~0.69; its top (+z) faces outward when the arm hangs.
SC = Vector((0.30, 0.03, 0.713))


def disc(name, r, t, seg=32, center=SC, rough=0.0):
    o = prim('cyl', name, tuple(center + Vector((0, 0, t / 2))), scale=(r, r, t / 2), vertices=seg)
    return o


def bark_shield():
    d = disc('bark', 0.08, 0.008)
    subsurf(d, 2)
    convex(d, 0.08, 0.012)
    bumps(d, 0.003, 50)
    P(d, BARK, scale=45, sharp=2.2)
    rim = prim('torus', 'rim', tuple(SC + Vector((0, 0, 0.008))), scale=(0.08, 0.08, 0.08), major_radius=1, minor_radius=0.07,
               major_segments=36, minor_segments=6)
    bumps(rim, 0.002, 60)
    P(rim, WOOD, seed=3)
    ties = []
    for a in (0.6, 0.6 + math.pi):
        dx, dy = math.cos(a) * 0.082, math.sin(a) * 0.082
        ties.append(cord('tie', [(SC.x - dx, SC.y - dy, SC.z + 0.011), (SC.x, SC.y, SC.z + 0.013), (SC.x + dx, SC.y + dy, SC.z + 0.011)], r=0.0022))
    ties = join('ties', ties)
    P(ties, CORD)
    return [finish(join('bark_shield__LeftForeArm', [d, rim, ties, arm_straps('st')]), M())]


def arm_section(x):
    """Centre and radius of the left forearm at x (rays from above, below, front and back)."""
    hits = []
    for o, d in (((x, 0.03, 0.9), (0, 0, -1)), ((x, 0.03, 0.5), (0, 0, 1)), ((x, -0.3, 0.69), (0, 1, 0)), ((x, 0.3, 0.69), (0, -1, 0))):
        loc, _, _, _ = GL.BVH.ray_cast(Vector(o), Vector(d))
        hits.append(loc)
    c = Vector(((hits[0].x + hits[1].x) / 2, (hits[2].y + hits[3].y) / 2, (hits[0].z + hits[1].z) / 2))
    return c, (hits[0].z - hits[1].z) / 2, (hits[3].y - hits[2].y) / 2


def arm_straps(name):
    out = []
    for x in (SC.x - 0.03, SC.x + 0.035):
        c, rz, ry = arm_section(x)
        out.append(prim('torus', 's', tuple(c), scale=(rz + 0.002, ry + 0.002, 0.035), rot=(0, math.pi / 2, 0), major_radius=1,
                        minor_radius=0.12, major_segments=20, minor_segments=5))
    o = join(name, out)
    P(o, HIDE_DARK)
    return o


def convex(o, R, h):
    for v in o.data.vertices:
        r = ((v.co.x - SC.x) ** 2 + (v.co.y - SC.y) ** 2) ** 0.5
        if v.co.z > SC.z + 0.002:
            v.co.z += h * max(0.0, 1 - (r / R) ** 2)


def flint_studs(prefix, r, n, z, size=0.007):
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n
        p = SC + Vector((math.cos(a) * r, math.sin(a) * r, z))
        o = prim('ico', f'{prefix}{i}', tuple(p), scale=(size, size * 0.8, size * 1.2), rot=(0.3 * i, 0.5 * i, a), subdivisions=1)
        out.append(o)
    return out


def flint_buckler():
    d = disc('wood', 0.056, 0.009)
    subsurf(d, 1)
    P(d, WOOD, scale=40)
    face = disc('face', 0.05, 0.003, center=SC + Vector((0, 0, 0.009)))
    bumps(face, 0.0012, 80)
    P(face, HIDE, scale=40)
    boss = prim('ico', 'boss', tuple(SC + Vector((0, 0, 0.014))), scale=(0.016, 0.016, 0.012), subdivisions=1)
    studs = flint_studs('s', 0.047, 8, 0.013)
    fl = join('flint', [boss] + studs)
    P(fl, FLINT, scale=150, sharp=1.5)
    finish(fl, M_SHINY(), smooth=False)
    return [finish(join('flint_buckler__LeftForeArm', [d, face, arm_straps('st')]), M()), fl]


def claw_buckler():
    d = disc('wood', 0.058, 0.009)
    subsurf(d, 1)
    P(d, WOOD, scale=40)
    face = disc('face', 0.052, 0.003, center=SC + Vector((0, 0, 0.009)))
    from mathutils import noise
    paint(face, TAWNY[0], TAWNY[1], scale=60, seed=2, c3=(0.25, 0.14, 0.07),
          spot=lambda v: 1.0 if noise.noise(v * 90) > 0.4 else 0.0)
    rim = prim('torus', 'rim', tuple(SC + Vector((0, 0, 0.01))), scale=(0.058, 0.058, 0.058), major_radius=1, minor_radius=0.1,
               major_segments=36, minor_segments=6)
    P(rim, BONE, scale=80)
    claws = []
    for i in range(3):
        a = math.pi * 0.5 + (i - 1) * 0.5
        base = SC + Vector((math.cos(a) * 0.018, math.sin(a) * 0.018, 0.013))
        claws.append(horn('c', tuple(base), (math.cos(a), math.sin(a), 0.25), 0.05, 0.007, bend=(0, 0, -0.5)))
    cl = join('claws', claws)
    gradient(cl, lambda v: (0.18, 0.14, 0.12) if (v - SC).length > 0.05 else (0.88, 0.82, 0.7))
    return [finish(join('claw_buckler__LeftForeArm', [d, face, rim, cl, arm_straps('st')]), M())]


def obsidian_ward():
    fr = prim('cyl', 'frame', tuple(SC + Vector((0, 0, 0.005))), scale=(0.07, 0.085, 0.005), vertices=8, rot=(0, 0, math.pi / 8))
    P(fr, WOOD, seed=5)
    fr = finish(join('fr', [fr, arm_straps('st')]), M())
    shards = []
    rnd = random.Random(4)
    for i in range(7):
        a = 2 * math.pi * i / 6
        rr = 0 if i == 6 else 0.042
        p = SC + Vector((math.cos(a) * rr * 0.85, math.sin(a) * rr, 0.013))
        o = prim('ico', f'sh{i}', tuple(p), scale=(0.026, 0.032, 0.008), rot=(rnd.random() * 0.3, rnd.random() * 0.3, a), subdivisions=1)
        shards.append(o)
    sh = join('obsidian', shards)
    P(sh, OBSID, scale=80, sharp=1.2)
    finish(sh, M_GLASS(), smooth=False)
    edge = prim('torus', 'edge', tuple(SC + Vector((0, 0, 0.011))), scale=(0.07, 0.085, 0.07), major_radius=1, minor_radius=0.04,
                major_segments=8, minor_segments=4, rot=(0, 0, math.pi / 8))
    finish(edge, glow('obsidian_glow', (0.55, 0.3, 0.9), 2.0), smooth=False)
    fr.name = 'obsidian_ward__LeftForeArm'
    sh.name = 'obsidian_shards__LeftForeArm'
    edge.name = 'obsidian_edge__LeftForeArm'
    return [fr, sh, edge]


# ---------------------------------------------------------------- trinkets (auto-skinned to neck and chest)
def necklace(name, drop=0.04, r=0.0016, spread=1.0):
    pts = neck_loop(drop=drop, n=28, spread=spread)
    o = cord(name, [tuple(p) for p in pts], r=r, closed=True)
    P(o, CORD)
    return o, pts


def front_point(pts):
    return min(pts, key=lambda p: p.y)


def pendant_at(dz, off=0.012, x=0.0):
    p, n = surf(x, front_point(neck_loop(0.04)).z - dz, -1, off)
    return p, n


def pebble_string():
    c, pts = necklace('cord', drop=0.06)
    rnd = random.Random(3)
    peb = []
    front = sorted(pts, key=lambda p: p.y)[:9]
    for i, p in enumerate(front):
        q, n = nearest(p, 0.006)
        o = prim('ico', f'p{i}', tuple(q), scale=(0.006 + rnd.random() * 0.002,) * 2 + (0.005,), subdivisions=2)
        peb.append(o)
    pb = join('pebbles', peb)
    P(pb, STONE, scale=200, sharp=2.0)
    return [finish(join('pebble_string', [c, pb]), M())]


def tooth_charm():
    c, pts = necklace('cord', drop=0.07)
    f = front_point(pts)
    teeth = []
    for i, dx in enumerate((-0.012, 0.0, 0.012)):
        base, n = surf(f.x + dx, f.z - 0.003, -1, 0.009)
        teeth.append(horn('t', tuple(base), (dx * 4, -0.25, -1), 0.02 if dx == 0 else 0.015, 0.0035, bend=(0, -0.2, 0)))
    t = join('teeth', teeth)
    gradient(t, lambda v: (0.95, 0.9, 0.78))
    return [finish(join('tooth_charm', [c, t]), M())]


def ember_stone():
    c, pts = necklace('cord', drop=0.072)
    f = front_point(pts)
    p, n = surf(f.x, f.z - 0.012, -1, 0.012)
    stone = prim('ico', 'stone', tuple(p), scale=(0.011, 0.007, 0.013), subdivisions=2)
    bumps(stone, 0.0012, 300)
    finish(stone, glow('ember_glow', (1.0, 0.45, 0.1), 3.0))
    wrapc = cord('wrap', [tuple(p + Vector((-0.012, -0.004, 0.006))), tuple(p + Vector((0, -0.009, 0.0))), tuple(p + Vector((0.012, -0.004, -0.006)))], r=0.0015)
    P(wrapc, CORD)
    o = finish(join('ember_stone', [c, wrapc]), M())
    return [o, stone]


def fang_charm():
    c, pts = necklace('cord', drop=0.068, r=0.0018)
    f = front_point(pts)
    base, n = surf(f.x, f.z - 0.002, -1, 0.011)
    fang = horn('fang', tuple(base), (0.0, -0.2, -1), 0.034, 0.0055, bend=(0.12, -0.25, 0))
    gradient(fang, lambda v: (0.97, 0.93, 0.82) if v.z < base.z - 0.012 else (0.82, 0.74, 0.58))
    beads = []
    for i, p in enumerate(sorted(pts, key=lambda p: p.y)[1:7]):
        q, _ = nearest(p, 0.004)
        beads.append(prim('sphere', f'b{i}', tuple(q), scale=(0.0045,) * 3, segments=10, ring_count=6))
    bd = join('beads', beads)
    gradient(bd, lambda v: (0.25, 0.2, 0.18) if int(v.x * 300) % 2 else (0.85, 0.78, 0.62))
    return [finish(join('fang_charm', [c, fang, bd]), M())]


def ember_totem():
    c, pts = necklace('cord', drop=0.07, r=0.0018)
    f = front_point(pts)
    p, n = surf(f.x, f.z - 0.022, -1, 0.013)
    body = prim('cyl', 'totem', tuple(p), scale=(0.011, 0.008, 0.022), vertices=10)
    head = prim('sphere', 'head', tuple(p + Vector((0, 0, 0.026))), scale=(0.012, 0.009, 0.009), segments=12, ring_count=8)
    rings = [prim('torus', f'r{i}', tuple(p + Vector((0, 0, dz))), scale=(0.0115, 0.0085, 0.01), major_radius=1, minor_radius=0.2,
                  major_segments=16, minor_segments=4) for i, dz in enumerate((-0.012, 0.012))]
    t = join('totem', [body, head] + rings)
    P(t, BONE, scale=150, sharp=1.8)
    finish(t, M())
    ember = prim('ico', 'ember', tuple(p + Vector((0, -0.008, 0.0))), scale=(0.0055, 0.004, 0.0075), subdivisions=2)
    finish(ember, glow('ember_glow', (1.0, 0.45, 0.1), 3.0))
    eyes = [prim('ico', 'eye', tuple(p + Vector((s * 0.005, -0.009, 0.027))), scale=(0.002,) * 3, subdivisions=1) for s in (-1, 1)]
    ey = join('eyes', eyes)
    finish(ey, glow('ember_glow', (1.0, 0.45, 0.1), 3.0))
    o = join('ember_totem', [c, t])
    em = join('ember_totem_fire', [ember, ey])
    return [o, em]


def ghost_amber():
    c, pts = necklace('cord', drop=0.072)
    f = front_point(pts)
    p, n = surf(f.x, f.z - 0.016, -1, 0.013)
    amber = prim('sphere', 'amber', tuple(p), scale=(0.011, 0.008, 0.016), segments=16, ring_count=10)
    # teardrop: pinch the top
    for v in amber.data.vertices:
        k = max(0.0, (v.co.z - p.z) / 0.016)
        v.co.x = p.x + (v.co.x - p.x) * (1 - 0.6 * k)
        v.co.y = p.y + (v.co.y - p.y) * (1 - 0.6 * k)
    finish(amber, glow('amber_glow', (1.0, 0.78, 0.35), 2.5))
    cap = prim('cone', 'cap', tuple(p + Vector((0, 0, 0.016))), scale=(0.006, 0.006, 0.006), vertices=10)
    beads = []
    for i, q in enumerate(sorted(pts, key=lambda p: p.y)[1:9:2]):
        qq, _ = nearest(q, 0.004)
        beads.append(prim('sphere', f'b{i}', tuple(qq), scale=(0.004,) * 3, segments=10, ring_count=6))
    b = join('beads', [cap] + beads)
    P(b, BONE, scale=200)
    o = finish(join('ghost_amber', [c, b]), M())
    return [o, amber]


ITEMS = {
    'torn_hide': (torn_hide, 'armor'), 'hide_wrap': (hide_wrap, 'armor'), 'bone_mail': (bone_mail, 'armor'),
    'wolf_pelt': (wolf_pelt, 'armor'), 'sabre_hide': (sabre_hide, 'armor'),
    'skull_cap': (skull_cap, 'helm'), 'bone_helm': (bone_helm, 'helm'), 'lion_mask': (lion_mask, 'helm'),
    'storm_crown': (storm_crown, 'helm'),
    'bark_shield': (bark_shield, 'offhand'), 'flint_buckler': (flint_buckler, 'offhand'),
    'claw_buckler': (claw_buckler, 'offhand'), 'obsidian_ward': (obsidian_ward, 'offhand'),
    'pebble_string': (pebble_string, 'trinket'), 'tooth_charm': (tooth_charm, 'trinket'),
    'ember_stone': (ember_stone, 'trinket'), 'fang_charm': (fang_charm, 'trinket'),
    'ember_totem': (ember_totem, 'trinket'), 'ghost_amber': (ghost_amber, 'trinket'),
}

VIEWS = {
    'armor': [((0.45, -0.75, 0.75), (0, 0, 0.64)), ((-0.5, 0.7, 0.75), (0, 0, 0.64))],
    'helm': [((0.22, -0.32, 0.86), (0, 0, 0.79)), ((-0.3, 0.25, 0.85), (0, 0, 0.79))],
    'offhand': [((0.55, -0.45, 0.95), (0.3, 0.03, 0.70)), ((0.3, -0.5, 0.62), (0.3, 0.03, 0.70))],
    'trinket': [((0.12, -0.38, 0.72), (0, 0, 0.68)), ((0.3, -0.3, 0.8), (0, 0, 0.68))],
}


def main(names):
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(SHOTS, exist_ok=True)
    init()
    for name in names:
        fn, slot = ITEMS[name]
        before = set(bpy.data.objects)
        objs = fn()
        # tidy: drop helper objects that were joined away / left behind
        export(f'{OUT}/{name}.glb', objs)
        for i, (loc, tgt) in enumerate(VIEWS[slot]):
            cam_render(f'{SHOTS}/{name}_{i}.png', loc, tgt, res=(480, 480))
        for o in set(bpy.data.objects) - before:
            bpy.data.objects.remove(o)
        print('BUILT', name, os.path.getsize(f'{OUT}/{name}.glb'))


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(ITEMS)
    main(args)
