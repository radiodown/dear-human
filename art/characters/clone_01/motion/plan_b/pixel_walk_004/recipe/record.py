"""Register this generated animation draft, keeping existing selections and history."""
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
    if browser['status'] != 'passed' or structure['png_contract_errors']:
        raise ValueError('Record a working browser preview and valid PNG contracts first.')
    catalog_path = PROJECT / 'game/public/assets/catalog/asset_index.json'
    catalog = json.loads(catalog_path.read_text())
    character = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
    if any(r['revision_id'] == 'plan_b_pixel_walk_004' for r in character['revisions']):
        raise ValueError('Already registered; preserve the existing version record.')
    for name in ['game/app.js', 'game/index.html', 'game/styles.css', 'game/plan-b-lab.js', 'game/animation/frame-sequence.js']:
        target = BASE / 'records/runtime_snapshot_pixel_walk_004' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PROJECT / name, target)
    files = {BASE / 'README.md'}
    for directory in ['source', 'output', 'reviews', 'recipe']:
        files.update(p for p in (BASE / directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    files.update(p for p in (BASE / 'records').iterdir() if p.is_file())
    files.update(p for p in (BASE / 'records/runtime_snapshot_pixel_walk_004').rglob('*') if p.is_file())
    root = BASE.relative_to(PROJECT).as_posix()
    revision = {
        'revision_id': 'plan_b_pixel_walk_004', 'display_name': '플랜 B 도트 004 · 걷기 14프레임',
        'status': 'draft', 'verification': 'passed',
        'verification_scope': 'PNG count/canvas/RGBA/corners/endpoint and keyframe identity plus short macOS Chrome playback/source switching. Strict upstream foot-line equality and GIF delivery are NOT passed; visual polish awaits review.',
        'art_direction_status': 'awaiting_user_review',
        'recipe_key': digest(BASE / 'records/keyposes_prompt.json'),
        'artifacts': [{'path': p.relative_to(PROJECT).as_posix(), 'sha256': digest(p)} for p in sorted(files)],
        'dependencies': [{'kind': 'character', 'entity_id': 'clone_01', 'revision_id': 'plan_b_pixel_003'}],
        'preview': {'type': 'frame_sequence', 'image_path': root + '/output/fullframe/clone_01-pixel-walk_02.png', 'width': 512, 'height': 512,
                    'manifest_path': root + '/output/manifest.json', 'sample_url': '#/samples/characters/clone_01?plan=b&study=pixel_004&motion=walk'},
        'motions': ['walk'], 'capabilities': ['png_sequence', 'spritesheet', 'browser_playback'],
        'description': '도트003 캐릭터의 14프레임 제자리 걷기 초안. 모델 키포즈·중간 프레임을 같은 페이지에 연결했으며 크기 확대를 줄였습니다. 약3px 발 높이 변화·망토/다리 세부·루프 연결은 검토 대기입니다.',
        'review_notes': ['자동 걷기·정지·한 프레임·속도·이전/새 atlas 전환 확인', '머리·흉갑·어깨~벨트·M16을 기준과 비교한 후 중간 프레임 생성', '개별 크기/중심/발 기준선 정렬과 포즈 보간 없음', '공식 발 기준선 완전 일치·GIF 납품 통과가 아님 · 최종 모션 채택 대기'],
        'prompt_path': root + '/records/keyposes_prompt.json', 'prompt_document': root + '/records/keyposes_prompt.md',
    }
    character['revisions'].append(revision)
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print('Registered plan_b_pixel_walk_004; original selected/review revisions and historical records retained.')


if __name__ == '__main__':
    main()
