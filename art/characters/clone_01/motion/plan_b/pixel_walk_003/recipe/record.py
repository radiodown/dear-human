"""Register this static style study and rejected key sheet without selecting either."""
from pathlib import Path
import hashlib
import json
import shutil

BASE = Path(__file__).resolve().parents[1]
PROJECT = BASE.parents[5]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    catalog_path = PROJECT / 'game/public/assets/catalog/asset_index.json'
    catalog = json.loads(catalog_path.read_text())
    character = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
    browser = json.loads((BASE / 'reviews/browser.json').read_text())
    if browser['status'] != 'passed':
        raise ValueError('Record the actual focused browser review before registration.')
    # Freeze the exact consuming source for this version. Earlier snapshots stay intact.
    for name in ['game/app.js', 'game/index.html', 'game/styles.css', 'game/plan-b-lab.js']:
        target = BASE / 'records/runtime_snapshot_pixel_003' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PROJECT / name, target)

    def artifact(name):
        path = BASE / name
        return {'path': path.relative_to(PROJECT).as_posix(), 'sha256': digest(path)}

    def dependency(revision):
        return {'kind': 'character', 'entity_id': 'clone_01', 'revision_id': revision}

    common = ['README.md', 'records/generation.json', 'reviews/visual.json', 'reviews/browser.json', 'recipe/prepare.py', 'recipe/record.py']
    common += [p.relative_to(BASE).as_posix() for p in sorted((BASE / 'records/runtime_snapshot_pixel_003').rglob('*')) if p.is_file()]
    root = BASE.relative_to(PROJECT).as_posix()
    baseline = {
        'revision_id': 'plan_b_pixel_003',
        'display_name': '플랜 B 도트 003 · 단순화 기준 외형',
        'status': 'draft', 'verification': 'passed',
        'verification_scope': 'PNG decode, sampled transparency and short local Chrome display only. Style acceptance pending; no enforced palette/grid or completed animation.',
        'art_direction_status': 'awaiting_user_review',
        'recipe_key': digest(BASE / 'records/baseline_prompt.json'),
        'artifacts': [artifact(p) for p in common + ['source/baseline_generated.png', 'output/baseline.png', 'output/manifest.json', 'records/baseline_prompt.json', 'records/baseline_prompt.md', 'records/normalization.json', 'reviews/browser-baseline.png', 'reviews/browser-narrow.png']],
        'dependencies': [dependency('reference_003_3d'), dependency('side_master_004')],
        'preview': {'type': 'concept_image', 'image_path': root + '/output/baseline.png', 'width': 512, 'height': 512, 'views': ['right_profile'], 'sample_url': '#/samples/characters/clone_01?plan=b&study=pixel_003'},
        'motions': [], 'capabilities': ['concept_image'],
        'description': '긴 머리·검은 갑옷·망토·M16을 유지하며 장식·문양·재질 묘사를 줄인 도트풍 기준 외형. 스타일 채택 대기이며 고정 팔레트 최종 스프라이트나 완성 모션은 아닙니다.',
        'review_notes': ['도트풍 기준 외형 1장 · 같은 페이지에서 표시 확인', '후속 키포즈는 크기 일관성 실패 · 완성 보행 미제작', '기존 외형·파츠 리그·플랜 C/D 유지'],
        'prompt_path': root + '/records/baseline_prompt.json',
        'prompt_document': root + '/records/baseline_prompt.md',
    }
    keys = {
        'revision_id': 'plan_b_pixel_walk_003_keys',
        'display_name': '플랜 B 도트 003 · 키포즈 크기 검수 실패',
        'status': 'failed', 'verification': 'failed',
        'verification_scope': 'Visual baseline comparison failed: enlarged head/torso/rifle and ambiguous opposite support-leg phase. Browser display passed separately.',
        'art_direction_status': 'rejected',
        'recipe_key': digest(BASE / 'records/keyposes_prompt.json'),
        'artifacts': [artifact(p) for p in common + ['source/keyposes.png', 'records/keyposes_prompt.json', 'records/keyposes_prompt.md', 'reviews/baseline-key-comparison.png', 'reviews/browser-keyposes.png']],
        'dependencies': [dependency('plan_b_pixel_003')],
        'preview': {'type': 'key_pose_sheet', 'image_path': root + '/source/keyposes.png', 'width': 1254, 'height': 1254, 'sample_url': '#/samples/characters/clone_01?plan=b&study=pixel_003&pixelView=keys'},
        'motions': [], 'capabilities': ['concept_image'],
        'description': '도트 기준으로 한 번에 생성한 02/05/08/11 걷기 키포즈. 기준보다 머리·상체·총이 커져 반려했으며 중간 프레임·14프레임 애니메이션은 생성하지 않았습니다.',
        'review_notes': ['기준 대비 크기 실패 · 개별 프레임 확대/축소/중심 맞춤 없음', '05/11 지지 다리 교대 불명확', '새 스타일의 외형 채택과 키포즈 실패를 구분'],
    }
    new_ids = {baseline['revision_id'], keys['revision_id']}
    if any(r['revision_id'] in new_ids for r in character['revisions']):
        raise ValueError('Already registered; do not overwrite a version record.')
    character['revisions'].extend([baseline, keys])
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print('Registered new baseline and rejected keys; existing selection and all previous revisions retained.')


if __name__ == '__main__':
    main()
