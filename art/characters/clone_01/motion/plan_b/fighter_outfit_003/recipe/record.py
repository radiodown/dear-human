"""Preserve provenance and register the costume-corrected fighting-game-view still after its focused review."""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image

BASE = Path(__file__).resolve().parents[1]
PROJECT = BASE.parents[5]
REVISION = 'plan_b_fighter_outfit_003'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(name, data):
    path = BASE / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes((json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))


def main():
    catalog_path = PROJECT / 'game/public/assets/catalog/asset_index.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    entry = next(e for e in catalog['entries'] if e['kind'] == 'character' and e['entity_id'] == 'clone_01')
    if any(r['revision_id'] == REVISION for r in entry['revisions']):
        raise ValueError('Already registered; do not overwrite the version record.')
    browser = json.loads((BASE / 'reviews/browser.json').read_text(encoding='utf-8'))
    assert browser['status'] == 'passed', 'Record the focused browser review first.'
    source, output = BASE / 'source/baseline_generated.png', BASE / 'output/baseline.png'
    assert digest(source) == digest(output), 'Preserve the generated raster and alpha.'
    image = Image.open(output)
    image.load()
    assert image.mode == 'RGBA' and image.width == image.height
    alpha = image.getchannel('A')
    assert alpha.getextrema() == (0, 255)
    save('reviews/structure.json', {
        'status':'passed', 'scope':'Single PNG decode, RGBA alpha, and identical source/output bytes; no animation tests.',
        'size':list(image.size), 'alpha_extrema':list(alpha.getextrema()),
        'zero_alpha_pixels':alpha.histogram()[0], 'total_pixels':image.width * image.height,
        'raw_alpha_bbox':alpha.getbbox(), 'alpha_over_16_bbox':alpha.point(lambda v:255 if v > 16 else 0).getbbox(),
        'source_output_sha256':digest(output),
        'note':'Low-alpha generated edge specks remain unchanged. Angle and proportions require visual/user review.'
    })
    save('records/generation.json', {
        'tool':'built-in image_gen.imagegen', 'mode':'edit', 'calls':1, 'model':None,
        'model_note':'No model/version identifier returned by the built-in tool.', 'seed':None, 'cost':None,
        'cost_note':'No billing amount returned by the tool.',
        'started_at_utc':'2026-11-09T00:25:16.456Z', 'finished_at_utc':'2026-11-09T00:25:56.297Z', 'elapsed_seconds':39.841,
        'requested_camera_elevation_degrees':12, 'measured_camera_elevation_degrees':None,
        'prompt':'records/baseline_prompt.json', 'exact_prompt_md':'records/baseline_prompt.md',
        'inputs':[
            {'role':'edit target', 'path':'source/reference-fighter.png', 'sha256':digest(BASE / 'source/reference-fighter.png')},
            {'role':'approved costume reference', 'path':'source/reference-approved.png', 'sha256':digest(BASE / 'source/reference-approved.png')},
            {'role':'front costume construction reference', 'path':'source/reference-front.png', 'sha256':digest(BASE / 'source/reference-front.png')}
        ],
        'camera_pose_policy':'Retain the previous shallow fighting-game view and pose. This request targets costume only.',
        'dependencies':['plan_b_fighter_view_002', 'reference_003_3d', 'turnaround_001'],
        'original_tool_output':'C:/Users/axgatge/.codex/generated_images/01a1bd85-b640-76d1-b63b-d6db45e6d65c/exec-3e13640a-7ccd-4ec9-9146-75f6d351173a.png',
        'saved_source':'source/baseline_generated.png', 'display':'output/baseline.png', 'output_sha256':digest(output),
        'native_size':list(image.size), 'postprocessing':'None; exact byte copies. No scaling, alignment, cropping, palette conversion or alpha cleanup.',
        'art_direction_status':'awaiting_user_review', 'motions':[]
    })
    save('output/manifest.json', {
        'schema_version':1, 'plan':'Plan B', 'revision':REVISION, 'type':'still_camera_reference',
        'image':'baseline.png', 'canvas':{'width':image.width, 'height':image.height}, 'frame_count':1,
        'requested_camera_elevation_degrees':12, 'facing':'right', 'animation_available':False,
        'art_direction_status':'awaiting_user_review'
    })
    save('reviews/visual.json', {
        'status':'reviewed_pending_user', 'reviewed':['Generated image', 'approved costume illustration', 'front and right turnaround illustrations', 'browser-angle.png', 'browser-comparison.png', 'browser-before-after.png'],
        'observations':[
            'Plain rounded chest/abdominal plates are replaced by a dark central cuirass with light-gray outer chest insets, a strapped under-chest band and a dark fitted waist with sparse gold vertical seams.',
            'The smooth flared school-pleat skirt is replaced by layered rectangular armored tassets, a distinct center panel, stacked waist/hip belts and box-shaped side pouches, closer to the approved illustration.',
            'Face, hair, shallow camera, open-torso pose, cape, two-handed M16 aim and bent legs remain visually similar to the edit target; full body and rifle fit inside the canvas.',
            'The costume references are translated into simplified pixel-art clusters. Fine motifs/rivets, exact pouch count and fabric layering are not reproduced one-to-one. Generation is not a pixel-exact local patch outside the outfit.'
        ],
        'limitations':['Approximate generated angle, not measured 3D projection.', 'One still; no keyposes or inbetweens.', 'User acceptance pending.']
    })
    for name in ['game/index.html', 'game/plan-b-lab.js', 'game/styles.css']:
        target = BASE / 'records/runtime_snapshot_after' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PROJECT / name, target)
    root = BASE.relative_to(PROJECT).as_posix()
    artifacts = [{'path':p.relative_to(PROJECT).as_posix(), 'sha256':digest(p)}
                 for p in sorted(BASE.rglob('*')) if p.is_file() and '__pycache__' not in p.parts]
    entry['revisions'].append({
        'revision_id':REVISION, 'display_name':'플랜 B · 격투게임식 의상 보완 003', 'status':'draft', 'verification':'passed',
        'verification_scope':'Single PNG decode/alpha and byte preservation; JS syntax; focused Windows Chrome display/URL/selection/comparison/500px only. Not art acceptance or animation validation.',
        'art_direction_status':'awaiting_user_review', 'recipe_key':digest(BASE / 'records/baseline_prompt.json'),
        'dependencies':[{'kind':'character', 'entity_id':'clone_01', 'revision_id':r} for r in ['plan_b_fighter_view_002', 'reference_003_3d', 'turnaround_001']],
        'artifacts':artifacts,
        'preview':{'type':'concept_image', 'image_path':root + '/output/baseline.png', 'width':image.width, 'height':image.height,
                   'views':['right_elevated_12_torso_open_costume_corrected'], 'sample_url':'#/samples/characters/clone_01?plan=b&study=fighter_outfit_003'},
        'motions':[], 'capabilities':['concept_image'],
        'description':'격투게임식 12° 시점의 몸통과 스커트를 채택 일러스트에 맞춰 보완한 도트풍 정지 기준. 회색 흉갑 인셋·몸통 스트랩/벨트·허리 파우치·겹친 장갑 스커트를 복원했으며 아트 검수 대기, 모션은 미제작입니다.',
        'review_notes':['흉갑 인셋·가슴 아래 스트랩·허리 벨트/파우치 복원', '주름치마 대신 겹친 장갑 패널·중앙 하의 패널', '같은 페이지에서 채택 일러스트/보완 전후 비교 · 세부 아트 검수 대기'],
        'prompt_path':root + '/records/baseline_prompt.json', 'prompt_document':root + '/records/baseline_prompt.md'
    })
    catalog_path.write_bytes((json.dumps(catalog, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    print(json.dumps({'registered':REVISION, 'artifacts':len(artifacts), 'elapsed_seconds':39.841,
                      'source_output_sha256':digest(output), 'selected_revision_id':entry['selected_revision_id']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
