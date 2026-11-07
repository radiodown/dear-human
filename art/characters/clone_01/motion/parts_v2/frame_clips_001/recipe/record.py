"""Record the discrete-pose V2 revision without changing LIVE adoption."""
import hashlib
import json
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

base = Path('art/characters/clone_01/motion/parts_v2/frame_clips_001')
snapshot = base / 'records/before/index.json'
test_path, browser_path = base / 'tests/discrete-frames.json', base / 'reviews/browser.json'
sources = ['game/app.js', 'game/index.html', 'game/styles.css', 'game/parts-v2-lab.js', 'game/animation/parts-frame-player.js']


def artifact(path):
    return {'path': str(path), 'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


numeric, chrome = json.loads(test_path.read_text()), json.loads(browser_path.read_text())
manifest = json.loads((base / 'clips/manifest.json').read_text())
assert numeric['status'] == chrome['status'] == 'passed'
assert chrome['runtime_sources'] == [artifact(path) for path in sources]
assert manifest['sources'] == [artifact(item['path']) for item in manifest['sources']]
recipe = {
    'schema_version': 1, 'iteration': 'parts_v2_frame_001',
    'user_request': '파츠모션v2탭을 따로만들고 동작을 연결하려하지말고 뭐랄까 애니메이션 움직이듯 프레임동작으로 보여주면 어떨까ㅣ',
    'status': 'development_connected_with_scoped_checks', 'art_direction_status': 'awaiting_user_review',
    'method': 'Offline saved poses from independent, settled instances of the current shared parts rig. Runtime changes only the held frame index; no live simulation or interpolation.',
    'clip_manifest': artifact(base / 'clips/manifest.json'), 'clips': numeric['clips'], 'total_frames': numeric['frames'],
    'controls': ['separate V2 tab', 'nine hard-cut action clips', 'frame buttons/slider/back/forward', 'pause/play',
                 'native/6/12/18/24fps', 'loop/one-shot-last-frame hold', 'frame URL restore', 'mirror', '0/12/20-degree camera', 'cape toggle'],
    'runtime_sources': [artifact(path) for path in sources + ['game/package.json']],
    'previous_app': artifact(snapshot), 'pose_authoring_sources': manifest['sources'],
    'dependencies': [artifact(path) for path in ['game/animation/webgl-character.js', 'game/animation/side-camera.js',
                                              'game/animation/muzzle-light.js', str(base / 'clips/parts.json')]],
    'source_art': [artifact(atlas['path']) for atlas in json.loads((base / 'clips/parts.json').read_text())['atlases'].values()],
    'runtime_loading': 'Only the selected saved clip is fetched; loaded clips are cached. No automatic bake or full clip render on page visits.',
    'retained': ['LIVE rig and action controls', 'current adopted appearance', 'Plan B/C', 'original PNGs', 'historical tests/records'],
    'new_art_rasters': 0, 'external_model_calls': 0, 'gifs_generated': False,
    'recorded_at': datetime.now(ZoneInfo('Asia/Seoul')).isoformat(),
    'elapsed_since_snapshot_seconds': round(time.time() - json.loads(snapshot.read_text())['started_epoch'], 1),
    'time_scope': 'Wall time since source snapshot; initial reading not measured.', 'development_cost': None,
}
save(base / 'recipe/recipe.json', recipe)
handoff = {
    'iteration': 'parts_v2_frame_001', 'status': 'scoped_checks_passed_awaiting_user_art_review',
    'recipe': artifact(base / 'recipe/recipe.json'),
    'validation': {'changed_js_syntax': 'passed', 'new_check_command': 'npm --prefix game run check:parts-v2',
                   'short_discrete_clip_check': artifact(test_path), 'short_chrome_ui': artifact(browser_path),
                   'clip_count': 9, 'frame_count': 136, 'live_simulation_steps_while_testing_v2': 0,
                   'full_test_suite': 'not_run', 'document_catalog_checks': 'not_run', 'historical_results': 'unchanged'},
    'entry_point': 'http://127.0.0.1:4173/#/samples/characters/clone_01?plan=parts-v2&motion=walk',
    'remaining': ['User review of frame count, held-pose rhythm, loop seams and individual silhouettes.',
                  'First clips reuse sampled LIVE poses; newly authored V2 key poses have not been made.',
                  'V2 is a frame preview. Original action controls, live fire/reload/hit inputs and gameplay state are not applied to saved clips.'],
}
save(base / 'records/handoff.json', handoff)

catalog_path = Path('game/public/assets/catalog/asset_index.json')
original = catalog_path.read_bytes()
catalog = json.loads(original)
entry = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
files = sources + ['game/package.json', 'README.md', 'AGENTS.md', 'art/README.md', 'skills/dear-human-pipeline/SKILL.md',
                   'docs/parts-motion-v2-001.md', str(base.parent / 'README.md')]
files.extend(str(path) for path in base.rglob('*') if path.is_file())
revision = {
    'revision_id': 'parts_v2_frame_001', 'display_name': '파츠 모션 V2 · 프레임 클립 001', 'status': 'draft',
    'verification': 'passed', 'verification_scope': 'Scoped discrete frame player, clip constraints and short Chrome UI/hold/cut/URL/500px checks only. No naturalness/loop acceptance or full gameplay QA.',
    'art_direction_status': 'awaiting_user_review', 'recipe_path': str(base / 'recipe/recipe.json'),
    'recipe_key': artifact(base / 'recipe/recipe.json')['sha256'], 'review_report': str(base / 'records/handoff.json'),
    'dependencies': [{'kind': 'character', 'entity_id': 'clone_01', 'revision_id': 'rig_005'}],
    'dependency_usage': 'Reuse current raw part art and the shared renderer. Poses and part definition copied into this independent version; LIVE is not stepped during playback.',
    'preview': {'type': 'parts_frame_clips', 'sample_url': '#/samples/characters/clone_01?plan=parts-v2&motion=walk'},
    'motions': list(numeric['clips']), 'frame_manifest': str(base / 'clips/manifest.json'),
    'limitations': handoff['remaining'], 'artifacts': [artifact(path) for path in sorted(set(files))],
}
existing = next((r for r in entry['revisions'] if r['revision_id'] == revision['revision_id']), None)
if existing is None:
    entry['revisions'].append(revision)
else:
    existing.update(revision)
assert catalog_path.read_bytes() == original, 'Concurrent catalog edit; rerun against latest bytes.'
save(catalog_path, catalog)
print(json.dumps({'revision': revision['revision_id'], 'scoped_checks': 'passed', 'art_review': 'pending', 'artifacts': len(revision['artifacts'])}))
