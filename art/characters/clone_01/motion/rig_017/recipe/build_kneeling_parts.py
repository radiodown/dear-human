"""Author kneeling UV attachments from existing textures, then connect rig_005.

This writes part definitions only. It does not render, test, inspect catalogs,
generate images or change any source raster. Original rectangles and scale
registrations remain available for all earlier poses.
"""
from copy import deepcopy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[6]
REVISION = ROOT / 'art/characters/clone_01/motion/rig_017'
LIVE = ROOT / 'art/characters/clone_01/motion/rig_005/rig/parts.json'


def grid(u0, u1, v0, v1, columns=6, rows=8):
    vertices = [[u0+(u1-u0)*x/columns, v0+(v1-v0)*y/rows]
                for y in range(rows+1) for x in range(columns+1)]
    indices = []
    for y in range(rows):
        for x in range(columns):
            k = y*(columns+1)+x
            indices.extend([k, k+1, k+columns+1,
                            k+1, k+columns+2, k+columns+1])
    return {'vertices': vertices, 'indices': indices}


def author(live):
    parts = {}
    for side in ('near', 'far'):
        shin = deepcopy(live['parts'][side+'_shin'])
        # Both pieces keep the entire original coordinate system. The cut at
        # .28 removes the old kneecap from the shaft with no duplicate image.
        parts[side+'_shin_shaft'] = {
            **shin, 'source_band': [.28, 1], 'material': 'rigid',
            'attachment': 'shin', 'label': side+' · 분리 정강이',
        }
        parts[side+'_knee_cap'] = {
            **shin, 'source_band': [0, .28], 'material': 'rigid',
            'attachment': 'knee', 'label': side+' · 독립 무릎 장갑',
        }
        thigh = live['parts'][side+'_thigh']
        x, y, width, height = thigh['rect']
        top = round(height*.68)
        parts[side+'_knee_fold'] = {
            'atlas': thigh['atlas'], 'rect': [x, y+top, width, height-top],
            'material': 'soft', 'attachment': 'knee_bisector',
            'label': side+' · 무릎 안쪽 연결 천',
        }
    skirt = deepcopy(live['parts']['skirt_core'])
    skirt.pop('uv_mesh', None)
    skirt['source_band'] = [.56, .75]
    skirt['label'] = '골반 벨트·파우치'
    parts['skirt_core'] = skirt
    for key, bounds, label in (
        ('skirt_rear_panel', [0, .52], '뒤쪽 스커트 패널'),
        ('skirt_front_panel', [.52, 1], '앞허벅지 위 스커트 패널'),
    ):
        parts[key] = {
            'atlas': skirt['atlas'], 'rect': skirt['rect'],
            'source_band': [.75, 1], 'material': 'segmented',
            'attachment': 'pelvis_thigh_drape', 'label': label,
            'preview_bounds': [bounds[0], .75, bounds[1], 1],
            'uv_mesh': grid(*bounds, .75, 1),
        }
    return {
        'schema_version': 1, 'revision_id': 'kneeling_parts_017',
        'pose_reference': 'art/characters/clone_01/concepts/kneeling_fire_001/source/kneeling_fire.png',
        'sources': [
            'art/characters/clone_01/motion/rig_004/source/limbs_atlas.png',
            'art/characters/clone_01/motion/rig_004/source/body_core.png',
            'art/characters/clone_01/motion/rig_004/source/base_atlas.png',
        ],
        'method': 'Non-overlapping original UV regions. Independent knee pads, shin shafts, knee cloth connectors and thigh-draped skirt panels. Existing cape texture uses a grounded runtime mesh.',
        'parts': parts,
        'verification': 'untested',
    }


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')


if __name__ == '__main__':
    live = json.loads(LIVE.read_text())
    authored = author(live)
    write(REVISION/'rig/kneeling_parts.json', authored)
    live['parts'].update(authored['parts'])
    live['kneeling_parts_revision'] = 'kneeling_parts_017'
    live['kneeling_pose_reference'] = authored['pose_reference']
    for order_key in ('draw_order', 'occlusion_order'):
        order = live[order_key]
        if 'skirt_core' in order:
            at = order.index('skirt_core')+1
            for key in ('skirt_rear_panel', 'skirt_front_panel'):
                if key not in order:
                    order.insert(at, key)
                    at += 1
    live['limitations'] = [*live.get('limitations', []),
        'Kneeling 017 reuses side-view source textures; true oblique shoulder/face views and new compressed-fold artwork are not generated. User visual review pending.']
    write(LIVE, live)
