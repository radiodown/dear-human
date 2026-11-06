"""Author UV meshes from the existing outfit texture; no image generation.

Run this file to write rig_011/rig/body_parts.json. --connect also updates the
four attachments in rig_005. This is an asset authoring recipe, not a test.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[6]
REVISION = ROOT / 'art/characters/clone_01/motion/rig_011'
RECT = [194, 78, 637, 1315]
UPPER, LOWER = .485, .56
# Authored in original body_core.png pixels along the gold breastplate rim.
OUTLINE = [
    [669, 386], [705, 398], [742, 421], [763, 452],
    [776, 482], [777, 511], [765, 541], [743, 567],
    [719, 579], [685, 576], [659, 562], [642, 538],
    [636, 506], [637, 469], [644, 433], [655, 405],
]


def uv(pixel):
    return [(pixel[0] - RECT[0]) / RECT[2],
            (pixel[1] - RECT[1]) / RECT[3]]


def torso_mesh(polygon):
    """Two horizontal strips around a convex hole, sharing its exact edges."""
    top, bottom = min(polygon, key=lambda p: p[1]), max(polygon, key=lambda p: p[1])
    rows = sorted({0, UPPER, *(v for _, v in polygon)})
    vertices, weights, indices = [], [], []
    columns = 4

    def bounds(v):
        if v < top[1]:
            return top[0], top[0], 0
        if v > bottom[1]:
            return bottom[0], bottom[0], 0
        crossings = []
        for i, (ax, ay) in enumerate(polygon):
            bx, by = polygon[(i + 1) % len(polygon)]
            if min(ay, by) <= v <= max(ay, by) and ay != by:
                crossings.append(ax + (bx - ax) * (v - ay) / (by - ay))
        return min(crossings), max(crossings), 1

    for side in range(2):
        start = len(vertices)
        for v in rows:
            left, right, active = bounds(v)
            for col in range(columns + 1):
                t = col / columns
                u = left * t if side == 0 else right + (1 - right) * t
                vertices.append([u, v])
                weights.append(active * (t if side == 0 else 1 - t) ** 3)
        for row in range(len(rows) - 1):
            for col in range(columns):
                k = start + row * (columns + 1) + col
                indices.extend([k, k + 1, k + columns + 1,
                                k + 1, k + columns + 2, k + columns + 1])
    return {'vertices': vertices, 'indices': indices, 'bust_weights': weights}


def body_parts():
    polygon = [uv(p) for p in OUTLINE]
    center = [sum(p[i] for p in polygon) / len(polygon) for i in range(2)]
    plate = {'vertices': [center, *polygon], 'indices': []}
    for i in range(len(polygon)):
        plate['indices'].extend([0, i + 1, (i + 1) % len(polygon) + 1])
    base = {'atlas': 'body', 'rect': RECT}
    parts = {
        'torso_shell': {
            **base, 'source_band': [0, UPPER], 'material': 'structured_cloth',
            'attachment': 'waist', 'label': '몸통',
            'uv_mesh': torso_mesh(polygon),
            'breastplate_hole': polygon,
        },
        'bust_armor': {
            **base, 'material': 'rigid', 'attachment': 'bust', 'label': '바스트·흉갑',
            'source_pivot': uv([650, 490]), 'uv_mesh': plate,
            'preview_bounds': [min(p[0] for p in polygon), min(p[1] for p in polygon),
                               max(p[0] for p in polygon), max(p[1] for p in polygon)],
        },
        'waist_cloth': {
            **base, 'source_band': [UPPER, LOWER], 'material': 'soft',
            'attachment': 'waist_pelvis_bridge', 'label': '허리 연결부',
        },
        'skirt_core': {
            **base, 'source_band': [LOWER, 1], 'material': 'segmented',
            'attachment': 'pelvis', 'label': '스커트',
        },
    }
    return {
        'schema_version': 1, 'revision_id': 'body_parts_011',
        'source_texture': 'art/characters/clone_01/motion/rig_004/source/body_core.png',
        'source_rect': RECT, 'breastplate_outline_source_pixels': OUTLINE,
        'waist_axis_above_hip': 34, 'body_height': 100,
        'method': 'Separate UV mesh attachments; rigid breastplate, torso with a matching hole, soft waist bridge, pelvis-bound skirt. Source raster unchanged.',
        'parts': parts,
    }


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--connect', action='store_true')
    args = parser.parse_args()
    authored = body_parts()
    write_json(REVISION / 'rig/body_parts.json', authored)
    if args.connect:
        live_path = ROOT / 'art/characters/clone_01/motion/rig_005/rig/parts.json'
        live = json.loads(live_path.read_text())
        live['parts'].update(authored['parts'])
        live['body_parts_revision'] = 'body_parts_011'
        write_json(live_path, live)
