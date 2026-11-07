"""Author carry/idle records and merge the added action into the catalog."""
import hashlib
import json
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

base = Path('art/characters/clone_01/motion/rig_005')
record = base / 'records/carry_idle_001'
snapshot = base / 'records/runtime_snapshot_before_carry_idle_001/index.json'
test = base / 'tests/carry_idle_001/carry-smoke.json'
browser = base / 'reviews/carry_idle_001/browser.json'


def artifact(path):
    return {'path': str(path), 'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


numeric, chrome = json.loads(test.read_text()), json.loads(browser.read_text())
assert numeric['status'] == chrome['status'] == 'passed'
sources = ['game/animation/firing-form.js', 'game/animation/rig-core.js', 'game/animation/motion-controls.js', 'game/rig-lab.js', 'game/index.html']
recipe = {
    'schema_version': 1, 'iteration': 'carry_idle_001',
    'user_request': '총을 쏘지 않고 달릴대는 총구가 아래를 보고 달리게. 대기 두가지, 견착자세랑 완전대기',
    'status': 'development_connected_with_scoped_checks', 'art_direction_status': 'awaiting_user_review',
    'scope': 'Downward non-firing run, preserved shouldered idle and new relaxed idle; shared per-action controls retained.',
    'profiles': {'run': {'down_pitch_degrees': 35, 'seat_delta': [-4, 0]},
                 'relaxed': {'down_pitch_degrees': 58, 'seat_local': [-24, 8], 'waist_default_degrees': 0},
                 'idle': 'Existing shouldered/forward-horizontal pose.', 'run_fire': 'Existing forward-horizontal firing baseline and forward gaze.'},
    'api': ['weaponCarry()', 'WEAPON_CARRY', 'CharacterRig.setRelaxed(bool)', 'Existing requestFire/trigger inputs'],
    'transition': {'relax_time_seconds': .18, 'raise_aim_range': [.05, .85],
                   'first_shot_gate': 'Existing >.9 aim readiness and at least .12 seconds preparation; full raise precedes first shot.',
                   'release': 'Existing aim hold/decay returns to lowered carry.', 'reload': 'Blend lowered pitch out during authored reload manipulation.'},
    'transform_order': 'Select carry seat and pitch, calculate the complete weapon frame, then solve grips, magazine, sights and muzzle.',
    'storage': 'New relaxed profile in dear-human:motion-controls:v1; missing saved mode gets defaults without changing older profiles.',
    'runtime_sources': [artifact(p) for p in sources], 'previous_runtime': artifact(snapshot),
    'dependencies': [artifact(p) for p in ['game/animation/weapon-profiles.js', 'game/animation/proportions.js', 'game/animation/gait.js', str(base / 'rig/parts.json')]],
    'unchanged': ['Source raster artwork', 'Plan B/C', 'gait contacts/bone lengths', 'kneeling 017', 'Existing shared controls and reaction toggles'],
    'new_art_rasters': 0, 'external_model_calls': 0, 'gifs_generated': False,
    'recorded_at': datetime.now(ZoneInfo('Asia/Seoul')).isoformat(),
    'elapsed_since_snapshot_seconds': round(time.time() - json.loads(snapshot.read_text())['started_epoch'], 1),
    'time_scope': 'Wall time since source snapshot; initial source reading not measured.', 'development_cost': None,
}
save(record / 'recipe.json', recipe)
handoff = {
    'iteration': 'carry_idle_001', 'status': 'scoped_checks_passed_awaiting_user_art_review', 'recipe': artifact(record / 'recipe.json'),
    'validation': {'changed_js_syntax': 'passed', 'short_numeric_check': artifact(test), 'short_chrome_check': artifact(browser),
                   'states': numeric['states'], 'raise_fire_return': numeric['transitions'],
                   'full_test_suite': 'not_run', 'document_catalog_checks': 'not_run', 'historical_results': 'unchanged'},
    'entry_points': {mode: 'http://127.0.0.1:4173/#/samples/characters/clone_01?motion=' + mode for mode in ['idle', 'relaxed', 'run', 'run_fire']},
    'remaining': ['User visual review of lowered rifle/arm overlap and off-shoulder carry silhouette.',
                  'Extreme combined waist/height settings and reload transitions were not exhaustively reviewed.',
                  'No new relaxed-hand artwork, sling simulation or 3D cloth/collision was created.'],
}
save(record / 'handoff.json', handoff)

catalog_path = Path('game/public/assets/catalog/asset_index.json')
original = catalog_path.read_bytes()
catalog = json.loads(original)
entry = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
revision = next(r for r in entry['revisions'] if r['revision_id'] == 'rig_005')
iteration = {'iteration': 'carry_idle_001', 'verification': 'passed',
             'verification_scope': 'Changed JS syntax, short carry/grip/first-shot/return checks and Chrome idle/run display, controls and shot input. No art acceptance or full QA.',
             'art_direction_status': 'awaiting_user_review', 'recipe_path': str(record / 'recipe.json'),
             'review_report': str(record / 'handoff.json'), 'previous_runtime': str(snapshot),
             'sample_url': '#/samples/characters/clone_01?motion=relaxed'}
revision['carry_idle'] = iteration
revision.setdefault('motion_iterations', {})['carry_idle_001'] = iteration.copy()
revision['display_name'] = '파츠 모션 · 두 대기 / 총 내린 달리기 001'
revision['verification_scope'] = 'Latest carry_idle_001 has scoped syntax, carry/grip/raise-before-shot/return and short Chrome checks. Overall inherited art/combinations await user review; historical results unchanged.'
for owner in [entry, revision]:
    if 'relaxed' not in owner['motions']: owner['motions'].insert(owner['motions'].index('idle') + 1, 'relaxed')
for mode in ['idle', 'relaxed', 'run', 'run_fire']:
    revision.setdefault('motion_recipes', {})[mode] = str(record / 'recipe.json')
    revision.setdefault('motion_review_reports', {})[mode] = str(record / 'handoff.json')
revision['limitations'].extend(item for item in handoff['remaining'] if item not in revision['limitations'])
files = sources + ['README.md', 'AGENTS.md', 'docs/carry-idle-001.md', 'skills/dear-human-pipeline/SKILL.md', str(base / 'README.md'), str(snapshot)]
for folder in [record, base / 'tests/carry_idle_001', base / 'reviews/carry_idle_001']:
    files.extend(str(p) for p in folder.rglob('*') if p.is_file())
artifacts = {item['path']: item for item in revision['artifacts']}
artifacts.update({p: artifact(p) for p in files})
revision['artifacts'] = sorted(artifacts.values(), key=lambda a: a['path'])
assert catalog_path.read_bytes() == original, 'Concurrent catalog edit; rerun against latest bytes.'
save(catalog_path, catalog)
print(json.dumps({'iteration': 'carry_idle_001', 'scoped_checks': 'passed', 'art_review': 'pending', 'overall_verification': revision['verification'], 'added_motion': 'relaxed', 'artifacts_updated': len(files)}))
