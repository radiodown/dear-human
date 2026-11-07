"""Author skirt/thigh coverage records and merge the scoped catalog update."""
import hashlib
import json
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

base = Path('art/characters/clone_01/motion/rig_005')
record = base / 'records/skirt_walk_cover_001'
snapshot = base / 'records/runtime_snapshot_before_skirt_walk_cover_001/index.json'
test = base / 'tests/skirt_walk_cover_001/garment-smoke.json'
browser = base / 'reviews/skirt_walk_cover_001/browser.json'
playback = base / 'reviews/skirt_walk_cover_001/walk-playback.json'


def artifact(path):
    return {'path': str(path), 'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


numeric, chrome, live = [json.loads(p.read_text()) for p in [test, browser, playback]]
assert numeric['status'] == chrome['status'] == live['status'] == 'passed'
sources = ['game/animation/waist.js', 'game/animation/webgl-character.js']
recipe = {
    'schema_version': 1, 'iteration': 'skirt_walk_cover_001',
    'user_request': '걸을때 스커트 밖으로 허벅지쪽이 빠져나가는게 이상해. 스커트가 다리를 덮고있지않고있는 느낌이야',
    'status': 'development_connected_with_scoped_checks', 'art_direction_status': 'awaiting_user_review',
    'scope': 'Walking/running skirt drape and proximal thigh attachment using existing artwork.',
    'findings': ['Previous skirt panels only followed thighs while kneeling; moving panels otherwise remained on the pelvis.',
                 'The proximal thigh cap rotated with the full leg and could escape the skirt silhouette.'],
    'parameters': {'front_gain': .80, 'rear_gain': .65, 'max_angle_radians': .70,
                   'thigh_pin_end_v': .28, 'vertical_follow': .25, 'outer_hem_drop': 5,
                   'panel_top_v': .75, 'shared_seam_u': .52},
    'changes': ['Pin proximal skin rotation to pelvis and blend down to the solved thigh; keep both bone centers fixed.',
                'Use the forward/back envelope of both thighs so alternating legs push the same garment.',
                'Pin belt/top and central seam; reduce vertical lift and retain downward overlap.',
                'Fade moving drape out during kneeling; preserve standing and full kneeling UV coordinates.'],
    'visual_iteration': 'First direct-rotation drape lifted the hem too much; archived before adding reduced vertical following and downward fall.',
    'runtime_sources': [artifact(p) for p in sources], 'previous_runtime': artifact(snapshot),
    'dependencies': [artifact(p) for p in ['game/animation/rig-core.js', 'game/animation/side-camera.js', 'game/animation/kneeling-pose.js',
                                         str(base / 'rig/parts.json'), 'art/characters/clone_01/motion/rig_004/source/body_core.png',
                                         'art/characters/clone_01/motion/rig_004/source/limbs_atlas.png']],
    'retained': ['Original image files and rig definition', 'Bone lengths and foot contacts', 'Head/body sync',
                 'Carry/idle/firing behavior', 'Per-action controls/storage', 'Plan B/C'],
    'new_art_rasters': 0, 'external_model_calls': 0, 'gifs_generated': False,
    'recorded_at': datetime.now(ZoneInfo('Asia/Seoul')).isoformat(),
    'elapsed_since_snapshot_seconds': round(time.time() - json.loads(snapshot.read_text())['started_epoch'], 1),
    'time_scope': 'Wall time since source snapshot; earlier source/asset reading not measured.', 'development_cost': None,
}
save(record / 'recipe.json', recipe)
handoff = {
    'iteration': 'skirt_walk_cover_001', 'status': 'scoped_checks_passed_awaiting_user_art_review', 'recipe': artifact(record / 'recipe.json'),
    'validation': {'changed_js_syntax': 'passed', 'short_garment_check': artifact(test), 'short_chrome_comparison': artifact(browser),
                   'live_walking': artifact(playback), 'pinned_seam_standing_kneeling_and_joints': numeric,
                   'full_test_suite': 'not_run', 'document_catalog_checks': 'not_run', 'historical_results': 'unchanged'},
    'comparison_method': 'Freeze identical game pose/time; switch only skirt projection and proximal-thigh warp to saved previous behavior. No artwork edits or frame alignment.',
    'review_harness': 'Saved baseline module imports are rebased in a local Playwright response fixture; application CSP was retained. Initial blob import was rejected by CSP before captures.',
    'entry_points': {mode: 'http://127.0.0.1:4173/#/samples/characters/clone_01?motion=' + mode for mode in ['walk', 'walk_fire', 'run']},
    'remaining': ['User review of visible skirt/thigh alpha overlap across the full gait cycle.',
                  'Extreme strides/manual settings, source pleat distortion and kneeling transitions were not exhaustively reviewed.',
                  'This is authored 2D garment drape and skinning; no physical cloth/collision or newly drawn folds.'],
}
save(record / 'handoff.json', handoff)

catalog_path = Path('game/public/assets/catalog/asset_index.json')
original = catalog_path.read_bytes()
catalog = json.loads(original)
entry = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
revision = next(r for r in entry['revisions'] if r['revision_id'] == 'rig_005')
iteration = {'iteration': 'skirt_walk_cover_001', 'verification': 'passed',
             'verification_scope': 'Changed JS syntax, garment attachment/seam/unchanged standing-kneeling checks, same-pose Chrome before/after and short live walk. Full alpha coverage/art acceptance not passed.',
             'art_direction_status': 'awaiting_user_review', 'recipe_path': str(record / 'recipe.json'),
             'review_report': str(record / 'handoff.json'), 'previous_runtime': str(snapshot),
             'sample_url': '#/samples/characters/clone_01?motion=walk'}
revision['skirt_walk_cover'] = iteration
revision.setdefault('motion_iterations', {})['skirt_walk_cover_001'] = iteration.copy()
revision['display_name'] = '파츠 모션 · 스커트 보행 덮임 001'
revision['verification_scope'] = 'Latest skirt_walk_cover_001 has scoped garment, same-pose Chrome comparison and short walk checks. Full gait alpha/occlusion and inherited combinations await user review; historical results unchanged.'
for mode in ['walk', 'walk_fire', 'run', 'run_fire']:
    revision.setdefault('motion_recipes', {})[mode] = str(record / 'recipe.json')
    revision.setdefault('motion_review_reports', {})[mode] = str(record / 'handoff.json')
revision['limitations'].extend(item for item in handoff['remaining'] if item not in revision['limitations'])
files = sources + ['README.md', 'AGENTS.md', 'docs/skirt-walk-cover-001.md', 'skills/dear-human-pipeline/SKILL.md', str(base / 'README.md'), str(snapshot)]
for folder in [record, base / 'tests/skirt_walk_cover_001', base / 'reviews/skirt_walk_cover_001']:
    files.extend(str(p) for p in folder.rglob('*') if p.is_file())
artifacts = {item['path']: item for item in revision['artifacts']}
artifacts.update({p: artifact(p) for p in files})
revision['artifacts'] = sorted(artifacts.values(), key=lambda a: a['path'])
assert catalog_path.read_bytes() == original, 'Concurrent catalog edit; rerun against latest bytes.'
save(catalog_path, catalog)
print(json.dumps({'iteration': 'skirt_walk_cover_001', 'scoped_checks': 'passed', 'art_review': 'pending', 'overall_verification': revision['verification'], 'artifacts_updated': len(files)}))
