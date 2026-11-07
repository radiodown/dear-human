"""Register005 and record the user's004 rejection without changing historical PNGs/reports."""
from pathlib import Path
import hashlib
import json
import shutil

BASE = Path(__file__).resolve().parents[1]
PROJECT = BASE.parents[5]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    browser = json.loads((BASE / 'reviews/browser.json').read_text())
    structure = json.loads((BASE / 'reviews/structure.json').read_text())
    gate = json.loads((BASE / 'reviews/key-gate.json').read_text())
    if browser['status'] != 'passed' or structure['png_contract_errors'] or gate['status'] != 'passed':
        raise ValueError('Record successful PNG, crossing and browser checks before registration.')
    catalog_path = PROJECT / 'game/public/assets/catalog/asset_index.json'
    catalog = json.loads(catalog_path.read_text())
    character = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
    if any(r['revision_id'] == 'plan_b_pixel_walk_005' for r in character['revisions']):
        raise ValueError('Already registered; preserve the version record.')
    previous = next(r for r in character['revisions'] if r['revision_id'] == 'plan_b_pixel_walk_004')
    (BASE / 'records/revision004-before-rejection.json').write_text(json.dumps(previous, ensure_ascii=False, indent=2) + '\n')
    previous.update({
        'status': 'failed', 'verification': 'failed', 'art_direction_status': 'rejected',
        'verification_scope': 'User rejected leg alternation/crossing:02/08 and05/11 repeat nearly identical leg roles. Historical PNG/browser checks remain preserved and do not establish motion quality.',
    })
    previous['review_notes'].append('사용자 반려: 다리가 교차하지 않아 어색함. 새005에서 다리 명암·반대 지지·교차를 다시 생성함.')
    rejection = BASE / 'reviews/rejection-of-004.json'
    previous['artifacts'].append({'path': rejection.relative_to(PROJECT).as_posix(), 'sha256': digest(rejection)})
    for name in ['game/index.html', 'game/plan-b-lab.js', 'game/animation/frame-sequence.js']:
        target = BASE / 'records/runtime_snapshot_pixel_walk_005' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PROJECT / name, target)
    files = {BASE / 'README.md'}
    for directory in ['source', 'output', 'reviews', 'recipe']:
        files.update(p for p in (BASE / directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    files.update(p for p in (BASE / 'records').iterdir() if p.is_file())
    files.update(p for p in (BASE / 'records/runtime_snapshot_pixel_walk_005').rglob('*') if p.is_file())
    root = BASE.relative_to(PROJECT).as_posix()
    revision = {
        'revision_id': 'plan_b_pixel_walk_005', 'display_name': '플랜 B 도트005 · 양발 교차/역할 교대',
        'status': 'draft', 'verification': 'passed',
        'verification_scope': 'Visual near/far identity, reversed contacts and opposite support/crossing at05/11; PNG identity contracts; short macOS Chrome01..12 playback and comparison buttons. About3px foot jitter remains; full upstream foot-line/GIF delivery not passed. Final naturalness/art acceptance pending.',
        'art_direction_status': 'awaiting_user_review', 'recipe_key': digest(BASE / 'records/keyposes_prompt.json'),
        'artifacts': [{'path': p.relative_to(PROJECT).as_posix(), 'sha256': digest(p)} for p in sorted(files)],
        'dependencies': [{'kind': 'character', 'entity_id': 'clone_01', 'revision_id': 'plan_b_pixel_003'}],
        'preview': {'type': 'frame_sequence', 'image_path': root + '/output/fullframe/clone_01-pixel-walk_11.png', 'width': 512, 'height': 512,
                    'manifest_path': root + '/output/manifest.json', 'sample_url': '#/samples/characters/clone_01?plan=b&study=pixel_005&motion=walk'},
        'motions': ['walk'], 'capabilities': ['png_sequence', 'spritesheet', 'browser_playback'],
        'description': '밝은 전경 다리와 어두운 후경 다리의 명암을 유지하며 발 앞뒤 순서·지지·회수·교차를 반전하는 보행. 14장 PNG 중 정지 기준00/13을 제외한12개 움직이는 포즈를 반복합니다.',
        'review_notes': ['004 사용자 반려 기록 보존 · 같은 다리 반복을 새로 생성', '02/08의 밝은 다리 전후 순서 반전 ·05/11 반대 지지와 교차 확인', '움직이는01..12만 반복 · 교차 비교 버튼 제공', '발 높이 약3px·망토/윤곽 세부는 검수 대기'],
        'prompt_path': root + '/records/keyposes_prompt.json', 'prompt_document': root + '/records/keyposes_prompt.md',
    }
    character['revisions'].append(revision)
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print('Registered005, marked004 user-rejected; old PNGs/reports and selected appearance retained.')


if __name__ == '__main__':
    main()
