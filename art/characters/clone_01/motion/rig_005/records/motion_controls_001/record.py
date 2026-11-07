"""Author the shared-controls recipe/handoff and merge its catalog metadata."""
import hashlib
import json
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

base = Path('art/characters/clone_01/motion/rig_005')
record = base / 'records/motion_controls_001'
snapshot = base / 'records/runtime_snapshot_before_motion_controls_001/index.json'
test = base / 'tests/motion_controls_001/controls-smoke.json'
browser = base / 'reviews/motion_controls_001/browser.json'


def artifact(path):
    return {'path': str(path), 'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


numeric, chrome = json.loads(test.read_text()), json.loads(browser.read_text())
assert numeric['status'] == chrome['status'] == 'passed'
sources = ['game/animation/motion-controls.js', 'game/animation/rig-core.js', 'game/rig-lab.js', 'game/app.js', 'game/index.html']
recipe = {
    'schema_version': 1, 'iteration': 'motion_controls_001',
    'user_request': '각 동작에서  동일한것들을 조절할수있게 수정해줘',
    'status': 'development_connected_with_scoped_checks', 'art_direction_status': 'awaiting_user_review',
    'scope': 'Identical parts controls and independent saved settings for eight existing actions.',
    'modes': list(numeric['modes']),
    'fields': {'waist': [0, 45, .5], 'bend': [0, 45, .5], 'bust': [-5, 5, .5],
               'weaponDrop': [0, 18, 1], 'energy': [0, 150, 5], 'lightStrength': [0, 200, 10],
               'booleans': ['recoil', 'head', 'hair', 'cloth', 'cape', 'light']},
    'api': 'CharacterRig.setMotionControls(mode, settings, immediate)',
    'storage': 'dear-human:motion-controls:v1',
    'migration': 'Read previous firing-waist/kneeling-height/energy keys when no new profiles exist; preserve old keys. Read both old and common URL parameters.',
    'reset': 'Current action only or all eight action defaults; view/camera controls remain shared.',
    'pose_math': 'Add differences from each authored default; fixed-step .10-second easing. Pause edits apply immediately without advancing time or contact history.',
    'weapon_math': 'Common world-vertical offset of stock/weapon frame before hands, magazine, sights and muzzle. Horizontal muzzle baseline retained.',
    'runtime_sources': [artifact(p) for p in sources], 'previous_runtime': artifact(snapshot),
    'unchanged': ['Original raster artwork', 'Plan B/C', 'stride/contact history/bone lengths', '017 kneeling structure', 'dynamic_motion_001 performance layer'],
    'new_art_rasters': 0, 'external_model_calls': 0, 'gifs_generated': False,
    'recorded_at': datetime.now(ZoneInfo('Asia/Seoul')).isoformat(),
    'elapsed_since_snapshot_seconds': round(time.time() - json.loads(snapshot.read_text())['started_epoch'], 1),
    'time_scope': 'Wall time since source snapshot; earlier source reading not measured.', 'development_cost': None,
}
save(record / 'recipe.json', recipe)
handoff = {
    'iteration': 'motion_controls_001', 'status': 'scoped_checks_passed_awaiting_user_art_review',
    'recipe': artifact(record / 'recipe.json'),
    'validation': {'changed_js_syntax': 'passed', 'short_numeric_check': artifact(test), 'short_chrome_check': artifact(browser),
                   'baseline_max_coordinate_difference': numeric['baselineMaxDifference'], 'all_eight_motion_controls': 'passed',
                   'paused_waist_height_and_read_only_contacts': 'passed',
                   'full_test_suite': 'not_run', 'document_catalog_checks': 'not_run', 'historical_results': 'unchanged'},
    'entry_point': 'http://127.0.0.1:4173/#/samples/characters/clone_01?motion=walk_fire',
    'development_findings': ['The first review harness passed noncanonical 0.0 to a range input; corrected numeric serialization.',
                             'Later harness navigation exposed denied localStorage on about:blank. Fixture seeding now runs only on the preview origin, and each fresh document uses a unique search parameter. Final Chrome check passed without page errors.'],
    'remaining': ['User visual review of large combined base/additional waist angles and rifle height with arm/clothing occlusion.',
                  'Reload and stance transitions at extreme settings were not exhaustively reviewed.',
                  'Configured nominal waist includes authored breathing/load/recoil; displayed values do not promise an exact instantaneous body angle.',
                  'Existing temporary reload hands, source-view limitations and 2D cloth behavior remain.'],
}
save(record / 'handoff.json', handoff)

catalog_path = Path('game/public/assets/catalog/asset_index.json')
original = catalog_path.read_bytes()
catalog = json.loads(original)
entry = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
revision = next(r for r in entry['revisions'] if r['revision_id'] == 'rig_005')
iteration = {'iteration': 'motion_controls_001', 'verification': 'passed',
             'verification_scope': 'Changed JS syntax, eight-action short numeric/default comparison, and Chrome common controls/persistence/pause/URL/reset. No full QA or art acceptance.',
             'art_direction_status': 'awaiting_user_review', 'recipe_path': str(record / 'recipe.json'),
             'review_report': str(record / 'handoff.json'), 'previous_runtime': str(snapshot),
             'sample_url': '#/samples/characters/clone_01?motion=walk_fire'}
revision['motion_controls'] = iteration
revision.setdefault('motion_iterations', {})['motion_controls_001'] = iteration.copy()
revision['display_name'] = '파츠 모션 · 동작별 공통 조절 001'
revision['verification_scope'] = 'Latest motion_controls_001 has scoped syntax, eight-action numeric/default comparison and Chrome shared-control checks. Overall inherited art/combinations await user review; historical iteration statuses unchanged.'
for mode in numeric['modes']:
    revision.setdefault('motion_recipes', {})[mode] = str(record / 'recipe.json')
    revision.setdefault('motion_review_reports', {})[mode] = str(record / 'handoff.json')
revision['limitations'].extend(item for item in handoff['remaining'] if item not in revision['limitations'])
files = sources + ['README.md', 'AGENTS.md', 'docs/motion-controls-001.md', 'skills/dear-human-pipeline/SKILL.md', str(base / 'README.md'), str(snapshot)]
for folder in [record, base / 'tests/motion_controls_001', base / 'reviews/motion_controls_001']:
    files.extend(str(p) for p in folder.rglob('*') if p.is_file())
artifacts = {item['path']: item for item in revision['artifacts']}
artifacts.update({p: artifact(p) for p in files})
revision['artifacts'] = sorted(artifacts.values(), key=lambda a: a['path'])
assert catalog_path.read_bytes() == original, 'Concurrent catalog edit; rerun against latest bytes.'
save(catalog_path, catalog)
print(json.dumps({'iteration': 'motion_controls_001', 'scoped_checks': 'passed', 'art_review': 'pending', 'overall_verification': revision['verification'], 'artifacts_updated': len(files)}))
