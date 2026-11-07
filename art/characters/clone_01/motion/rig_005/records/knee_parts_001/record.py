"""Save scoped knee-attachment records and merge the latest catalog."""
import hashlib
import json
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

base = Path('art/characters/clone_01/motion/rig_005')
record = base / 'records/knee_parts_001'
snapshot = base / 'records/runtime_snapshot_before_knee_parts_001/index.json'
test = base / 'tests/knee_parts_001/knee-attachments.json'
browser = base / 'reviews/knee_parts_001/browser.json'
sources = ['game/animation/kneeling-pose.js', 'game/animation/webgl-character.js', str(base / 'rig/parts.json')]


def artifact(path):
    return {'path': str(path), 'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


numeric, chrome = json.loads(test.read_text()), json.loads(browser.read_text())
assert numeric['status'] == chrome['status'] == 'passed'
assert numeric['runtime_sources'] == chrome['runtime_sources'] == [artifact(path) for path in sources]
attachments = json.loads((record / 'attachments.json').read_text())
recipe = {
    'schema_version': 1, 'iteration': 'knee_parts_001', 'user_request': '앉기에서 무릎파츠가 이상해',
    'status': 'development_connected_with_scoped_checks', 'art_direction_status': 'awaiting_user_review',
    'findings': ['Horizontal UV split at .28 cut through the actual knee plate, leaving its tip on the rotating shin.',
                 'Repeated lower-third thigh connector protruded as a triangular wedge around both knees.',
                 'Raw atan2 wrap caused a 6.3456-radian pad-angle jump during sitting/standing.'],
    'attachments': artifact(record / 'attachments.json'),
    'changes': {'frontier_uv': attachments['frontier'], 'pad_pivot': .19, 'collar_rigid_from': .44,
                'pad_registration': 'Blend from original shin .13 pivot to .19. New lower .34 keeps the same .15-height floor clearance.',
                'collar': 'Share the complete plate UV border, then join the unchanged rigid shin below .44.',
                'inner_cloth': 'Small central lower-stocking crop, rounded mesh, original texture ratio and current thigh width scale.',
                'angle': 'Normalize the shin angle to [-pi,pi] before blending toward upright.'},
    'preserved': ['original PNGs', '017 pose reference/definition and joint targets', 'fixed thigh/shin lengths and foot contacts',
                  'standing/walking/running intact-shin path', 'current arm carry, slim thigh/gait and skirt fixes',
                  'per-action controls', 'Plan B/C work and all historical validation'],
    'runtime_sources': [artifact(path) for path in sources], 'previous_runtime': artifact(snapshot),
    'dependencies': [artifact(path) for path in ['game/animation/rig-core.js', 'game/animation/gait.js', 'game/animation/proportions.js',
                                              'game/animation/side-camera.js', 'art/characters/clone_01/motion/rig_004/source/limbs_atlas.png',
                                              'art/characters/clone_01/motion/rig_017/rig/kneeling_parts.json',
                                              'art/characters/clone_01/concepts/kneeling_fire_001/source/kneeling_fire.png']],
    'tools': ['Local Python UV authoring', 'shared WebGL renderer', 'Node scoped geometry check', 'Playwright with local macOS Google Chrome'],
    'new_art_rasters': 0, 'external_model_calls': 0, 'gifs_generated': False,
    'recorded_at': datetime.now(ZoneInfo('Asia/Seoul')).isoformat(),
    'elapsed_since_snapshot_seconds': round(time.time() - json.loads(snapshot.read_text())['started_epoch'], 1),
    'time_scope': 'Wall time since source snapshot; initial source reading not measured.', 'development_cost': None,
}
save(record / 'recipe.json', recipe)
handoff = {
    'iteration': 'knee_parts_001', 'status': 'scoped_checks_passed_awaiting_user_art_review', 'recipe': artifact(record / 'recipe.json'),
    'validation': {'changed_js_syntax': 'passed', 'short_geometry_check': artifact(test), 'short_chrome_comparison': artifact(browser),
                   'transition_frames': numeric['transitionFrames'], 'max_uv_area_difference': numeric['maxUVAreaDifference'],
                   'max_collar_seam_gap': numeric['maxSeamGap'], 'rigid_shin_difference': numeric['maxRigidShaftDifference'],
                   'max_bone_length_error': numeric['maxBoneError'], 'unchanged_part_definitions': numeric['unchangedParts'],
                   'previous_max_angle_step_rad': numeric['previousMaxPadAngleStep'], 'current_max_angle_step_rad': numeric['maxPadAngleStep'],
                   'full_test_suite': 'not_run', 'document_catalog_checks': 'not_run', 'historical_results': 'unchanged'},
    'comparison_method': 'Saved/current two-module and attachment-definition sets at identical time and zoom135%; no pose, sprite or frame alignment.',
    'review_harness': 'Initial wait assumed a faster existing easing. Replaced with UI mode changes and condition waits using function predicates compatible with the existing CSP; no app/CSP change.',
    'entry_points': {mode: 'http://127.0.0.1:4173/#/samples/characters/clone_01?motion=' + mode for mode in ['kneel', 'kneel_fire']},
    'remaining': ['User art review of the deep rear-knee collar deformation and occlusion using the existing side artwork.',
                  'Extreme manual controls and all stance/reload combinations were not exhaustively reviewed.',
                  'UV/mesh contact constraints do not certify physical alpha-surface collision or new folded/oblique artwork.'],
}
save(record / 'handoff.json', handoff)

catalog_path = Path('game/public/assets/catalog/asset_index.json')
original = catalog_path.read_bytes()
catalog = json.loads(original)
entry = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
revision = next(r for r in entry['revisions'] if r['revision_id'] == 'rig_005')
iteration = {'iteration': 'knee_parts_001', 'verification': 'passed',
             'verification_scope': 'Two changed JS syntax checks, complementary UV/edge/rigid-shin/bone constraints, one 288-step sit/stand cycle and short Chrome kneel/kneel_fire comparison and UI transition. No full QA or art acceptance.',
             'art_direction_status': 'awaiting_user_review', 'recipe_path': str(record / 'recipe.json'),
             'review_report': str(record / 'handoff.json'), 'previous_runtime': str(snapshot),
             'attachment_path': str(record / 'attachments.json'), 'sample_url': '#/samples/characters/clone_01?motion=kneel'}
revision['knee_parts'] = iteration
revision.setdefault('motion_iterations', {})['knee_parts_001'] = iteration.copy()
revision['display_name'] = '파츠 모션 · 앉기 무릎 파츠 001'
revision['verification_scope'] = 'Latest knee_parts_001 has scoped UV/collar continuity, bone constraints and Chrome sitting/standing checks. Deep folded artwork and inherited combinations remain pending; historical results unchanged.'
for mode in ['kneel', 'kneel_fire']:
    revision.setdefault('motion_recipes', {})[mode] = str(record / 'recipe.json')
    revision.setdefault('motion_review_reports', {})[mode] = str(record / 'handoff.json')
revision['limitations'].extend(item for item in handoff['remaining'] if item not in revision['limitations'])
files = sources + ['README.md', 'AGENTS.md', 'docs/knee-parts-001.md', 'skills/dear-human-pipeline/SKILL.md', str(base / 'README.md')]
for folder in [record, snapshot.parent, base / 'tests/knee_parts_001', base / 'reviews/knee_parts_001']:
    files.extend(str(p) for p in folder.rglob('*') if p.is_file())
artifacts = {item['path']: item for item in revision['artifacts']}
artifacts.update({path: artifact(path) for path in files})
revision['artifacts'] = sorted(artifacts.values(), key=lambda a: a['path'])
assert catalog_path.read_bytes() == original, 'Concurrent catalog edit; rerun against latest bytes.'
save(catalog_path, catalog)
print(json.dumps({'iteration': 'knee_parts_001', 'scoped_checks': 'passed', 'art_review': 'pending', 'overall_verification': revision['verification'], 'artifacts_updated': len(files)}))
