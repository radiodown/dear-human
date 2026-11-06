"""Audit fixed rigid regions and prepare scale-locked reference boards, without drawing poses."""
from pathlib import Path
import argparse
import json
import hashlib
import shutil
from datetime import datetime, timezone
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
PLAN=ROOT/'art/characters/clone_01/motion/plan_b'
NEW=PLAN/'walk_002'
PREFIX='clone_01-plan-b-walk'

def write(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def prompt(name,data):
    write(NEW/'records'/f'{name}.json',data)
    (NEW/'records'/f'{name}.md').write_text('# Exact submitted image prompt\n\n```json\n'+json.dumps(data,ensure_ascii=False,indent=2)+'\n```\n',encoding='utf-8')

def prepare():
    for directory in ['source','records','reviews']:(NEW/directory).mkdir(parents=True,exist_ok=True)
    source=PLAN/'walk_001/source/baseline_standard.png'
    shutil.copyfile(source,NEW/'source/baseline_standard.png')
    baseline=Image.open(source).convert('RGBA')
    # Four exact baseline copies are a reference layout, NOT generated motion frames.
    board=Image.new('RGBA',(baseline.width*2,baseline.height*2))
    for x,y in [(0,0),(baseline.width,0),(0,baseline.height),(baseline.width,baseline.height)]:
        board.alpha_composite(baseline,(x,y))
    board.save(NEW/'source/reference_board.png')
    contract={
        'use_case':'identity-preserve',
        'asset_type':'2dimg2motion shared key poses / fixed-scale rifle-ready walk',
        'reference_roles':'Image 1 is the EXACT standardized baseline identity and pixel-size source. Image 2 is four exact copies of that baseline in the desired 2x2 source-sheet layout. It is a scale/layout reference only, not motion artwork.',
        'primary_request':'Edit the four whole-character poses on Image 2 into the four ordered walking key poses below. Preserve Image 2 canvas dimensions, each cell position, camera, apparent character scale, head size, rigid torso dimensions, and exact M16 stock-to-muzzle length from Image 1. The upper body remains aiming horizontally right. Change the lower-body walking pose and subtle passive cape/hair motion only. Do NOT enlarge the head or torso to compensate for bent knees. Do NOT make the character fill the cell. Do NOT lengthen the rifle. The previous failed attempt kept character height but enlarged the head, gun and torso; avoid that exact failure.',
        'identity_lock':'Use the provided baseline as the exact visual identity source, not loose inspiration. Same adult woman, very pale cool skin, dark eye, delicate small profile face, long straight black hair with gold hairpins, natural slender proportions, gunmetal-black armor with restrained gold trim, belt pouches, armored skirt, stockings and garters, tall armored boots, long gold-bordered black shoulder cape and wing emblem. Preserve realistic 3D rendered shading, slender chest and waist, fine face, small head. Only change pose and animation timing. Do not redesign, simplify, beautify, add details, remove details, change proportions, or reinterpret the character.',
        'rigid_scale_lock':'Keep the head crown-to-chin distance, shoulder-to-belt distance, torso width and M16 stock-to-muzzle distance identical to Image 1. Body scale is defined by these rigid parts, NEVER by total silhouette height. It is physically correct for a knee-bent pose to be a few pixels shorter; the figure must not grow to keep its silhouette height constant. Do not widen shoulder armor or thicken limbs. No body yaw, perspective change or torso rotation.',
        'topology_lock':'Strict orthographic right-facing profile. Near shoulder stays connected to near arm and pistol-grip hand (toward screen-left); far shoulder to far arm and fore-end hand (toward screen-right). Same M16 horizontal, same stock contact at shoulder. Both hands remain on the same grips. The near thigh is identified by its rectangular hard pouch and always remains the near thigh, even when behind. Exactly two legs, two arms, two hands, two boots. No mirroring. Hair and cape remain passive accessories attached to scalp and shoulders.',
        'canvas_lock':'Preserve Image 2 layout: exactly 2 columns by 2 rows; each cell the same 530x648 geometry as Image 1. At baseline scale the crown is around y145, soles around y503, rifle muzzle x385. Keep the head and rifle approximately at those coordinates in each cell. Use the same shared cell origin in all four cells, fixed apparent scale, large transparent gutters. Complete cape, boots and M16 stay inside their own cell. No labels, numbers, grid, borders, ground plane, shadows, dust, effects or scenery. Genuinely transparent background.',
        'ordered_cells':{
            '02 / top-left':'Short first contact: NEAR POUCH-THIGH steps modestly FORWARD screen-right; near heel lands. FAR unpouched leg extends BACKWARD screen-left with toe support. Maximum foot separation only about one boot-length wider than baseline. Stable rigid upper body.',
            '05 / top-right':'First passing: NEAR POUCH-THIGH is the planted almost-vertical leg beneath pelvis. FAR UNPOUCHED knee swings forward, far boot lifted just 10-15 pixels, not a high knee march. Natural small body rise without scale change.',
            '08 / bottom-left':'Opposite contact: NEAR POUCH-THIGH extends BACKWARD screen-left (pouch visibly behind pelvis). FAR UNPOUCHED leg extends FORWARD screen-right with heel landing. Opposite leg order from cell 02; do not mirror upper body. Same short stride.',
            '11 / bottom-right':'Second passing: FAR UNPOUCHED leg is planted beneath pelvis. NEAR POUCH-THIGH swings forward, pouch on raised thigh, boot lifted just 10-15 pixels. Natural small body rise without enlarging the character.'}}
    prompt('keyposes_prompt',contract)
    write(NEW/'records/official_review.json',{
        'official_commit':'d4d73e243b6ff64b7cbb3879e45e951f972a7e62',
        'reviewed_sources':['SKILL.md','references/keypose-redraw.md','references/motion-prompt-patterns.md','skills/img2mo-std/SKILL.md'],
        'cause':'walk_001 fixed silhouette height while accepting redrawn head/torso/rifle proportions inconsistent with the baseline. Per-frame sole translation also hid generated ground differences.',
        'rules':['Use standardized baseline for every image-generation stage.','Approve shared key poses only after baseline identity and rigid-part scale comparison.','Reject scale drift, proportion drift, center drift or unreadable motion even if file structure passes.','Use one shared uniform scale and fixed alignment for the source batch. No per-frame fitting.','If a key pose changes, regenerate its dependent in-betweens.'],
        'new_policy':'No 14-frame packaging until baseline-versus-key-pose size review passes. No claim that equal canvas dimensions prove equal character size.',
        'reference_board':'Exact baseline copies for layout/scale reference only; no procedural motion artwork.',
        'gif_policy':'No GIF generation, retaining existing user instruction.'})
    print(NEW)

def reject_old():
    review={
        'status':'failed','reason':'User identified inconsistent apparent character size. Baseline and generated frames differ in head/torso/weapon proportions; official hard-failure gate was missed.',
        'invalidates':'Previous structure-only passed result does not validate visual scale or identity.',
        'official_source':'https://github.com/WU-HAOTIAN34/2dimg2motion/blob/main/SKILL.md',
        'scope':'Keep prior generation, prompts and PNG frames intact as rejected history. Do not silently repack or per-frame scale them.',
        'correction_attempt':'walk_002; pending key-pose scale approval before full generation.'}
    write(PLAN/'walk_001/reviews/scale_rejection.json',review)
    path=ROOT/'game/public/assets/catalog/asset_index.json'
    data=json.loads(path.read_text(encoding='utf-8'))
    entry=next(e for e in data['entries'] if e['entity_id']=='clone_01' and e['kind']=='character')
    rev=next(r for r in entry['revisions'] if r['revision_id']=='plan_b_walk_001')
    rev.update(status='failed',verification='failed',verification_scope='visual_scale_and_identity_failed',art_direction_status='rejected')
    rev['review_notes']=['사용자 지적: 기준 이미지와 머리·몸통·총 비례가 달라 크기 불일치','이전 통과는 PNG 구조·기능 검사에 한정됨 · 시각적 실패','공식 크기·동일성 실패 조건을 적용해 재검토 중']
    artifact=PLAN/'walk_001/reviews/scale_rejection.json'
    rev['artifacts'].append({'path':artifact.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(artifact.read_bytes()).hexdigest()})
    write(path,data)

def audit():
    baseline=Image.open(NEW/'source/baseline_standard.png').convert('RGBA')
    sheet=Image.open(NEW/'source/keyposes.png').convert('RGBA')
    scale=baseline.width/(sheet.width/2)
    contact=Image.new('RGB',(baseline.width*5,baseline.height),(237,238,240))
    contact.paste(baseline,(0,0),baseline)
    draw=ImageDraw.Draw(contact)
    draw.text((16,16),'BASELINE / exact pixels',fill=(25,30,35))
    cell_metrics=[]
    for i,index in enumerate([2,5,8,11]):
        x,y=i%2,i//2
        box=(round(x*sheet.width/2),round(y*sheet.height/2),round((x+1)*sheet.width/2),round((y+1)*sheet.height/2))
        cell=sheet.crop(box)
        # One shared uniform scale from canvas geometry; no individual fitting or centering.
        cell=cell.resize((round(cell.width*scale),round(cell.height*scale)),Image.Resampling.LANCZOS)
        contact.paste(cell,((i+1)*baseline.width,0),cell)
        draw.text(((i+1)*baseline.width+16,16),f'KEY {index:02d} / shared scale {scale:.5f}',fill=(25,30,35))
        core=cell.getchannel('A').point(lambda a:255 if a>=48 else 0).getbbox()
        cell_metrics.append({'key':index,'source_cell':box,'shared_scale':scale,'core_bbox_at_common_scale':core})
    contact.save(NEW/'reviews/baseline-key-size-comparison.png')
    write(NEW/'reviews/key-size-gate.json',{
        'status':'failed','review_type':'Baseline-versus-keys visual comparison; canvas measurements are descriptive only.',
        'source_size':sheet.size,'reference_board_size':[baseline.width*2,baseline.height*2],
        'shared_scale':scale,'per_frame_scale_fit':False,'per_frame_center_fit':False,'cells':cell_metrics,
        'findings':['A size-locked reference board improves layout but the redrawn head/face and rigid upper-body proportions still do not match the exact baseline sufficiently.','The full silhouettes alone do not establish body scale. Head, torso and rifle must agree with the baseline before keys can be approved.'],
        'decision':'Reject this shared key-pose sheet. Do not generate its dependent in-betweens, package 14 frames or label it size-corrected.',
        'image_generation_calls':1,'observed_image_tool_wall_seconds':38.5,'model_id':None,'seed':None,'actual_cost':None})
    print(NEW/'reviews/baseline-key-size-comparison.png')

def browser_review():
    from playwright.sync_api import sync_playwright
    errors=[]
    url='http://127.0.0.1:4173/#/samples/characters/clone_01?plan=b&motion=walk'
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
        page=browser.new_page(viewport={'width':1440,'height':1100})
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(url)
        page.locator('#plan-b-quality-warning').wait_for(state='visible')
        assert '크기 검수' in page.locator('#plan-b-quality-warning').inner_text()
        assert page.locator('#review-state').inner_text()=='플랜 B · 크기 검수 실패'
        assert page.get_by_role('link',name='기준·새 키포즈 크기 대조 ↗').get_attribute('href').endswith('walk_002/reviews/baseline-key-size-comparison.png')
        page.screenshot(path=str(NEW/'reviews/browser-rejected.png'),full_page=True)
        browser.close()
    write(NEW/'reviews/browser.json',{'status':'passed' if not errors else 'failed','scope':'Failure status and comparison link display only; no corrected animation claimed.','browser':'Separate headless local Chrome; in-app browser tool failed before connection.','url':url,'page_errors':errors})
    assert not errors,errors

def record():
    write(NEW/'records/generation.json',{
        'plan':'Plan B','revision_id':'plan_b_walk_002_keys','status':'failed_at_keypose_scale_gate',
        'recorded_at':datetime.now(timezone.utc).isoformat(),'request_local_date':'2026-11-06',
        'tool':'2dimg2motion','commit':'d4d73e243b6ff64b7cbb3879e45e951f972a7e62',
        'image_generation_tool':'built-in image_gen.imagegen','image_generation_calls':1,
        'observed_image_tool_wall_seconds':38.5,'model_id':None,'seed':None,'actual_cost':None,
        'prompt':'keyposes_prompt.json','source':'keyposes.png',
        'inputs':['source/baseline_standard.png','source/reference_board.png'],
        'reference_board_role':'Exact duplicated baseline pixels for scale/layout reference only; not motion artwork.',
        'fullframe_count':0,'inbetweens_generated':False,'gif_generated':False,
        'decision':'Shared key sheet rejected after common-scale comparison against exact baseline; full 14-frame motion was not generated.'})
    path=ROOT/'game/public/assets/catalog/asset_index.json'
    catalog=json.loads(path.read_text(encoding='utf-8'))
    entry=next(e for e in catalog['entries'] if e['entity_id']=='clone_01' and e['kind']=='character')
    old=next(r for r in entry['revisions'] if r['revision_id']=='plan_b_walk_001')
    for artifact in old['artifacts']:
        if artifact['path']=='tools/plan_b_motion.py':
            snapshot=PLAN/'walk_001/records/runtime_snapshot/plan_b_motion.py'
            assert hashlib.sha256(snapshot.read_bytes()).hexdigest()==artifact['sha256']
            artifact['path']=snapshot.relative_to(ROOT).as_posix()
        elif artifact['path']=='art/characters/clone_01/motion/plan_b/README.md':
            # README is the mutable current-status index, not submitted prompts or artwork.
            artifact['sha256']=hashlib.sha256((ROOT/artifact['path']).read_bytes()).hexdigest()
    files=sorted(file for file in NEW.rglob('*') if file.is_file())+[Path(__file__)]
    artifacts=[{'path':file.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(file.read_bytes()).hexdigest()} for file in files]
    image=Image.open(NEW/'source/keyposes.png')
    revision={'revision_id':'plan_b_walk_002_keys','display_name':'플랜 B 002 · 키포즈 크기 검수 실패',
        'status':'failed','verification':'failed','verification_scope':'baseline_rigid_part_scale_visual_gate_failed',
        'art_direction_status':'rejected','artifacts':artifacts,'recipe_key':hashlib.sha256((NEW/'records/keyposes_prompt.json').read_bytes()).hexdigest(),
        'dependencies':[{'kind':'character','entity_id':'clone_01','revision_id':'side_master_004'}],
        'preview':{'type':'key_pose_sheet','image_path':(NEW/'source/keyposes.png').relative_to(ROOT).as_posix(),'width':image.width,'height':image.height},
        'motions':[],'capabilities':['concept_image'],
        'description':'공식 재검토 후 크기 안내판과 함께 생성한 키포즈 시트. 기준 대비 머리·상체 비례 검사를 통과하지 못해 반려했으며 중간 프레임·완성 모션은 미제작입니다.',
        'review_notes':['키포즈 1시트 생성 · 크기 검수 실패','공통 배율 비교만 적용 · 프레임별 크기/중심 맞춤 없음','14프레임 시퀀스 미제작']}
    entry['revisions']=[r for r in entry['revisions'] if r['revision_id']!='plan_b_walk_002_keys']+[revision]
    write(path,catalog)
    print(json.dumps({'status':'recorded','revision':revision['revision_id'],'artifacts':len(artifacts)},indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command',choices=['prepare','reject-old','audit','browser-review','record'])
    args=parser.parse_args()
    {'prepare':prepare,'reject-old':reject_old,'audit':audit,'browser-review':browser_review,'record':record}[args.command]()
