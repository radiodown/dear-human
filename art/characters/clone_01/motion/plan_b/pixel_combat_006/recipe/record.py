"""Register the two generated combat animation drafts without changing selected art."""
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
    if browser['status'] != 'passed':
        raise ValueError('Review both actual combat animations in the existing page first.')
    catalog_path = PROJECT / 'game/public/assets/catalog/asset_index.json'
    catalog = json.loads(catalog_path.read_text())
    character = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
    ids = {f'plan_b_combat_006_{action}' for action in ['walk_fire', 'kneel_fire']}
    if any(r['revision_id'] in ids for r in character['revisions']):
        raise ValueError('Already registered; keep immutable version history.')
    for name in ['game/index.html', 'game/plan-b-lab.js', 'game/animation/frame-sequence.js']:
        target = BASE / 'records/runtime_snapshot_combat_006' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PROJECT / name, target)
    shared = {BASE / 'README.md'}
    for directory in ['source', 'recipe', 'reviews']:
        shared.update(p for p in (BASE / directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    shared.update(p for p in (BASE / 'records').iterdir() if p.is_file())
    shared.update(p for p in (BASE / 'records/runtime_snapshot_combat_006').rglob('*') if p.is_file())
    for action in ['walk_fire', 'kneel_fire']:
        folder = BASE / action
        structure = json.loads((folder / 'reviews/structure.json').read_text())
        visual = json.loads((folder / 'reviews/visual.json').read_text())
        gate = json.loads((folder / 'reviews/key-gate.json').read_text())
        if structure['png_contract_errors'] or visual['status'] != 'draft_playable' or gate['status'] != 'passed':
            raise ValueError(f'Finish the actual scoped review: {action}')
        files = shared | {p for p in folder.rglob('*') if p.is_file()}
        prefix = 'clone_01-' + action.replace('_', '-')
        shot = 2 if action == 'walk_fire' else 5
        root = folder.relative_to(PROJECT).as_posix()
        label = '이동 사격' if action == 'walk_fire' else '앉아쏴'
        prompt = gate.get('prompt', 'records/keyposes_prompt.json')
        revision = {
            'revision_id': f'plan_b_combat_006_{action}', 'display_name': f'플랜 B 도트006 · {label}',
            'status': 'draft', 'verification': 'passed',
            'verification_scope': 'PNG count/canvas/RGBA/corners/endpoint/key identity; scoped key-pose visual gate and short macOS Chrome playback/action switches. Ground/cloth/shape drift remains; full upstream ground equality and GIF delivery NOT passed; final art acceptance pending.',
            'art_direction_status': 'awaiting_user_review', 'recipe_key': digest(folder / prompt),
            'artifacts': [{'path': p.relative_to(PROJECT).as_posix(), 'sha256': digest(p)} for p in sorted(files)],
            'dependencies': [{'kind': 'character', 'entity_id': 'clone_01', 'revision_id': 'plan_b_pixel_walk_005'}],
            'preview': {'type': 'frame_sequence', 'image_path': root + f'/output/fullframe/{prefix}_{shot:02}.png', 'width': 512, 'height': 512,
                        'manifest_path': root + '/output/manifest.json', 'sample_url': f'#/samples/characters/clone_01?plan=b&study=combat_006&motion={action}'},
            'motions': [action], 'capabilities': ['png_sequence', 'spritesheet', 'browser_playback'],
            'description': f'도트 캐릭터의 {label} 루프. 어깨/흉곽 반동·견착 복귀·머리/망토 반응과 발사광을 모델로 새로 생성했다.14장 중01~12의 움직이는 포즈를 반복하며 최종 아트 검수 대기다.',
            'review_notes': ['첫 시도의 크기/비례 실패를 보존하고 재생성', '발사45ms와 반동/복귀 시간차 · 공통 PNG 재생기', '개별 프레임/다리 변형·크기/중심/발 정렬 없음', '실제 전투 판정/탄약 로직은 연결하지 않은 모션 검토본'],
            'prompt_path': root + '/' + prompt, 'prompt_document': root + '/' + str(Path(prompt).with_suffix('.md')),
        }
        character['revisions'].append(revision)
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print('Registered walk_fire and kneel_fire006; selected artwork and existing versions retained.')


if __name__ == '__main__':
    main()
