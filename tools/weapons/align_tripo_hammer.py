"""Give the user's Tripo hammer (IH-7 Knocker) a real size, an axis-aligned pose and attachment sockets (model_3d_002).

The Tripo model lies diagonally (handle not on any axis). The handle axis is found by PCA of the handle vertices
(the thin part away from the head), the head by the vertices beyond the handle's end. The model is then turned so
    +X = along the handle towards the head, +Z = the head's long axis (striking faces at the two Z ends), Y = thin side,
centred in X / Y with the floor at z = 0 (same convention as the other weapon files), and scaled uniformly so the
overall length along the handle equals LENGTH. Empty nodes:
    socket_grip   the fist centre on the handle, GRIP_FROM_BUTT from the butt end (one-handed grip)
The Tripo handle is far too thick to hold (about 0.09 m at this length), so it is thinned about its own axis to
GRIP_DIAMETER (the butt cap with it), fading back to the original shape just before the head's collar.
    socket_head   centre of the head (where the handle enters it)
    socket_strike centre of the +Z striking face
The file keeps metres; attaching to a character multiplies by the character scale (1.0 unit tall ~ 1.65 m -> 0.606).

usage: blender -b --python tools/weapons/align_tripo_hammer.py -- <shoot/gun/ih-7.glb> <out.glb>"""
import bpy, sys, numpy as np
from mathutils import Matrix, Vector
argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv
LENGTH = 0.70           # m, butt to the far side of the head (proposal; the wiki gives no size)
GRIP_FROM_BUTT = 0.09   # m, fist centre from the butt end
GRIP_DIAMETER = 0.042   # m: the Tripo handle (about 0.09 m thick at this length) is thinned to a diameter a hand can close on
THIN_BLEND = 0.06       # m: the thinning fades out over this length before the head's collar
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
o = next(o for o in bpy.data.objects if o.type == 'MESH')
bpy.context.view_layer.objects.active = o; o.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
V = np.array([v.co[:] for v in o.data.vertices])
# the handle is a low-poly cylinder (vertices only at its ends): analyse area-weighted surface samples, not vertices
me = o.data; me.calc_loop_triangles()
T = np.array([[me.vertices[i].co[:] for i in tri.vertices] for tri in me.loop_triangles])
area = 0.5 * np.linalg.norm(np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]), axis=1)
rng = np.random.default_rng(7); pick = rng.choice(len(T), 60000, p=area / area.sum())
u = rng.random((60000, 2)); u[u.sum(1) > 1] = 1 - u[u.sum(1) > 1]
S = T[pick, 0] + u[:, :1] * (T[pick, 1] - T[pick, 0]) + u[:, 1:] * (T[pick, 2] - T[pick, 0])

# 1) rough axis: PCA of everything; 2) split head / handle along it; 3) refine with the handle only
def pca(P):
    c = P.mean(0); w, U = np.linalg.eigh(np.cov((P - c).T)); return c, U[:, ::-1]
c, U = pca(S); a = U[:, 0]
t = (S - c) @ a
def radial(mask):
    P = S[mask]; tt = (P - c) @ a; R = P - c - np.outer(tt, a); return np.linalg.norm(R, axis=1)
lo, hi = t.min(), t.max(); span = hi - lo
# the head is the end whose outer tenth spreads widest
r_lo = np.percentile(radial(t < lo + 0.1 * span), 90); r_hi = np.percentile(radial(t > hi - 0.1 * span), 90)
if r_lo > r_hi: a = -a; t = -t; lo, hi = -hi, -lo
for _ in range(3):   # handle = middle part, refine the axis on it
    m = (t > lo + 0.15 * span) & (t < lo + 0.55 * span)
    ch, Uh = pca(S[m]); a = Uh[:, 0] * np.sign(Uh[:, 0] @ a); c = ch
    t = (S - c) @ a; lo, hi = t.min(), t.max(); span = hi - lo
# head long axis: PCA of the head vertices perpendicular to the handle
head = t > hi - 0.22 * span
Ph = S[head] - c; Ph = Ph - np.outer(Ph @ a, a)
_, Uq = pca(Ph + c); z = Uq[:, 0]; z = z - (z @ a) * a; z /= np.linalg.norm(z)
y = np.cross(z, a)
R = np.array([a, y, z])          # rows: new x, y, z in old coordinates
Q = (V - c) @ R.T
QS = (S - c) @ R.T
scale = LENGTH / (Q[:, 0].max() - Q[:, 0].min())
Q *= scale; QS *= scale
# head-face side: put the larger head half at +Z (any face strikes; keep deterministic)
shift = np.array([-(Q[:, 0].max() + Q[:, 0].min()) / 2, -(Q[:, 1].max() + Q[:, 1].min()) / 2, -Q[:, 2].min()])
Q += shift; QS += shift
for v, q in zip(o.data.vertices, Q): v.co = Vector(q)
o.data.update(); o.name = 'ih7_knocker'

# sockets
xs = QS[:, 0]; x_butt = xs.min()
hm = xs > xs.max() - 0.22 * (xs.max() - xs.min())
handle_mid = (xs > x_butt + 0.05) & (xs < x_butt + 0.30)
yc = (QS[handle_mid, 1].max() + QS[handle_mid, 1].min()) / 2; zc = (QS[handle_mid, 2].max() + QS[handle_mid, 2].min()) / 2
head_x0 = QS[hm, 0].min()
hz0, hz1 = QS[hm, 2].min(), QS[hm, 2].max(); hy = (QS[hm, 1].max() + QS[hm, 1].min()) / 2
hx = (QS[hm, 0].max() + head_x0) / 2
sockets = {'socket_grip': (x_butt + GRIP_FROM_BUTT, yc, zc), 'socket_head': (hx, hy, (hz0 + hz1) / 2), 'socket_strike': (hx, hy, hz1)}
for n, p in sockets.items():
    e = bpy.data.objects.new(n, None); bpy.context.scene.collection.objects.link(e); e.location = p
# thin the handle about its axis (butt cap included); fade back to the original over THIN_BLEND before the collar
rad = np.hypot(QS[handle_mid, 1] - yc, QS[handle_mid, 2] - zc)
old_d = 2 * np.percentile(rad, 90); thin = GRIP_DIAMETER / old_d
x_end = head_x0 - 0.05                    # handle ends a little before the head (collar / neck kept)
def thin_of(x): return np.where(x < x_end - THIN_BLEND, thin, np.where(x < x_end, thin + (1 - thin) * (x - (x_end - THIN_BLEND)) / THIN_BLEND, 1.0))
f = thin_of(Q[:, 0]); Q[:, 1] = yc + (Q[:, 1] - yc) * f; Q[:, 2] = zc + (Q[:, 2] - zc) * f
for v, q in zip(o.data.vertices, Q): v.co = Vector(q)
o.data.update()
print('HANDLE diameter m %.3f -> %.3f (x %.3f, factor %.3f)' % (old_d, GRIP_DIAMETER, thin, thin))
dims = Q.max(0) - Q.min(0)
print('AXIS_OLD', np.round(a, 4), 'HEAD_Z_OLD', np.round(z, 4), 'SCALE', round(float(scale), 4))
print('DIMS m', np.round(dims, 3), 'HANDLE_RADIUS m', round(float((QS[handle_mid, 1].max() - QS[handle_mid, 1].min()) / 2), 4),
      'HEAD x %.3f..%.3f z %.3f..%.3f' % (head_x0, QS[hm, 0].max(), hz0, hz1))
for n, p in sockets.items(): print(n, tuple(round(float(v), 3) for v in p))
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_extras=False)
print('SAVED', out)
