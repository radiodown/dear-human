"""Save carry-pose provenance and merge this iteration into the latest catalog."""
import hashlib
import json
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

base = Path('art/characters/clone_01/motion/rig_005')
record = base / 'records/carry_arms_001'
snapshot = base / 'records/runtime_snapshot_before_carry_arms_001/index.json'
test = base / 'tests/carry_arms_001/carry-arms.json'
browser = base / 'reviews/carry_arms_001/browser.json'
sources = ['game/animation/firing-form.js', 'game/animation/rig-core.js']


def artifact(path):
    return {'path': str(path), 'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


numeric, chrome = json.loads(test.read_text()), json.loads(browser.read_text())
assert numeric['status'] == chrome['status'] == 'passed'
assert numeric['runtime_sources'] == [artifact(path) for path in ['game/animation/rig-core.js', 'game/animation/firing-form.js']]
assert chrome['runtime_sources'] == [artifact(path) for path in sources]
recipe = {
    'schema_version': 1, 'iteration': 'carry_arms_001',
    'user_requests': ['달리기에서 팔이 이상해', '완전대기도 팔이꺽겨'],
    'status': 'development_connected_with_scoped_checks', 'art_direction_status': 'awaiting_user_review',
    'findings': ['Relaxed carry put the primary wrist behind its shoulder, selecting the forward elbow/reversed forearm branch.',
                 'Running carry placed the rifle too far behind the body, flaring the primary elbow.'],
    'changes': {'run_seat_offset': {'before': [-4, 0], 'after': [4.5, -6]},
                'relaxed_seat': {'before': [-24, 8], 'after': [0, -6]},
                'coordinate_space': 'Shoulder frame logical pixels, positive y down.',
                'elbows': 'Stable underside IK branch throughout lowered carry and raise/return.',
                'reach': 'Nearest point in the intersection of both fixed-length wrist/stock disks; move the complete rifle frame.',
                'extension_reserve': .75, 'application': 'Lowered non-reloading carry only.'},
    'preserved': ['Muzzle down 35 degrees running / 58 degrees relaxed', 'shouldered idle and firing/kneeling guides',
                  'source PNGs and original projected arm lengths', 'hand sockets and closed support grip',
                  'current slimmer thighs/gait, head/body synchronization and skirt overlap', 'per-action controls and saved profiles', 'Plan B/C work'],
    'runtime_sources': [artifact(path) for path in sources], 'previous_runtime': artifact(snapshot),
    'dependencies': [artifact(path) for path in ['game/animation/proportions.js', 'game/animation/gait.js', 'game/animation/motion-controls.js',
                                              'game/animation/kneeling-pose.js', 'game/animation/webgl-character.js', str(base / 'rig/parts.json')]],
    'new_art_rasters': 0, 'external_model_calls': 0, 'gifs_generated': False,
    'recorded_at': datetime.now(ZoneInfo('Asia/Seoul')).isoformat(),
    'elapsed_since_snapshot_seconds': round(time.time() - json.loads(snapshot.read_text())['started_epoch'], 1),
    'time_scope': 'Wall time since source snapshot; initial source reading not measured.', 'development_cost': None,
}
save(record / 'recipe.json', recipe)
handoff = {
    'iteration': 'carry_arms_001', 'status': 'scoped_checks_passed_awaiting_user_art_review', 'recipe': artifact(record / 'recipe.json'),
    'validation': {'changed_js_syntax': 'passed', 'short_carry_check': artifact(test), 'short_chrome_comparison': artifact(browser),
                   'carry_states_sampled': len(numeric['states']), 'raise_return': numeric['transitions'],
                   'unchanged_joint_target_maximum_difference': numeric['unchangedMaximumDifference'],
                   'full_test_suite': 'not_run', 'document_catalog_checks': 'not_run', 'historical_results': 'unchanged'},
    'comparison_method': 'Separate saved/current two-module sets at the same fixed-step times. No sprite resizing or pose alignment.',
    'entry_points': {mode: 'http://127.0.0.1:4173/#/samples/characters/clone_01?motion=' + mode for mode in ['relaxed', 'run']},
    'remaining': ['User review of lowered carry arm silhouette and gun/body occlusion.',
                  'Large weapon-height settings are bounded by the real two-arm reach and may not apply the full requested drop.',
                  'All extreme controls, alternate weapons and reload combinations were not exhaustively reviewed; existing reload art/IK limitations remain.'],
}
save(record / 'handoff.json', handoff)

catalog_path = Path('game/public/assets/catalog/asset_index.json')
original = catalog_path.read_bytes()
catalog = json.loads(original)
entry = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
revision = next(r for r in entry['revisions'] if r['revision_id'] == 'rig_005')
iteration = {'iteration': 'carry_arms_001', 'verification': 'passed',
             'verification_scope': 'Two changed JS syntax checks, six short carry reach/branch states, raise/return and unchanged shouldered/firing/kneeling targets; short Chrome comparisons/playback. No full QA or art acceptance.',
             'art_direction_status': 'awaiting_user_review', 'recipe_path': str(record / 'recipe.json'),
             'review_report': str(record / 'handoff.json'), 'previous_runtime': str(snapshot),
             'sample_url': '#/samples/characters/clone_01?motion=relaxed'}
revision['carry_arms'] = iteration
revision.setdefault('motion_iterations', {})['carry_arms_001'] = iteration.copy()
revision['display_name'] = '파츠 모션 · 달리기/완전 대기 팔 001'
revision['verification_scope'] = 'Latest carry_arms_001 has scoped arm/stock contacts, elbow branch, raise/return and Chrome carry checks. Inherited motion combinations and art acceptance remain pending; historical results unchanged.'
for mode in ['relaxed', 'run', 'run_fire']:
    revision.setdefault('motion_recipes', {})[mode] = str(record / 'recipe.json')
    revision.setdefault('motion_review_reports', {})[mode] = str(record / 'handoff.json')
revision['limitations'].extend(item for item in handoff['remaining'] if item not in revision['limitations'])
files = sources + ['README.md', 'AGENTS.md', 'docs/carry-arms-001.md', 'skills/dear-human-pipeline/SKILL.md', str(base / 'README.md')]
for folder in [record, snapshot.parent, base / 'tests/carry_arms_001', base / 'reviews/carry_arms_001']:
    files.extend(str(p) for p in folder.rglob('*') if p.is_file())
artifacts = {item['path']: item for item in revision['artifacts']}
artifacts.update({path: artifact(path) for path in files})
revision['artifacts'] = sorted(artifacts.values(), key=lambda a: a['path'])
assert catalog_path.read_bytes() == original, 'Concurrent catalog edit; rerun against latest bytes.'
save(catalog_path, catalog)
print(json.dumps({'iteration': 'carry_arms_001', 'scoped_checks': 'passed', 'art_review': 'pending', 'overall_verification': revision['verification'], 'artifacts_updated': len(files)}))
