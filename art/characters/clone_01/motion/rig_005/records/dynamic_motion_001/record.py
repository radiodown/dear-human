"""Author this iteration's recipe/handoff and update only its catalog metadata."""
import hashlib
import json
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

base = Path('art/characters/clone_01/motion/rig_005')
record = base / 'records/dynamic_motion_001'
snapshot = base / 'records/runtime_snapshot_before_dynamic_motion_001/index.json'
test = base / 'tests/dynamic_motion_001/motion-smoke.json'
browser = base / 'reviews/dynamic_motion_001/browser.json'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def artifact(path):
    return {'path': str(path), 'sha256': sha(path)}


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


numeric = json.loads(test.read_text())
visual = json.loads(browser.read_text())
assert numeric['status'] == visual['status'] == 'passed'
sources = ['game/animation/gait.js', 'game/animation/secondary-motion.js', 'game/animation/cape.js',
           'game/animation/rig-core.js', 'game/rig-lab.js', 'game/app.js', 'game/index.html']
recipe = {
    'schema_version': 1, 'iteration': 'dynamic_motion_001',
    'user_request': '파츠모션에서 더 역동적이었으면 함',
    'status': 'development_connected_with_scoped_checks', 'art_direction_status': 'awaiting_user_review',
    'scope': 'Additive parts-rig performance; original art, Plan B/C, kneeling targets, horizontal muzzle, stride and planted tracks retained.',
    'control': {'api': 'CharacterRig.setMotionEnergy(0..1.5)', 'ui_percent': [0, 150], 'default_percent': 100,
                'zero': 'Saved-source gait/body/weapon/feet/cloth/cape/hair coordinates reproduced exactly in the short baseline comparison.',
                'storage_key': 'dear-human:motion-energy:v1', 'url_parameter': 'energy', 'paused_comparison': 'No simulation or contact-history advancement'},
    'performance': {'extra_swing_clearance': {'walk': 4.5, 'run': 12},
                    'landing_compression': {'walk': 2.6, 'run': 3.5, 'peak_fraction': .26},
                    'flight_accent': 'Run-only; amplitude grows with the flight window. Walking overlapping support has no extra flight.',
                    'reach_limit': 'Raise pelvis no further than BOTH rigid legs can reach, before solving torso and weapon.',
                    'move_drive': {'hz': 2.6, 'damping': .78, 'limit_radians': .060, 'delta_speed_impulse': .008},
                    'chest': 'Phase-lagged waist, counter pitch and small vertical absorption; reduced while eye-aiming.',
                    'secondary': 'Pinned scalp/shoulder segments and length-preserving cape/hair remain; only local free-end angles and fabric response gain increase.',
                    'kneeling': 'Additional strength fades out at the completed 017 kneeling pose.'},
    'runtime_sources': [artifact(p) for p in sources],
    'dependencies': [artifact(p) for p in ['game/animation/firing-form.js', 'game/animation/kneeling-pose.js',
                                         'game/animation/proportions.js', 'game/animation/weapon-profiles.js',
                                         str(base / 'rig/parts.json')]],
    'previous_runtime': artifact(snapshot),
    'tools': {'implementation': 'Shared local JavaScript parts rig', 'browser': visual['browser'],
              'external_model_calls': 0, 'new_art_rasters': 0, 'gifs_generated': False},
    'recorded_at': datetime.now(ZoneInfo('Asia/Seoul')).isoformat(),
    'elapsed_since_snapshot_seconds': round(time.time() - json.loads(snapshot.read_text())['started_epoch'], 1),
    'time_scope': 'Elapsed wall time from source snapshot through implementation/review; earlier source reading not measured.',
    'development_cost': None,
}
save(record / 'recipe.json', recipe)
handoff = {
    'iteration': 'dynamic_motion_001', 'status': 'scoped_checks_passed_awaiting_user_art_review',
    'recipe': artifact(record / 'recipe.json'),
    'validation': {'changed_js_syntax': 'passed', 'motion_constraints': artifact(test), 'short_chrome_playback_ui': artifact(browser),
                   'baseline_max_coordinate_difference': numeric['baselineMaxDifference'],
                   'max_sampled_leg_error': max(m['maxLegError'] for m in numeric['modes'].values()),
                   'paused_pose_read_only': numeric['pausedPoseReadOnly'],
                   'browser_errors': visual['page_errors'], 'full_test_suite': 'not_run',
                   'document_catalog_checks': 'not_run', 'historical_untested_records': 'unchanged'},
    'development_findings': [
        'Initial stronger flight caused leg reach failures; preserve the first failed report and constrain pelvis ascent by both legs.',
        'Refined walking overlap to avoid a narrow artificial flight accent. Pre-refinement passing results are retained separately.',
        'First shared-port browser attempt failed loading an existing atlas; server PID changed during the session. Another shared-port attempt did not render metrics. Final scoped review passed on the identical source at isolated port 4174.'
    ],
    'entry_points': {'run': 'http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run&energy=100',
                     'run_fire': 'http://127.0.0.1:4173/#/samples/characters/clone_01?motion=run_fire&energy=100'},
    'remaining': ['User review of repeated walking/running rhythm and start/stop weight shift.',
                  'User review of high-strength knee/boot/skirt overlap, cape texture distortion and cloth boundaries.',
                  'Large combined manual bends, alternate weapon heights and reload/stance transitions were not exhaustively reviewed.',
                  'Existing temporary reload hands and lack of new oblique art/3D cloth collision remain.'],
    'scope_exclusions': ['Plan B/C', 'new raster artwork', 'GIF', 'full QA or art acceptance'],
}
save(record / 'handoff.json', handoff)

catalog_path = Path('game/public/assets/catalog/asset_index.json')
original = catalog_path.read_bytes()
catalog = json.loads(original)
character = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
revision = next(r for r in character['revisions'] if r['revision_id'] == 'rig_005')
iteration = {'iteration': 'dynamic_motion_001', 'verification': 'passed',
             'verification_scope': 'Changed-JS syntax, short motion constraints/zero baseline comparison and Chrome playback/strength UI only. No art acceptance or full QA.',
             'art_direction_status': 'awaiting_user_review', 'recipe_path': str(record / 'recipe.json'),
             'review_report': str(record / 'handoff.json'), 'previous_runtime': str(snapshot),
             'sample_url': '#/samples/characters/clone_01?motion=run&energy=100'}
revision['dynamic_motion'] = iteration
revision.setdefault('motion_iterations', {})['dynamic_motion_001'] = iteration.copy()
revision['display_name'] = '파츠 모션 · 활동감 001 / 앉아쏴 017'
# Keep overall rig verification conservative; only this named iteration has
# scoped passing evidence. Historical iteration statuses and files stay intact.
revision['verification_scope'] = 'Latest dynamic_motion_001 has scoped syntax, motion constraints and short Chrome UI/playback checks. Overall inherited rig art/combinations remain awaiting user review; prior untested iterations unchanged.'
for motion in ['idle', 'walk', 'run', 'fire', 'walk_fire', 'run_fire']:
    revision.setdefault('motion_recipes', {})[motion] = str(record / 'recipe.json')
    revision.setdefault('motion_review_reports', {})[motion] = str(record / 'handoff.json')
revision['limitations'] = [('Historical iterations before dynamic_motion_001: ' + item) if item.startswith('No ') else item for item in revision['limitations']]
revision['limitations'].extend(item for item in handoff['remaining'] if item not in revision['limitations'])
files = sources + ['README.md', 'AGENTS.md', 'docs/dynamic-parts-motion-001.md',
                   'skills/dear-human-pipeline/SKILL.md', str(base / 'README.md'), str(snapshot)]
files += [str(p) for p in record.iterdir() if p.is_file()]
files += [str(p) for p in (base / 'tests/dynamic_motion_001').rglob('*') if p.is_file()]
files += [str(p) for p in (base / 'reviews/dynamic_motion_001').rglob('*') if p.is_file()]
artifacts = {item['path']: item for item in revision['artifacts']}
artifacts.update({p: artifact(p) for p in files})
revision['artifacts'] = sorted(artifacts.values(), key=lambda a: a['path'])
assert catalog_path.read_bytes() == original, 'Concurrent catalog edit; rerun against latest bytes.'
save(catalog_path, catalog)
print(json.dumps({'iteration': 'dynamic_motion_001', 'scoped_checks': 'passed', 'art_review': 'pending',
                  'catalog_overall_verification': revision['verification'], 'artifacts_updated': len(files)}))
