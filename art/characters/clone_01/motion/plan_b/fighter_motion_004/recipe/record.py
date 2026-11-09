"""Record only this new motion family after its focused display and PNG review."""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image

BASE=Path(__file__).resolve().parents[1]
PROJECT=BASE.parents[5]
REVISION='plan_b_fighter_motion_004'


def save(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes((json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    plan=json.loads((BASE/'records/plan.json').read_text(encoding='utf-8'))
    catalog_path=PROJECT/'game/public/assets/catalog/asset_index.json'
    catalog=json.loads(catalog_path.read_text(encoding='utf-8'))
    entry=next(e for e in catalog['entries'] if e['kind']=='character' and e['entity_id']=='clone_01')
    if any(r['revision_id']==REVISION for r in entry['revisions']):
        raise ValueError('Do not overwrite an existing version record.')
    browser=json.loads((BASE/'reviews/browser.json').read_text(encoding='utf-8'))
    assert browser['status']=='passed'
    calls=[]
    structures=[]
    for clip in plan:
        manifest=json.loads((BASE/clip/'output/manifest.json').read_text(encoding='utf-8'))
        assert manifest['frameCount']==8
        assert json.loads((BASE/clip/'reviews/key_gate.json').read_text(encoding='utf-8'))['status']=='provisional_pass'
        for path in sorted((BASE/clip/'records').glob('*_generation.json')):
            calls.append(json.loads(path.read_text(encoding='utf-8')))
        for name in manifest['frames']:
            with Image.open(BASE/clip/'output'/name) as image:
                image.load()
                assert image.mode=='RGBA' and image.size==(627,627)
        structures.append({'clip':clip,'frame_count':8,'loop':manifest['loop'],
                           'unique_frames':len({digest(BASE/clip/'output'/name) for name in manifest['frames']})})
    generation={
        'tool':'built-in image_gen.imagegen','model':None,'seed':None,'cost':None,
        'cost_note':'Built-in tool did not expose model version, seed or monetary charge.',
        'image_generation_calls':len(calls),'calls':calls,
        'sum_observed_call_seconds':round(sum(c['elapsed_seconds'] for c in calls),3),
        'normalization':'Baseline uniformly reduced 1254 to 627 before generation. Equal 2x2 cell splits; whole-board common normalization only if dimensions differ. No individual pose fitting, translation, interpolation or limb transforms.',
        'baseline_dependency':'plan_b_fighter_outfit_003','baseline_original_sha256':digest(BASE/'source/baseline_original.png'),
        'kneeling_pose_reference_sha256':digest(BASE/'source/kneeling_reference.png'),
        'visible_clips':list(plan),'delivered_pose_slots':56,
        'generated_sheet_pose_slots_including_rejected':sum(c.get('pose_slots',4) for c in calls),
        'static_rest_track':'kneel_hold is eight copies of the final kneeling drawing solely for resting input-fire playback, not another generated animation.',
        'requested_camera_pitch':12,'measured_camera_pitch':None,
        'art_direction_status':'awaiting_user_review','gif_generated':False,
        'verification_scope':'PNG/atlas contract, provisional visual key review, short browser playback/input/one-shot/URL checks only.'
    }
    save(BASE/'records/generation.json',generation)
    save(BASE/'reviews/structure.json',{'status':'passed','scope':'Only the new seven 8-frame clips; no old/full project suite.',
         'clips':structures,'total_generated_poses':56,'art_acceptance':'awaiting_user_review'})
    for name in ['game/index.html','game/plan-b-lab.js','game/animation/frame-sequence.js']:
        target=BASE/'records/runtime_snapshot_after'/name
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(PROJECT/name,target)
    artifacts=[{'path':p.relative_to(PROJECT).as_posix(),'sha256':digest(p)}
               for p in sorted(BASE.rglob('*')) if p.is_file() and '__pycache__' not in p.parts]
    root=BASE.relative_to(PROJECT).as_posix()
    entry['revisions'].append({
        'revision_id':REVISION,'display_name':'플랜 B · 12° 의상 보완 모션 004',
        'status':'draft','verification':'passed','art_direction_status':'awaiting_user_review',
        'verification_scope':'Seven 8-frame PNG/atlas contracts; provisional key review; focused Windows Chrome animation, input fire, one-shot, URLs and 500px display. Not physical foot contact or final art acceptance.',
        'recipe_key':hashlib.sha256((BASE/'records/plan.json').read_bytes()+(BASE/'source/baseline_original.png').read_bytes()).hexdigest(),
        'dependencies':[{'kind':'character','entity_id':'clone_01','revision_id':'plan_b_fighter_outfit_003'}],
        'artifacts':artifacts,'motions':list(plan),'capabilities':['png_sequence','spritesheet','browser_playback','input_firing','one_shot_clips'],
        'preview':{'type':'frame_sequence','image_path':root+'/walk/output/frames/00.png','width':627,'height':627,
                   'manifest_path':root+'/walk/output/manifest.json','sample_url':'#/samples/characters/clone_01?plan=b&study=fighter_motion_004&motion=walk'},
        'description':'의상을 보완한12° 기준으로 새로 그린 걷기/걸으며쏴/정지/서서쏴/앉기/앉아쏴/장전. 각8포즈, 입력 사격과 한 번 재생을 제공하는 아트 검수용 초안입니다.',
        'review_notes':['기준·키포즈 크기와 양발 교대를 확인한 뒤 중간 포즈 생성', '사격 전 무발사·단발/누르고 연사·실제 입력 횟수 집계', '발 높이/윤곽/망토/파지·장전의 세부 연속성은 사용자 검수 대기 · GIF 없음'],
        'prompt_path':root+'/records/plan.json','prompt_document':root+'/README.md'
    })
    catalog_path.write_bytes((json.dumps(catalog,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
    print(json.dumps({'registered':REVISION,'artifacts':len(artifacts),'clips':len(plan),'delivered_frames':56,'generation_calls':len(calls)},ensure_ascii=False))


if __name__=='__main__':main()
