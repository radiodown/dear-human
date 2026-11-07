"""Author head/body coherence records and merge current catalog metadata."""
import hashlib
import json
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

base = Path('art/characters/clone_01/motion/rig_005')
record = base / 'records/head_body_sync_001'
snapshot = base / 'records/runtime_snapshot_before_head_body_sync_001/index.json'
test = base / 'tests/head_body_sync_001/sync-smoke.json'
browser = base / 'reviews/head_body_sync_001/browser.json'


def artifact(path):
    return {'path': str(path), 'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


numeric, chrome = json.loads(test.read_text()), json.loads(browser.read_text())
assert numeric['status'] == chrome['status'] == 'passed'
sources = ['game/animation/' + name for name in ['gait.js', 'secondary-motion.js', 'rig-core.js', 'webgl-character.js', 'side-camera.js']]
recipe = {
    'schema_version': 1, 'iteration': 'head_body_sync_001',
    'user_request': '머리하고 몸하고 뭔가 동작이 같이 일어나지 않고 바운스가 있으면 어색해',
    'status': 'development_connected_with_scoped_checks', 'art_direction_status': 'awaiting_user_review',
    'scope': 'Couple transient head/body motion and remove separate step chest bounce.',
    'findings': ['Head position followed the neck, but body rotation mixed at .28 and running countered the entire current torso pitch.',
                 'The dynamic layer added an out-of-phase chest-only vertical stride offset.'],
    'changes': ['Separate gait transient angular motion from sustained lean.',
                'Counter sustained running/manual lean only; deliver current body pitch to the head without a follow delay.',
                'Remove extra chest-only stride rise; retain slow breathing and grounded pelvis motion.',
                'Use one solved headFrame for eye calculations, head rendering, scalp attachment and camera depth.'],
    'retained': ['Small event-driven head reactions', 'Kneeling 017 bounded sight fit', 'Carry/idle 001 and both idles',
                 'Nine-action controls/storage', 'Bone lengths, foot contacts and existing source proportions'],
    'runtime_sources': [artifact(p) for p in sources], 'previous_runtime': artifact(snapshot),
    'dependencies': [artifact(p) for p in ['game/animation/proportions.js', 'game/animation/firing-form.js', 'game/animation/kneeling-pose.js', str(base / 'rig/parts.json')]],
    'new_art_rasters': 0, 'external_model_calls': 0, 'gifs_generated': False,
    'recorded_at': datetime.now(ZoneInfo('Asia/Seoul')).isoformat(),
    'elapsed_since_snapshot_seconds': round(time.time() - json.loads(snapshot.read_text())['started_epoch'], 1),
    'time_scope': 'Wall time since source snapshot; earlier source reading not measured.', 'development_cost': None,
}
save(record / 'recipe.json', recipe)
handoff = {
    'iteration': 'head_body_sync_001', 'status': 'scoped_checks_passed_awaiting_user_art_review', 'recipe': artifact(record / 'recipe.json'),
    'validation': {'changed_js_syntax': 'passed', 'short_numeric_check': artifact(test), 'short_chrome_check': artifact(browser),
                   'head_body_metrics': numeric['modes'], 'mean_bent_run_head_degrees': numeric['meanBentRunHeadDegrees'],
                   'rendered_head_matches_solved_frame': 'passed', 'paused_pose_and_display': 'passed',
                   'full_test_suite': 'not_run', 'document_catalog_checks': 'not_run', 'historical_results': 'unchanged'},
    'preliminary_reload_sample': artifact(base / 'tests/head_body_sync_001/preliminary-reload-sample.json'),
    'preliminary_scope': 'An initial long firing sample included automatic reload. Existing temporary-reload hand error was equal before/after; final firing coherence samples end before ammo depletion.',
    'entry_points': {mode: 'http://127.0.0.1:4173/#/samples/characters/clone_01?motion=' + mode for mode in ['walk', 'run', 'run_fire', 'kneel_fire']},
    'remaining': ['User visual review of coherent head/neck silhouette and naturalness during repeated body load cycles.',
                  'Extreme combined manual settings and occlusion were not exhaustively reviewed.',
                  'Existing temporary reload hand reach/occlusion remains outside this correction.',
                  'No new art, Plan B/C work, GIF or 3D collision was created.'],
}
save(record / 'handoff.json', handoff)

catalog_path = Path('game/public/assets/catalog/asset_index.json')
original = catalog_path.read_bytes()
catalog = json.loads(original)
entry = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
revision = next(r for r in entry['revisions'] if r['revision_id'] == 'rig_005')
iteration = {'iteration': 'head_body_sync_001', 'verification': 'passed',
             'verification_scope': 'Changed JS syntax, short relative-pitch/neck/contacts/pose-purity comparison and Chrome common-head-frame/playback checks. No full QA or art acceptance.',
             'art_direction_status': 'awaiting_user_review', 'recipe_path': str(record / 'recipe.json'),
             'review_report': str(record / 'handoff.json'), 'previous_runtime': str(snapshot),
             'sample_url': '#/samples/characters/clone_01?motion=run'}
revision['head_body_sync'] = iteration
revision.setdefault('motion_iterations', {})['head_body_sync_001'] = iteration.copy()
revision['display_name'] = '파츠 모션 · 머리/몸통 연결 001'
revision['verification_scope'] = 'Latest head_body_sync_001 has scoped syntax, motion coherence/contacts and Chrome common-head-frame checks. Overall inherited art/combinations await user review; historical results unchanged.'
for mode in ['idle', 'relaxed', 'walk', 'fire', 'walk_fire', 'run', 'run_fire', 'kneel', 'kneel_fire']:
    revision.setdefault('motion_recipes', {})[mode] = str(record / 'recipe.json')
    revision.setdefault('motion_review_reports', {})[mode] = str(record / 'handoff.json')
revision['limitations'].extend(item for item in handoff['remaining'] if item not in revision['limitations'])
files = sources + ['README.md', 'AGENTS.md', 'docs/head-body-sync-001.md', 'skills/dear-human-pipeline/SKILL.md', str(base / 'README.md'), str(snapshot)]
for folder in [record, base / 'tests/head_body_sync_001', base / 'reviews/head_body_sync_001']:
    files.extend(str(p) for p in folder.rglob('*') if p.is_file())
artifacts = {item['path']: item for item in revision['artifacts']}
artifacts.update({p: artifact(p) for p in files})
revision['artifacts'] = sorted(artifacts.values(), key=lambda a: a['path'])
assert catalog_path.read_bytes() == original, 'Concurrent catalog edit; rerun against latest bytes.'
save(catalog_path, catalog)
print(json.dumps({'iteration': 'head_body_sync_001', 'scoped_checks': 'passed', 'art_review': 'pending', 'overall_verification': revision['verification'], 'artifacts_updated': len(files)}))
