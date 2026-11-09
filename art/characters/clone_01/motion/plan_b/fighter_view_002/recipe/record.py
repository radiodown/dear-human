"""Preserve provenance and register the revised fighting-game-view still after its focused review."""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image

BASE = Path(__file__).resolve().parents[1]
PROJECT = BASE.parents[5]
REVISION = 'plan_b_fighter_view_002'


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
        'started_at_utc':'2026-11-09T00:19:50.835Z', 'finished_at_utc':'2026-11-09T00:20:25.098Z', 'elapsed_seconds':34.263,
        'requested_camera_elevation_degrees':12, 'measured_camera_elevation_degrees':None,
        'prompt':'records/baseline_prompt.json', 'exact_prompt_md':'records/baseline_prompt.md',
        'inputs':[
            {'role':'edit target', 'path':'source/reference-pitch30.png', 'sha256':digest(BASE / 'source/reference-pitch30.png')},
            {'role':'identity/proportion reference', 'path':'source/reference-side.png', 'sha256':digest(BASE / 'source/reference-side.png')}
        ],
        'requested_torso_turn_toward_viewer_degrees':20, 'measured_torso_turn_degrees':None,
        'dependencies':['plan_b_camera_pitch30_001', 'plan_b_guard_007_walk'],
        'original_tool_output':'C:/Users/axgatge/.codex/generated_images/01a1bd85-b640-76d1-b63b-d6db45e6d65c/exec-209e311a-5511-4891-b003-e1b68632a335.png',
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
        'status':'reviewed_pending_user', 'reviewed':['Generated image', 'browser-angle.png', 'browser-comparison.png'],
        'observations':[
            'Compared with the 30-degree target, the crown and boot tops are less dominant and the front face/chest and both bent arms read more clearly.',
            'The legs read taller with less overhead foreshortening and less depth separation between the feet. Full body, hair, cape and rifle remain inside the canvas.',
            'Long black hair, pale skin, black armor, restrained gold trim and a right-aimed rifle are retained.',
            'Torso front surface is opened toward the viewer while rifle and gaze remain toward screen right. This is a redrawn pose, not a rigid 3D camera transform; armor/face/stance details differ.'
        ],
        'limitations':['Approximate generated angle, not measured 3D projection.', 'One still; no keyposes or inbetweens.', 'User acceptance pending.']
    })
    for name in ['game/index.html', 'game/plan-b-lab.js']:
        target = BASE / 'records/runtime_snapshot_after' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PROJECT / name, target)
    root = BASE.relative_to(PROJECT).as_posix()
    artifacts = [{'path':p.relative_to(PROJECT).as_posix(), 'sha256':digest(p)}
                 for p in sorted(BASE.rglob('*')) if p.is_file() and '__pycache__' not in p.parts]
    entry['revisions'].append({
        'revision_id':REVISION, 'display_name':'플랜 B · 격투게임식 시점 002', 'status':'draft', 'verification':'passed',
        'verification_scope':'Single PNG decode/alpha and byte preservation; JS syntax; focused Windows Chrome display/URL/selection/comparison/500px only. Not art acceptance or animation validation.',
        'art_direction_status':'awaiting_user_review', 'recipe_key':digest(BASE / 'records/baseline_prompt.json'),
        'dependencies':[{'kind':'character', 'entity_id':'clone_01', 'revision_id':r} for r in ['plan_b_camera_pitch30_001', 'plan_b_guard_007_walk']],
        'artifacts':artifacts,
        'preview':{'type':'concept_image', 'image_path':root + '/output/baseline.png', 'width':image.width, 'height':image.height,
                   'views':['right_elevated_12_torso_open'], 'sample_url':'#/samples/characters/clone_01?plan=b&study=fighter_view_002'},
        'motions':[], 'capabilities':['concept_image'],
        'description':'내려보기를 약 12°로 낮추고 몸을 카메라 쪽으로 조금 튼 격투게임식 도트풍 정지 기준. 얼굴·흉갑·양팔을 보여 주며 시점/비례/외형 검수 대기, 모션은 미제작입니다.',
        'review_notes':['약 12° 내려보기 + 카메라 쪽으로 몸 틀기 · 얼굴/흉갑/양팔 강조', '정확한 3D 각도·부위 비례·고정 픽셀 격자는 보장하지 않음', '같은 플랜 B 페이지에서 선택·이전 30°와 비교·주소 복원'],
        'prompt_path':root + '/records/baseline_prompt.json', 'prompt_document':root + '/records/baseline_prompt.md'
    })
    catalog_path.write_bytes((json.dumps(catalog, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    print(json.dumps({'registered':REVISION, 'artifacts':len(artifacts), 'elapsed_seconds':34.263,
                      'source_output_sha256':digest(output), 'selected_revision_id':entry['selected_revision_id']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
