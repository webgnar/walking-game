import bpy, bmesh, math, random
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree
from common import load_hero, J, JOINTS

BODY = None
BVH = None


def init():
    global BODY, BVH
    BODY = load_hero()
    dg = bpy.context.evaluated_depsgraph_get()
    BVH = BVHTree.FromObject(BODY, dg)
    return BODY


# ---------- materials ----------
MATS = {}


def mat(name, color=(1, 1, 1), rough=0.85, metal=0.0, emit=None, strength=0.0, vcol=True, alpha=1.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes.get('Principled BSDF')
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if vcol:
        a = nt.nodes.new('ShaderNodeVertexColor')
        a.layer_name = 'Col'
        nt.links.new(a.outputs['Color'], p.inputs['Base Color'])
    else:
        p.inputs['Base Color'].default_value = (*color, 1)
    if emit:
        p.inputs['Emission Color'].default_value = (*emit, 1)
        p.inputs['Emission Strength'].default_value = strength
    MATS[name] = m
    return m


# ---------- mesh helpers ----------
def new_obj(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


def apply_mods(o):
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def tube(name, zs, rx, ry, cy=0.012, cx=0.0, seg=56):
    """Open elliptical tube; rx/ry may be callables of z."""
    bm = bmesh.new()
    rows = []
    for z in zs:
        a = rx(z) if callable(rx) else rx
        b = ry(z) if callable(ry) else ry
        rows.append([bm.verts.new((cx + a * math.cos(t), cy + b * math.sin(t), z))
                     for t in [2 * math.pi * i / seg for i in range(seg)]])
    for r0, r1 in zip(rows, rows[1:]):
        for i in range(seg):
            bm.faces.new((r0[i], r0[(i + 1) % seg], r1[(i + 1) % seg], r1[i]))
    return new_obj(name, bm)


def linspace(a, b, n):
    return [a + (b - a) * i / (n - 1) for i in range(n)]


def wrap(o, off=0.006, smooth=6, factor=0.6):
    """Hug the body: shrinkwrap to the nearest body surface, then relax."""
    m = o.modifiers.new('sw', 'SHRINKWRAP')
    m.target = BODY
    m.wrap_method = 'NEAREST_SURFACEPOINT'
    m.wrap_mode = 'OUTSIDE_SURFACE'
    m.offset = off
    if smooth:
        s = o.modifiers.new('sm', 'SMOOTH')
        s.iterations = smooth
        s.factor = factor
        m2 = o.modifiers.new('sw2', 'SHRINKWRAP')
        m2.target = BODY
        m2.wrap_method = 'NEAREST_SURFACEPOINT'
        m2.wrap_mode = 'OUTSIDE'
        m2.offset = off
    apply_mods(o)


def delete_faces(o, pred):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    dead = [f for f in bm.faces if pred(f.calc_center_median())]
    bmesh.ops.delete(bm, geom=dead, context='FACES')
    bm.to_mesh(o.data)
    bm.free()


def solidify(o, t=0.004, offset=1.0):
    m = o.modifiers.new('so', 'SOLIDIFY')
    m.thickness = t
    m.offset = offset
    apply_mods(o)


def subsurf(o, lv=1):
    m = o.modifiers.new('ss', 'SUBSURF')
    m.levels = lv
    m.render_levels = lv
    apply_mods(o)


def bumps(o, amp=0.0015, scale=60.0, seed=0):
    """Push vertices along their normals by noise (hide wrinkles, rough bark...)."""
    me = o.data
    me.update()
    for v in me.vertices:
        n = noise.noise(v.co * scale + Vector((seed, seed * 2, 0)))
        v.co += v.normal * n * amp


def boundary_loops(o):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    edges = [e for e in bm.edges if e.is_boundary]
    out = [(e.verts[0].co.copy(), e.verts[1].co.copy()) for e in edges]
    bm.free()
    return out


def fringe(name, o, pick, length=0.03, width=1.0, jitter=0.5, out=0.004, seed=1):
    """Ragged spikes hanging off the boundary edges `pick` selects (fur trim, torn hide)."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    for a, b in boundary_loops(o):
        mid = (a + b) / 2
        if not pick(mid):
            continue
        L = length * (1 - jitter + jitter * 2 * rnd.random())
        # hang downward and a little outward from the body centre line
        outv = Vector((mid.x, mid.y - 0.012, 0))
        outv = outv.normalized() if outv.length > 1e-6 else Vector((0, -1, 0))
        tip = mid + Vector((0, 0, -L)) + outv * out + Vector(((rnd.random() - .5) * L * .4, 0, 0))
        c = (a + b) / 2
        va = bm.verts.new(c + (a - c) * width)
        vb = bm.verts.new(c + (b - c) * width)
        vt = bm.verts.new(tip)
        bm.faces.new((va, vb, vt))
    return new_obj(name, bm)


def surf(x, z, side=-1, off=0.0, y0=None):
    """Body surface point (and normal) hit from the front (side=-1) or back (+1)."""
    o = Vector((x, side * 0.4 if y0 is None else y0, z))
    d = Vector((0, -side, 0))
    loc, nrm, _, _ = BVH.ray_cast(o, d)
    if loc is None:
        return None, None
    return loc + nrm * off, nrm


def nearest(p, off=0.0):
    loc, nrm, _, _ = BVH.find_nearest(Vector(p))
    return loc + nrm * off, nrm


def prim(kind, name, loc, scale=(1, 1, 1), rot=(0, 0, 0), **kw):
    ops = {
        'sphere': bpy.ops.mesh.primitive_uv_sphere_add,
        'ico': bpy.ops.mesh.primitive_ico_sphere_add,
        'cone': bpy.ops.mesh.primitive_cone_add,
        'cyl': bpy.ops.mesh.primitive_cylinder_add,
        'torus': bpy.ops.mesh.primitive_torus_add,
        'cube': bpy.ops.mesh.primitive_cube_add,
    }
    ops[kind](location=loc, rotation=rot, **kw)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


def align_z(o, normal, loc):
    """Rotate an object (built around +Z at loc) so +Z points along normal."""
    q = Vector((0, 0, 1)).rotation_difference(Vector(normal))
    loc = Vector(loc)
    o.data.transform(Matrix.Translation(-loc))
    o.data.transform(q.to_matrix().to_4x4())
    o.data.transform(Matrix.Translation(loc))


def horn(name, base, direction, length, r0, bend=(0, 0, 0.0), seg=10, rings=10, curl=0.0):
    """Tapered curved horn/fang/claw from base along direction, bending toward `bend`."""
    bm = bmesh.new()
    d = Vector(direction).normalized()
    bendv = Vector(bend)
    side = d.cross(Vector((0, 0, 1)))
    if side.length < 1e-3:
        side = d.cross(Vector((1, 0, 0)))
    side.normalize()
    up = side.cross(d).normalized()
    rows = []
    pts = []
    for i in range(rings + 1):
        t = i / rings
        c = Vector(base) + d * length * t + bendv * (t * t) * length
        pts.append(c)
    for i in range(rings + 1):
        t = i / rings
        c = pts[i]
        tang = (pts[min(i + 1, rings)] - pts[max(i - 1, 0)]).normalized()
        s = tang.cross(up).normalized()
        u = s.cross(tang).normalized()
        r = r0 * (1 - t) ** 0.9 + 0.0004
        rows.append([bm.verts.new(c + (s * math.cos(a) + u * math.sin(a)) * r)
                     for a in [2 * math.pi * k / seg for k in range(seg)]])
    for r_0, r_1 in zip(rows, rows[1:]):
        for k in range(seg):
            bm.faces.new((r_0[k], r_0[(k + 1) % seg], r_1[(k + 1) % seg], r_1[k]))
    bm.faces.new(list(reversed(rows[0])))
    tip = bm.verts.new(pts[-1] + (pts[-1] - pts[-2]).normalized() * 0.001)
    for k in range(seg):
        bm.faces.new((rows[-1][k], rows[-1][(k + 1) % seg], tip))
    return new_obj(name, bm)


def cord(name, pts, r=0.0018, seg=6, closed=False):
    """Bevelled curve through points, converted to a mesh."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    sp = cu.splines.new('NURBS')
    sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts):
        p.co = (*q, 1)
    sp.use_cyclic_u = closed
    sp.use_endpoint_u = not closed
    sp.order_u = 3
    cu.bevel_depth = r
    cu.bevel_resolution = 1
    cu.resolution_u = 6
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    for s in bpy.context.selected_objects:
        s.select_set(False)
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    return bpy.context.active_object


def neck_loop(drop=0.035, n=24, spread=1.0, lift=0.0):
    """Points of a necklace loop around the neck base, hanging `drop` lower at the front."""
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x = 0.052 * spread * math.sin(t)
        yb = 0.022 + 0.05 * math.cos(t)  # +y = back
        front = max(0.0, -math.cos(t))
        z = 0.722 + lift - drop * front ** 2
        p = Vector((x, yb, z))
        # sit it on the skin
        q, nrm = nearest(p, 0.003)
        pts.append(q)
    return pts


# ---------- colour ----------
def paint(o, c1, c2, scale=40.0, sharp=1.0, seed=0, c3=None, spot=None):
    """Vertex colours: noise blend of c1..c2, optional c3 'spots' where spot(v) is true."""
    me = o.data
    if 'Col' not in me.color_attributes:
        me.color_attributes.new('Col', 'BYTE_COLOR', 'POINT')
    col = me.color_attributes['Col']
    me.color_attributes.active_color = col
    off = Vector((seed * 3.1, seed * 1.7, seed * 0.3))
    for i, v in enumerate(me.vertices):
        n = noise.noise(v.co * scale + off) * 0.5 + 0.5
        n2 = noise.noise(v.co * scale * 4 + off) * 0.5 + 0.5
        t = max(0.0, min(1.0, (n * 0.75 + n2 * 0.25 - 0.5) * sharp + 0.5))
        c = [a + (b - a) * t for a, b in zip(c1, c2)]
        if c3 is not None and spot is not None:
            k = spot(v.co)
            if k > 0:
                c = [a + (b - a) * k for a, b in zip(c, c3)]
        col.data[i].color = (*[x ** 2.2 for x in c], 1)


def gradient(o, cf, seed=0):
    """Vertex colours from a function of the vertex position."""
    me = o.data
    if 'Col' not in me.color_attributes:
        me.color_attributes.new('Col', 'BYTE_COLOR', 'POINT')
    col = me.color_attributes['Col']
    me.color_attributes.active_color = col
    for i, v in enumerate(me.vertices):
        c = cf(v.co)
        col.data[i].color = (*[max(0, min(1, x)) ** 2.2 for x in c], 1)


def finish(o, m, smooth=True):
    o.data.materials.clear()
    o.data.materials.append(m)
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def join(name, objs):
    objs = [o for o in objs if o]
    for s in bpy.context.selected_objects:
        s.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    return o


# ---------- export / render ----------
def export(path, objs):
    for s in bpy.context.selected_objects:
        s.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_vertex_color='ACTIVE', export_normals=True,
                              export_materials='EXPORT', export_extras=False, export_animations=False,
                              export_skins=False)
