"""Author leg/gait records and merge the current parts-iteration metadata."""
import hashlib
import json
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

base = Path('art/characters/clone_01/motion/rig_005')
record = base / 'records/leg_gait_001'
snapshot = base / 'records/runtime_snapshot_before_leg_gait_001/index.json'
test = base / 'tests/leg_gait_001/gait-smoke.json'
browser = base / 'reviews/leg_gait_001/browser.json'


def artifact(path):
    return {'path': str(path), 'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


numeric, chrome = json.loads(test.read_text()), json.loads(browser.read_text())
assert numeric['status'] == chrome['status'] == 'passed'
sources = ['game/animation/' + name for name in ['proportions.js', 'gait.js', 'rig-core.js', 'webgl-character.js', 'secondary-motion.js']]
sources.append('game/index.html')
recipe = {
    'schema_version': 1, 'iteration': 'leg_gait_001',
    'user_request': '허벅지 다리가 너무 두꺼워. 그리고 걷고 뛰는 폼이 이상해',
    'status': 'development_connected_with_scoped_checks', 'art_direction_status': 'awaiting_user_review',
    'scope': 'Explicit slimmer transverse thigh silhouette and authored walking/running form correction.',
    'findings': ['Native thigh sprite width was broad relative to current torso; moving hip roots were separated 12 logical units fore/aft.',
                 'Walking remained low with persistently bent knees; running had little trailing-thigh extension and a high recovery.'],
    'shape': {'thigh_width_scale': .76, 'moving_hip_x': [2, -2],
              'applies_to': ['near/far thigh', 'thigh-derived knee connector'],
              'preserved': ['source PNGs', 'bone lengths', 'other sprite dimensions', 'knee armor', 'boots'],
              'authorization': 'User explicitly requested a thinner thigh/leg silhouette; this is an intentional width edit rather than frame size normalization.'},
    'gait_parameters': numeric['parameters'],
    'motion': {'walk_body_offset': '-2 + bob*.30; lower additional landing load',
               'extra_swing_lift_at_100_percent': {'walk': 2, 'run': 6},
               'run_push_off': 'Support rise of 3 logical units, continuous position/velocity into flight and next landing.',
               'upper_body': 'Reduced stride waist and follow-through angles; no separate vertical chest bounce.',
               'reach_reserve': .5, 'contact_history': 'Existing fixed-step RunFootContacts; pose remains read-only.'},
    'controls': 'Existing per-action settings retained. Zero energy uses the new base gait with extra response disabled; button/note copy updated accordingly.',
    'retained': ['Skirt overlap', 'head/body synchronization', 'lowered non-firing run and relaxed idle', 'firing muzzle behavior',
                 'standing/relaxed/kneeling joint targets', 'Plan B/C work'],
    'runtime_sources': [artifact(path) for path in sources], 'previous_runtime': artifact(snapshot),
    'dependencies': [artifact(path) for path in ['game/animation/waist.js', 'game/animation/firing-form.js', 'game/animation/kneeling-pose.js',
                                              str(base / 'rig/parts.json'), 'art/characters/clone_01/motion/rig_004/source/limbs_atlas.png',
                                              'art/characters/clone_01/motion/rig_004/source/body_core.png']],
    'new_art_rasters': 0, 'external_model_calls': 0, 'gifs_generated': False,
    'recorded_at': datetime.now(ZoneInfo('Asia/Seoul')).isoformat(),
    'elapsed_since_snapshot_seconds': round(time.time() - json.loads(snapshot.read_text())['started_epoch'], 1),
    'time_scope': 'Wall time since source snapshot; earlier source reading not measured.', 'development_cost': None,
}
save(record / 'recipe.json', recipe)
handoff = {
    'iteration': 'leg_gait_001', 'status': 'scoped_checks_passed_awaiting_user_art_review', 'recipe': artifact(record / 'recipe.json'),
    'validation': {'changed_js_syntax': 'passed', 'short_gait_check': artifact(test), 'short_chrome_comparison': artifact(browser),
                   'strength_samples': [0, 100, 150], 'moving_states_sampled': len(numeric['current']),
                   'walk_run_stop': numeric['walkRunStop'], 'static_joint_target_difference': numeric['staticMaxDifference'],
                   'pelvis_velocity_join_differences': numeric['pelvisVelocityJoins'],
                   'full_test_suite': 'not_run', 'document_catalog_checks': 'not_run', 'historical_results': 'unchanged'},
    'form_metrics': {'previous_walk': numeric['previous']['walk'], 'current_walk': numeric['current']['walk:100'],
                     'previous_run': numeric['previous']['run'], 'current_run': numeric['current']['run:100']},
    'comparison_method': 'Separate saved/current module sets, naturally stepped to quarter-cycle phases. Cadence and elapsed time differ; no pose/part alignment or raster edits.',
    'review_harness': 'Initial archive-response fixture argument binding was corrected before captures; local application CSP remained intact.',
    'entry_points': {mode: 'http://127.0.0.1:4173/#/samples/characters/clone_01?motion=' + mode for mode in ['walk', 'run', 'walk_fire', 'run_fire']},
    'remaining': ['User review of slimmer thigh proportions and knee-armor transition silhouette.',
                  'Repeated gait rhythm, skirt overlap and depth ordering remain art review items.',
                  'Extreme manual controls, reload and stance transitions were not exhaustively visually reviewed.'],
}
save(record / 'handoff.json', handoff)

catalog_path = Path('game/public/assets/catalog/asset_index.json')
original = catalog_path.read_bytes()
catalog = json.loads(original)
entry = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
revision = next(r for r in entry['revisions'] if r['revision_id'] == 'rig_005')
iteration = {'iteration': 'leg_gait_001', 'verification': 'passed',
             'verification_scope': 'Five changed JS syntax checks, short gait reach/contact/transition/static-target checks, Chrome thigh-width/phase comparison and walk/run playback. No full QA or art acceptance.',
             'art_direction_status': 'awaiting_user_review', 'recipe_path': str(record / 'recipe.json'),
             'review_report': str(record / 'handoff.json'), 'previous_runtime': str(snapshot),
             'sample_url': '#/samples/characters/clone_01?motion=walk'}
revision['leg_gait'] = iteration
revision.setdefault('motion_iterations', {})['leg_gait_001'] = iteration.copy()
revision['display_name'] = '파츠 모션 · 허벅지/걷기·달리기 001'
revision['verification_scope'] = 'Latest leg_gait_001 has scoped gait constraints, static joint-target and Chrome shape/form checks. Proportions/naturalness and inherited combinations await user review; historical results unchanged.'
for mode in ['idle', 'relaxed', 'walk', 'fire', 'walk_fire', 'run', 'run_fire', 'kneel', 'kneel_fire']:
    revision.setdefault('motion_recipes', {})[mode] = str(record / 'recipe.json')
    revision.setdefault('motion_review_reports', {})[mode] = str(record / 'handoff.json')
revision['limitations'].extend(item for item in handoff['remaining'] if item not in revision['limitations'])
files = sources + ['README.md', 'AGENTS.md', 'docs/leg-gait-001.md', 'skills/dear-human-pipeline/SKILL.md', str(base / 'README.md'), str(snapshot)]
for folder in [record, base / 'tests/leg_gait_001', base / 'reviews/leg_gait_001']:
    files.extend(str(p) for p in folder.rglob('*') if p.is_file())
artifacts = {item['path']: item for item in revision['artifacts']}
artifacts.update({path: artifact(path) for path in files})
revision['artifacts'] = sorted(artifacts.values(), key=lambda a: a['path'])
assert catalog_path.read_bytes() == original, 'Concurrent catalog edit; rerun against latest bytes.'
save(catalog_path, catalog)
print(json.dumps({'iteration': 'leg_gait_001', 'scoped_checks': 'passed', 'art_review': 'pending', 'overall_verification': revision['verification'], 'artifacts_updated': len(files)}))
