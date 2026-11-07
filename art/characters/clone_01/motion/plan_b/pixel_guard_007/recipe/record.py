"""Register the two forward-leaning guarded animation drafts without changing selected art."""
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
        raise ValueError('Review both guarded animations in the existing page first.')
    catalog_path = PROJECT / 'game/public/assets/catalog/asset_index.json'
    catalog = json.loads(catalog_path.read_text())
    character = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
    ids = {f'plan_b_guard_007_{action}' for action in ['walk', 'walk_fire']}
    if any(r['revision_id'] in ids for r in character['revisions']):
        raise ValueError('Already registered; keep immutable version history.')
    for name in ['game/index.html', 'game/plan-b-lab.js', 'game/animation/frame-sequence.js']:
        target = BASE / 'records/runtime_snapshot_guard_007' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PROJECT / name, target)
    shared = {BASE / 'README.md'}
    for directory in ['source', 'recipe', 'reviews']:
        shared.update(p for p in (BASE / directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    shared.update(p for p in (BASE / 'records').iterdir() if p.is_file())
    shared.update(p for p in (BASE / 'records/runtime_snapshot_guard_007').rglob('*') if p.is_file())
    for action in ['walk', 'walk_fire']:
        folder = BASE / action
        structure = json.loads((folder / 'reviews/structure.json').read_text())
        visual = json.loads((folder / 'reviews/visual.json').read_text())
        gate = json.loads((folder / 'reviews/key-gate.json').read_text())
        if structure['png_contract_errors'] or visual['status'] != 'draft_playable' or gate['status'] != 'passed':
            raise ValueError(f'Finish the actual scoped review: {action}')
        files = shared | {p for p in folder.rglob('*') if p.is_file()}
        prefix = 'clone_01-' + action.replace('_', '-')
        shot = 2
        root = folder.relative_to(PROJECT).as_posix()
        label = '경계 이동 사격' if action == 'walk_fire' else '경계 걷기'
        prompt = gate.get('prompt', 'records/keyposes_prompt.json')
        revision = {
            'revision_id': f'plan_b_guard_007_{action}', 'display_name': f'플랜 B 도트007 · {label}',
            'status': 'draft', 'verification': 'passed',
            'verification_scope': 'PNG count/canvas/RGBA/corners/endpoint/key identity; scoped key-pose visual gate and short macOS Chrome playback/action switches. Ground/cloth/shape drift remains; full upstream ground equality and GIF delivery NOT passed; final art acceptance pending.',
            'art_direction_status': 'awaiting_user_review', 'recipe_key': digest(folder / prompt),
            'artifacts': [{'path': p.relative_to(PROJECT).as_posix(), 'sha256': digest(p)} for p in sorted(files)],
            'dependencies': [{'kind': 'character', 'entity_id': 'clone_01', 'revision_id': 'plan_b_pixel_walk_005'}],
            'preview': {'type': 'frame_sequence', 'image_path': root + f'/output/fullframe/{prefix}_{shot:02}.png', 'width': 512, 'height': 512,
                        'manifest_path': root + '/output/manifest.json', 'sample_url': f'#/samples/characters/clone_01?plan=b&study=guard_007&motion={action}'},
            'motions': [action], 'capabilities': ['png_sequence', 'spritesheet', 'browser_playback'],
            'description': f'도트 캐릭터의 {label}. 골반에서 상체를 앞으로 기울이고 무릎을 낮춘 채 양발 교차와 전방 시선/수평 총신을 유지하는 12포즈 반복이다. 최종 아트 검수 대기다.',
            'review_notes': ['허리/흉곽부터 앞을 숙이는 낮은 경계 자세 · 목만 숙이지 않음', '접촉/교차 양쪽 반주기에서도 전경과 양발 지지 교대 유지', '정확한 관절 각도/물리 접촉이나 최종 아트 채택은 아님', '개별 포즈 변형·크기/중심/발 정렬 없음'],
            'prompt_path': root + '/' + prompt, 'prompt_document': root + '/' + str(Path(prompt).with_suffix('.md')),
        }
        character['revisions'].append(revision)
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print('Registered guarded walk and walk_fire007; selected artwork and existing versions retained.')


if __name__ == '__main__':
    main()
