"""Register complementary knee plate/collar UVs without changing source PNGs."""
from copy import deepcopy
import json
import math
from pathlib import Path

base = Path('art/characters/clone_01/motion/rig_005')
live_path = base / 'rig/parts.json'
frontier = [[0, .21], [.35, .21], [.48, .25], [.61, .33], [1, .34]]


def strips(cap):
    vertices = []
    for u, cut in frontier:
        rows = [0, cut] if cap else [cut, (cut + .44) / 2, .44, .65, .85, 1]
        vertices.extend([u, v] for v in rows)
    count = 2 if cap else 6
    indices = []
    for i in range(len(frontier) - 1):
        for j in range(count - 1):
            a, b = i * count + j, (i + 1) * count + j
            indices.extend([a, b, a + 1, b, b + 1, a + 1])
    return {'vertices': vertices, 'indices': indices}


live = json.loads(live_path.read_text())
parts = {}
for side in ['near', 'far']:
    for suffix, cap in [('knee_cap', True), ('shin_shaft', False)]:
        part = deepcopy(live['parts'][side + '_' + suffix])
        part.pop('source_band', None)
        part['uv_mesh'] = strips(cap)
        part['attachment_revision'] = 'knee_parts_001'
        part['preview_bounds'] = [0, 0 if cap else .21, 1, .34 if cap else 1]
        parts[side + '_' + suffix] = part
    # Only the small, central lower stocking region bridges the folded joint.
    # Repeating the whole lower third of the thigh created a protruding wedge.
    thigh = live['parts'][side + '_thigh']
    x, y, w, h = thigh['rect']
    top, left, right = round(h * .84), round(w * .2), round(w * .8)
    part = deepcopy(live['parts'][side + '_knee_fold'])
    part['rect'] = [x + left, y + top, right - left, h - top]
    vertices = [[.5, .5]] + [[.5 + .5 * math.cos(i * math.tau / 12), .5 + .5 * math.sin(i * math.tau / 12)] for i in range(12)]
    part['uv_mesh'] = {'vertices': vertices, 'indices': [value for i in range(12) for value in [0, 1 + i, 1 + (i + 1) % 12]]}
    part['attachment_revision'] = 'knee_parts_001'
    parts[side + '_knee_fold'] = part

definition = {'schema_version': 1, 'revision_id': 'knee_parts_001',
              'source': 'art/characters/clone_01/motion/rig_004/source/limbs_atlas.png',
              'method': 'Complementary original UV plate/collar strips and small rounded lower-stocking connector; no source raster edits.',
              'frontier': frontier, 'pad_pivot': .19, 'collar_rigid_from': .44,
              'parts': parts, 'verification': 'awaiting_scoped_review'}
(base / 'records/knee_parts_001/attachments.json').write_text(json.dumps(definition, ensure_ascii=False, indent=2) + '\n')
live['parts'].update(parts)
live['knee_attachment_revision'] = 'knee_parts_001'
live_path.write_text(json.dumps(live, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'revision': 'knee_parts_001', 'parts': len(parts), 'new_rasters': 0}))
