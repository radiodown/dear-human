"""Preserve provenance and register the elevated still after its focused review."""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image

BASE = Path(__file__).resolve().parents[1]
PROJECT = BASE.parents[5]
REVISION = 'plan_b_camera_pitch30_001'


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
        'started_at_utc':'2026-11-09T00:10:53.106Z', 'finished_at_utc':'2026-11-09T00:11:30.608Z', 'elapsed_seconds':37.502,
        'requested_camera_elevation_degrees':30, 'measured_camera_elevation_degrees':None,
        'prompt':'records/baseline_prompt.json', 'exact_prompt_md':'records/baseline_prompt.md',
        'input':'source/reference-side.png', 'input_sha256':digest(BASE / 'source/reference-side.png'),
        'dependency':'plan_b_guard_007_walk',
        'original_tool_output':'C:/Users/axgatge/.codex/generated_images/01a1bd85-b640-76d1-b63b-d6db45e6d65c/exec-1535a304-5678-41e0-ae40-bdba7e36bb8f.png',
        'saved_source':'source/baseline_generated.png', 'display':'output/baseline.png', 'output_sha256':digest(output),
        'native_size':list(image.size), 'postprocessing':'None; exact byte copies. No scaling, alignment, cropping, palette conversion or alpha cleanup.',
        'art_direction_status':'awaiting_user_review', 'motions':[]
    })
    save('output/manifest.json', {
        'schema_version':1, 'plan':'Plan B', 'revision':REVISION, 'type':'still_camera_reference',
        'image':'baseline.png', 'canvas':{'width':image.width, 'height':image.height}, 'frame_count':1,
        'requested_camera_elevation_degrees':30, 'facing':'right', 'animation_available':False,
        'art_direction_status':'awaiting_user_review'
    })
    save('reviews/visual.json', {
        'status':'reviewed_pending_user', 'reviewed':['Generated image', 'browser-angle.png', 'browser-comparison.png'],
        'observations':[
            'Crown, shoulder upper plane, rifle upper surfaces and boot tops are more visible than in the side reference.',
            'Feet occupy different screen heights, giving ground-plane depth. The visible full body, hair, cape and rifle remain inside the canvas.',
            'Long black hair, pale skin, black armor, restrained gold trim and a right-aimed rifle are retained.',
            'Head/crown silhouette and armor/rifle detail differ from the original. No exact body-part scale or strict pixel-grid/palette match is claimed.'
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
        'revision_id':REVISION, 'display_name':'플랜 B · 30° 내려보기 기준 001', 'status':'draft', 'verification':'passed',
        'verification_scope':'Single PNG decode/alpha and byte preservation; JS syntax; focused Windows Chrome display/URL/selection/comparison/500px only. Not art acceptance or animation validation.',
        'art_direction_status':'awaiting_user_review', 'recipe_key':digest(BASE / 'records/baseline_prompt.json'),
        'dependencies':[{'kind':'character', 'entity_id':'clone_01', 'revision_id':'plan_b_guard_007_walk'}],
        'artifacts':artifacts,
        'preview':{'type':'concept_image', 'image_path':root + '/output/baseline.png', 'width':image.width, 'height':image.height,
                   'views':['right_elevated_30'], 'sample_url':'#/samples/characters/clone_01?plan=b&study=camera_pitch30_001'},
        'motions':[], 'capabilities':['concept_image'],
        'description':'기존 경계 자세를 약 30° 위에서 내려다보는 시점으로 새로 그린 도트풍 정지 기준. 시점/비례/외형 검수 대기이며 이 시점의 동작은 미제작입니다.',
        'review_notes':['정수리·어깨·총·군화 윗면과 양발 깊이 표현', '정확한 3D 각도·부위 비례·고정 픽셀 격자는 보장하지 않음', '같은 플랜 B 페이지에서 선택·정측면 비교·주소 복원'],
        'prompt_path':root + '/records/baseline_prompt.json', 'prompt_document':root + '/records/baseline_prompt.md'
    })
    catalog_path.write_bytes((json.dumps(catalog, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    print(json.dumps({'registered':REVISION, 'artifacts':len(artifacts), 'elapsed_seconds':37.502,
                      'source_output_sha256':digest(output), 'selected_revision_id':entry['selected_revision_id']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
