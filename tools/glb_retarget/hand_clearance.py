"""Keep hand/finger skin out of a weapon mesh (shared by attach_weapon.py and attach_dual_pistols.py).

HandClearance(arm, bodies, gun_mesh_in_gun_space):
Only the palm / back of the hand (skin whose dominant bone is the hand bone itself) is kept out: curled fingers
wrapping around a grip naturally go behind it, but a palm buried in the gun shows the gun cutting through the hand.
  .local(side)   -> hand skin points (a fixed subsample) in the hand bone's local frame at the CURRENT frame
                    (uses the evaluated, posed body meshes; the fingers keep their clip curl)
  .shift(side, local, hand_rot, wrist, M, dirs) -> smallest move of the hand (armature space) along one of `dirs`
                    (gun-space unit vectors) so that no point is deeper than TOL inside the gun; tries each direction
                    by bisection up to MAX_SHIFT and keeps the shortest; if none clears, the least deep one.
Inside test: nearest point on the gun surface with its face normal (Tripo meshes are closed).
Units: character units (1.0 tall); TOL / MAX_SHIFT are given in real metres and scaled by k."""
import random
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

TOL = 0.001          # m real: allowed depth inside the gun
MAX_SHIFT = 0.12     # m real
SAMPLES = 260        # skin points per hand


class HandClearance:
    def __init__(self, arm, bodies, gun_verts, gun_polys, k):
        self.arm, self.bodies, self.k = arm, bodies, k
        self.bvh = BVHTree.FromPolygons([Vector(v) for v in gun_verts], [tuple(p) for p in gun_polys])
        self.sel = {'Left': [], 'Right': []}
        rnd = random.Random(7)
        for b in bodies:
            names = {g.index: g.name for g in b.vertex_groups}
            per = {'Left': [], 'Right': []}
            for v in b.data.vertices:
                if not v.groups: continue
                n = names.get(max(v.groups, key=lambda g: g.weight).group, '')
                if n in ('mixamorig:LeftHand', 'mixamorig:RightHand'):
                    per['Left' if 'Left' in n else 'Right'].append(v.index)
            for side in per:
                idx = per[side]
                if len(idx) > SAMPLES: idx = rnd.sample(idx, SAMPLES)
                self.sel[side].append((b, idx))

    def local(self, side):
        import bpy
        dg = bpy.context.evaluated_depsgraph_get()
        H = self.arm.pose.bones[f'mixamorig:{side}Hand'].matrix
        Hinv = H.inverted(); amw_inv = self.arm.matrix_world.inverted(); out = []
        for b, idx in self.sel[side]:
            if not idx: continue
            be = b.evaluated_get(dg); m = be.to_mesh(); T = Hinv @ amw_inv @ b.matrix_world
            out += [T @ m.vertices[i].co for i in idx]
            be.to_mesh_clear()
        return out

    def depth(self, pts_gun):
        worst = 0.0
        for q in pts_gun:
            loc, nor, _, d = self.bvh.find_nearest(q, 0.08)
            if loc is not None and (q - loc).dot(nor) < 0 and d > worst: worst = d
        return worst

    def shift(self, local, hand_rot, wrist, M, dirs):
        Minv = M.inverted(); R3 = M.to_3x3()
        H = Matrix.Translation(wrist) @ hand_rot.to_4x4()
        base = [Minv @ (H @ p) for p in local]                 # points in gun space
        tol, top = TOL * self.k, MAX_SHIFT * self.k
        d0 = self.depth(base)
        if d0 <= tol: return Vector((0, 0, 0)), d0, d0
        best = None
        for dg in dirs:
            dg = Vector(dg).normalized()
            if self.depth([p + dg * top for p in base]) > tol:
                cand = (float('inf'), self.depth([p + dg * top for p in base]), dg * top)
            else:
                lo, hi = 0.0, top
                for _ in range(10):
                    mid = (lo + hi) / 2
                    if self.depth([p + dg * mid for p in base]) > tol: lo = mid
                    else: hi = mid
                cand = (hi, 0.0, dg * hi)
            if best is None or (cand[0], cand[1]) < (best[0], best[1]): best = cand
        dist, rest, v_gun = best
        return R3 @ v_gun, d0, rest
