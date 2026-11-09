"""Register the seven static concepts only; the interrupted motion family stays unregistered."""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image

BASE=Path(__file__).resolve().parents[1]
PROJECT=BASE.parents[5]
REVISION='plan_b_simple_poses_005'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes((json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))


def main():
    plan=json.loads((BASE/'records/poses.json').read_text(encoding='utf-8'))
    browser=json.loads((BASE/'reviews/browser.json').read_text(encoding='utf-8'))
    assert browser['status']=='passed'
    catalog_path=PROJECT/'game/public/assets/catalog/asset_index.json'
    catalog=json.loads(catalog_path.read_text(encoding='utf-8'))
    entry=next(e for e in catalog['entries'] if e['kind']=='character' and e['entity_id']=='clone_01')
    assert not any(r['revision_id'] in [REVISION,'plan_b_fighter_motion_004'] for r in entry['revisions'])
    calls=[]
    items=[]
    for pose in plan:
        folder=BASE/pose
        calls.append(json.loads((folder/'records/generation.json').read_text(encoding='utf-8')))
        source=folder/'source/generated.png'
        output=folder/'output/pose.png'
        assert digest(source)==digest(output)
        image=Image.open(output)
        image.load()
        assert image.mode=='RGBA' and image.getchannel('A').getextrema()==(0,255)
        items.append({'pose':pose,'size':list(image.size),'sha256':digest(output),'kind':'one_still_pose','animation_available':False})
    assert not list(BASE.rglob('spritesheet.png')) and not list(BASE.rglob('*.gif'))
    motion=PROJECT/'art/characters/clone_01/motion/plan_b/fighter_motion_004'
    assert (PROJECT/'game/animation/frame-sequence.js').read_bytes()==(motion/'records/runtime_snapshot_before/game/animation/frame-sequence.js').read_bytes()
    assert 'FIGHTER_CLIPS' not in (PROJECT/'game/plan-b-lab.js').read_text(encoding='utf-8')
    save(BASE/'records/generation.json',{
        'tool':'built-in image_gen.imagegen','mode':'static pose concept editing','image_generation_calls':len(calls),
        'model':None,'seed':None,'cost':None,'unexposed_fields_note':'The tool did not expose model/version, seed or monetary charge.',
        'calls':calls,'sum_observed_call_seconds':round(sum(c['elapsed_seconds'] for c in calls),3),
        'inputs':['source/reference-detailed.png','source/reference-kneel.png','idle/output/pose.png for the six derived poses'],
        'prior_motion_work':'fighter_motion_004 stopped and preserved; experimental runtime wiring removed.',
        'pose_count':7,'animation_frames_created':0,'animation_available':False,
        'postprocessing':'Original individual PNG bytes preserved. Static overview only uses uniform thumbnails for comparison, never pose fitting.',
        'style':'Simpler, slimmer adult pixel-art concepts; sparse armor/pouches, large flat clusters. Exact fixed palette/grid and final game sprites are not certified.',
        'requested_camera_pitch':12,'measured_camera_pitch':None,'art_direction_status':'awaiting_user_review'
    })
    save(BASE/'reviews/structure.json',{'status':'passed','scope':'Seven decoded RGBA stills with transparency and original-byte preservation; no animation contract.',
        'items':items,'no_new_atlas_or_gif':True,'prior_experimental_frame_player_extension_removed':True,'art_acceptance':'awaiting_user_review'})
    for name in ['game/index.html','game/plan-b-lab.js']:
        target=BASE/'records/runtime_snapshot_after'/name
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(PROJECT/name,target)
    artifacts=[{'path':p.relative_to(PROJECT).as_posix(),'sha256':digest(p)}
               for p in sorted(BASE.rglob('*')) if p.is_file() and '__pycache__' not in p.parts]
    root=BASE.relative_to(PROJECT).as_posix()
    entry['revisions'].append({
        'revision_id':REVISION,'display_name':'플랜 B · 심플·슬림 자세 원화 005','status':'draft',
        'verification':'passed','verification_scope':'Seven still PNG decode/alpha/source-byte checks and short Chrome static selection/gallery/URL/500px display only; not art acceptance or animation validation.',
        'art_direction_status':'awaiting_user_review','recipe_key':digest(BASE/'idle/records/prompt.json'),
        'dependencies':[{'kind':'character','entity_id':'clone_01','revision_id':'plan_b_fighter_outfit_003'}],
        'artifacts':artifacts,'motions':[],'capabilities':['concept_image','still_pose_collection'],
        'preview':{'type':'pose_concept_collection','image_path':root+'/output/pose-overview.png','width':1600,'height':900,
                   'sample_url':'#/samples/characters/clone_01?plan=b&study=simple_poses_005&pose=idle'},
        'description':'도트의 장식/명암/의상 조각을 줄이고 성인 체형을 슬림하게 다듬은7자세 정지 원화. 모션은 사용자 지시로 보류했으며 각 자세의 외형 검토 단계입니다.',
        'review_notes':['정지·걷기·걷기 사격·정지 사격·앉기·앉아쏴·장전 각1장', '큰 색면·적은 장식·가늘고 긴 체형 · 세부 일치도/시점은 사용자 검수 대기', '프레임/중간 포즈/새 재생 연결 없음 · 기존 작업은 중단 기록에 보존'],
        'prompt_path':root+'/records/poses.json','prompt_document':root+'/README.md'
    })
    catalog_path.write_bytes((json.dumps(catalog,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
    print(json.dumps({'registered':REVISION,'pose_count':7,'artifacts':len(artifacts),'motions':[]},ensure_ascii=False))


if __name__=='__main__':main()
