"""Save this authored version and register its metadata; do not run checks.

Hashes identify written sources for later user review. This does not decode
images, run JS/tests, inspect links, launch browsers, or mark validation passed.
"""
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import hashlib
import json

ROOT = Path(__file__).resolve().parents[6]
RECORD = 'art/characters/clone_01/motion/rig_005/records/kneeling_image_017'
PARTS = 'art/characters/clone_01/motion/rig_017'
SNAPSHOT = 'art/characters/clone_01/motion/rig_005/records/runtime_snapshot_before_kneeling_image_017'
REFERENCE = 'art/characters/clone_01/concepts/kneeling_fire_001'
DOCUMENT = 'docs/kneeling-image-application-017.md'
RUNTIME = [
    'game/animation/kneeling-pose.js', 'game/animation/gait.js',
    'game/animation/firing-form.js', 'game/animation/rig-core.js',
    'game/animation/waist.js', 'game/animation/cape.js',
    'game/animation/webgl-character.js', 'game/animation/side-camera.js',
    'game/animation/muzzle-light.js', 'game/index.html',
    'art/characters/clone_01/motion/rig_005/rig/parts.json',
]


def artifact(path):
    return {'path': path, 'sha256': hashlib.sha256((ROOT/path).read_bytes()).hexdigest()}


def write(path, data):
    target = ROOT/path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')


if __name__ == '__main__':
    now = datetime.now(ZoneInfo('Asia/Seoul')).isoformat(timespec='seconds')
    dependencies = [
        {'kind': 'character', 'entity_id': 'clone_01', 'revision_id': revision}
        for revision in ('rig_004', 'parts_015', 'parts_014')
    ] + [{'kind': 'weapon', 'entity_id': 'm16_basic', 'revision_id': 'm16_binding_014'}]
    remaining = [
        'User review of the full kneeling silhouette, shoulder/cheek fit and both arms.',
        'User review of knee-pad alpha edges, folded knee/ankle overlap and front/rear skirt panel boundaries.',
        'User review of grounded cape projection, source emblem distortion and entry/exit transitions.',
        'Source side textures remain in use; no new oblique face/shoulder surfaces or deeply compressed-fold raster artwork.',
        'Existing temporary reload hand artwork remains unchanged.',
        'No tests, syntax/document/catalog checks or browser review have run.'
    ]
    recipe = {
        'schema_version': 1, 'iteration': 'kneeling_image_017', 'created_at': now,
        'user_instruction': '수정해줘',
        'approved_pose': artifact(REFERENCE+'/source/kneeling_fire.png'),
        'pose_adoption': REFERENCE+'/records/pose_reference_adoption.json',
        'basis': 'docs/kneeling-image-parts-analysis-001.md',
        'sources': [artifact(p) for p in (
            'art/characters/clone_01/motion/rig_004/source/limbs_atlas.png',
            'art/characters/clone_01/motion/rig_004/source/body_core.png',
            'art/characters/clone_01/motion/rig_004/source/base_atlas.png',
        )],
        'dependencies': dependencies,
        'authored_pose': 'game/animation/kneeling-pose.js',
        'authored_parts': PARTS+'/rig/kneeling_parts.json',
        'authoring_command': 'python3 '+PARTS+'/recipe/build_kneeling_parts.py',
        'method': 'Grounded fixed-length kneeling silhouette, dedicated chest/shoulder/arm profiles, level rifle, bounded sight-relative head seating, independent UV knee pads, thigh-draped skirt panels, grounded length-preserving cape ribbon.',
        'reference_interpretation': 'Side-rig pose interpretation; no elbow-to-forward-knee contact requirement.',
        'source_ratios': 'Original sprite rectangles/aspect ratios and leg bone lengths retained; authored arm projection stays within original bone lengths.',
        'generation': {'new_raster_images': 0, 'image_model_calls': 0, 'model': None,
                       'billed_cost': None, 'development_seconds': None},
        'verification': 'untested', 'art_direction_status': 'awaiting_user_review',
        'previous_runtime': SNAPSHOT+'/index.json',
    }
    write(RECORD+'/recipe.json', recipe)
    handoff = {
        'schema_version': 1, 'iteration': 'kneeling_image_017', 'created_at': now,
        'status': 'development_handoff', 'verification': 'untested',
        'art_direction_status': 'awaiting_user_review',
        'standing_user_instruction': '검증은 내가할게 개발만해봐',
        'recipe': artifact(RECORD+'/recipe.json'),
        'runtime_sources': [artifact(p) for p in RUNTIME],
        'previous_runtime': artifact(SNAPSHOT+'/index.json'),
        'entry_points': {
            'kneel': 'http://127.0.0.1:4173/#/samples/characters/clone_01?motion=kneel',
            'kneel_fire': 'http://127.0.0.1:4173/#/samples/characters/clone_01?motion=kneel_fire',
            'side_comparison': 'http://127.0.0.1:4173/#/samples/characters/clone_01?motion=kneel_fire&viewPitch=0',
        },
        'validation': {
            'tests': 'not_run', 'syntax_check': 'not_run',
            'docs_catalog_checks': 'not_run', 'browser_review': 'not_run',
            'new_tests_written': False, 'tool_default_output_paths_changed': False,
            'next_test_output': 'art/characters/clone_01/motion/rig_005/tests/kneeling_image_017',
            'next_browser_output': 'art/characters/clone_01/motion/rig_005/reviews/kneeling_image_017',
        },
        'preserved_scopes': ['Original PNGs and submitted image prompts',
                             '014 closed hand and M16 binding',
                             'Current running mechanics and running weapon advance',
                             '016 breathing and recoil reactions',
                             'Camera pitch and muzzle flash', 'Plan B/C',
                             'Historical tests/reviews and GIF outputs'],
        'remaining': remaining,
    }
    write(RECORD+'/handoff.json', handoff)
    write(REFERENCE+'/records/runtime_application_017.json', {
        'created_at': now, 'pose_reference': 'kneeling_fire_001',
        'runtime_iteration': 'kneeling_image_017', 'runtime_applied': True,
        'handoff': RECORD+'/handoff.json', 'verification': 'untested',
        'art_direction_status': 'awaiting_user_review',
        'note': 'The earlier adoption record describes its original analysis-only state and remains unchanged.',
    })
    authored_paths = [PARTS+'/README.md', PARTS+'/recipe/build_kneeling_parts.py',
                      PARTS+'/recipe/record_handoff.py', PARTS+'/rig/kneeling_parts.json',
                      RECORD+'/recipe.json', RECORD+'/handoff.json', DOCUMENT,
                      REFERENCE+'/source/kneeling_fire.png',
                      REFERENCE+'/records/runtime_application_017.json']
    catalog_path = ROOT/'game/public/assets/catalog/asset_index.json'
    catalog = json.loads(catalog_path.read_text())
    character = next(e for e in catalog['entries'] if e['kind']=='character' and e['entity_id']=='clone_01')
    rig = next(r for r in character['revisions'] if r['revision_id']=='rig_005')
    rig['display_name'] = '파츠 모션 · 정답 이미지 앉아쏴 017'
    rig['verification'] = 'untested'
    rig['verification_scope'] = 'Development handoff only; no runtime, syntax/document/catalog or browser checks executed.'
    rig['art_direction_status'] = 'awaiting_user_review'
    rig['recipe_path'] = RECORD+'/recipe.json'
    rig['recipe_key'] = artifact(RECORD+'/recipe.json')['sha256']
    rig['review_report'] = RECORD+'/handoff.json'
    for motion in ('kneel', 'kneel_fire'):
        rig.setdefault('motion_recipes', {})[motion] = RECORD+'/recipe.json'
        rig.setdefault('motion_review_reports', {})[motion] = RECORD+'/handoff.json'
    rig.setdefault('motion_iterations', {})['kneeling_image_017'] = {
        'recipe_path': RECORD+'/recipe.json', 'review_report': RECORD+'/handoff.json',
        'verification': 'untested', 'art_direction_status': 'awaiting_user_review',
        'motions': ['kneel', 'kneel_fire'],
        'preview': '#/samples/characters/clone_01?motion=kneel_fire',
    }
    new_dependency = {'kind': 'character', 'entity_id': 'clone_01', 'revision_id': 'parts_017'}
    if new_dependency not in rig['dependencies']:
        rig['dependencies'].append(new_dependency)
    rig['dependency_usage'] += ' parts_017 supplies kneeling knee/skirt UV attachments; source rasters remain unchanged.'
    for item in remaining:
        if item not in rig['limitations']:
            rig['limitations'].append(item)
    replacements = {p: artifact(p) for p in RUNTIME+authored_paths+[
        'art/characters/clone_01/motion/rig_005/README.md',
        'docs/20-agent-automation.md', 'skills/dear-human-pipeline/SKILL.md',
        SNAPSHOT+'/index.json',
    ]}
    rig['artifacts'] = [replacements.pop(a['path'], a) for a in rig['artifacts']]
    rig['artifacts'].extend(replacements.values())
    revision = {
        'revision_id': 'parts_017', 'display_name': '앉아쏴 무릎·스커트 부착물 017',
        'status': 'draft', 'verification': 'untested',
        'verification_scope': 'UV attachment authoring and runtime connection only; user review pending.',
        'art_direction_status': 'awaiting_user_review',
        'recipe_path': PARTS+'/rig/kneeling_parts.json',
        'recipe_key': artifact(PARTS+'/rig/kneeling_parts.json')['sha256'],
        'artifacts': [artifact(p) for p in authored_paths],
        'dependencies': dependencies,
        'preview': {'type': 'parts_rig', 'sample_url': '#/samples/characters/clone_01?motion=kneel_fire'},
        'limitations': remaining,
    }
    character['revisions'] = [r for r in character['revisions'] if r['revision_id']!='parts_017']+[revision]
    write('game/public/assets/catalog/asset_index.json', catalog)
