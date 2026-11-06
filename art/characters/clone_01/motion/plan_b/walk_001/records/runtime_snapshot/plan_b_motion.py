"""Dear Human Plan B: organize model-drawn 2dimg2motion frames; never draw poses."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import importlib.util
from datetime import datetime, timezone
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'art/characters/clone_01/motion/plan_b/walk_001'

IDENTITY = {
    'use_case': 'identity-preserve',
    'asset_type': 'Dear Human Plan B / 2dimg2motion whole-character walk sprites',
    'identity_source': 'Use the provided baseline image as the exact visual identity source, not loose inspiration. Preserve the SAME adult woman, exact face and dark eye in right-facing profile, long straight black hair and small gold hairpins, very pale cool skin, slender natural adult proportions, black and gunmetal segmented tactical armor with restrained worn gold details, armored skirt, garters, dark stockings, tall armored combat boots, gold-bordered black shoulder cape and wing emblem. Preserve realistic 3D rendered material shading. Only change pose and animation timing. Do not redesign, simplify, beautify, add details, remove details, change proportions, or reinterpret the character.',
    'topology_lock': 'Strict right-facing orthographic side profile throughout. Exactly one head, two arms, two hands, two legs, two boots. The near arm remains attached to the near shoulder and its hand stays at the M16 pistol grip toward screen-left. The far arm remains attached to the far shoulder and its hand stays beneath the M16 fore-end toward screen-right. No hand switching or mirroring. Near leg remains near leg and far leg remains far leg as they cross; knees bend naturally forward. Cape and hair are passive accessories fixed to shoulders and scalp.',
    'weapon_lock': 'The same conventional M16 always points horizontally screen-right, stock at shoulder, near hand on pistol grip, far hand under fore-end. Constant barrel length, magazine, carry handle and front sight. No futuristic rifle, muzzle flash, smoke or separate effects.',
    'layout': 'Exactly FOUR complete separate full-body sprites in a precise TWO columns by TWO rows grid, reading order top-left, top-right, bottom-left, bottom-right. Equal rectangular cells. Canvas 1060 by 1296 pixels, each cell 530 by 648 pixels. Within each cell the character is 360 pixels tall, crown near y=144 and planted boot sole at y=504; body centered near x=250. Same apparent character size in every cell. Same foot/bottom baseline in every cell. Body center stays near the same cell center. Complete cape, boots, rifle and muzzle inside each cell with large empty gutters; no overlap or neighboring fragments. Do not fill the empty margins by enlarging the character. Plain genuinely TRANSPARENT background, no text, labels, numbers, borders, grid lines, floor, shadows, scenery, trails, dust or gradients.',
    'motion': 'One natural in-place rifle-ready walking cycle, moderate short military stride, not running or crouching. Alternate near and far planted feet, plausible heel strike / toe-off, modest pelvis bob, stable aiming upper body and restrained hair/cape lag. Preserve rigid chest armor; leg plates follow their segments.'
}
KEYS = {
    '02': 'First contact: near boot steps forward toward screen-right with heel landing, far boot back toward screen-left with toe supporting. Moderate split stride. Pelvis centered and near original height. Both arms keep rifle-ready grip.',
    '05': 'First passing/up: near leg now supports vertically below pelvis, far knee swings forward with far boot lifted slightly from ground. Near heel stays on ground, torso rises only slightly. Far leg is still the far leg behind the near thigh.',
    '08': 'Opposite contact: far boot steps forward screen-right to heel strike, near boot extends back screen-left with toe on ground. Opposite of 02 in leg motion, without mirroring body, rifle, hands or costume. Pelvis centered.',
    '11': 'Second passing/up: far leg supports beneath pelvis, near knee swings forward and its boot lifts slightly. Return toward the original relaxed rifle-ready baseline at 13, with soft controlled settling. Hands and rifle stay constant.'
}

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def save_prompt(name, prompt):
    write_json(BASE / 'records' / f'{name}.json', prompt)
    (BASE / 'records' / f'{name}.md').write_text('# Exact submitted image prompt\n\n```json\n'+json.dumps(prompt, ensure_ascii=False, indent=2)+'\n```\n', encoding='utf-8')

def prepare():
    for folder in ['records', 'source', 'output/keyframe', 'output/fullframe', 'reviews']:
        (BASE/folder).mkdir(parents=True, exist_ok=True)
    save_prompt('keyposes_prompt', {**IDENTITY, 'ordered_cells': KEYS})
    for name, cells in {
        'inbetweens_a_prompt': {
            '01': 'Between baseline 00 and key 02: near foot begins extending screen-right, far heel begins lifting screen-left; half-way into first contact. Same silhouette identity and scale as references.',
            '03': 'One third between key 02 contact and key 05 passing: near leg accepts weight with slight knee flex, far heel lifts to toe-off behind. Small down phase.',
            '04': 'Two thirds between key 02 and key 05: near planted foot travels closer under pelvis, far knee begins swinging forward, far boot off ground behind.',
            '06': 'One third between key 05 passing and key 08 opposite contact: far knee and boot advance screen-right, near support leg extends backward. Slight up phase.'},
        'inbetweens_b_prompt': {
            '07': 'Two thirds between key 05 passing and key 08 opposite contact: far boot extends screen-right preparing heel strike, near heel lifts behind. Natural leg trajectory.',
            '09': 'One third between key 08 opposite contact and key 11 passing: far leg accepts weight with small knee flex, near heel rises into toe-off behind. Small down phase.',
            '10': 'Two thirds between key 08 and key 11: far planted boot approaches beneath pelvis, near knee swings forward, near boot lifted behind.',
            '12': 'Halfway between key 11 and the original baseline pose at 13: near boot lowers next to the far boot, legs return to the same slight stagger and relaxed rifle-ready stance as baseline. Do not overshoot.'}
    }.items():
        save_prompt(name, {**IDENTITY,
            'reference_roles': 'Image 1 is the exact baseline identity and loop endpoint. Image 2 is the approved key-pose sheet in order 02,05,08,11. Match its face, scale, proportions, materials and weapon. Draw ONLY the following four NEW intermediate poses; do not redraw or replace the anchor frames.',
            'ordered_cells': cells})
    write_json(BASE/'records'/'analysis.json', {
        'plan':'Plan B', 'tool':'2dimg2motion', 'action':'walk',
        'baseline_source':'art/characters/clone_01/motion/rig_004/source/side_master.png',
        'appearance_dependency':'reference_003_3d',
        'analysis': IDENTITY, 'keyframe_briefs': KEYS,
        'occluded_regions':'Far shoulder, far hip and part of far arm/leg are occluded in baseline. Model must redraw plausible full-body poses, keeping grip ownership and leg order.',
        'scope':'First Plan B motion: rifle-ready walk, 14 frames. Full-body M16 is baked into these reference sprites and does not replace the modular runtime.',
        'gif_policy':'No GIF generated; existing user instruction overrides upstream GIF requirement.'})
    print(BASE.relative_to(ROOT))

def pack():
    output=BASE/'output'
    prefix='clone_01-plan-b-walk'
    canvas=(530,648)
    ground=503
    scale=360/484
    sources=[('keyposes_003.png',[2,5,8,11]),('inbetweens_a.png',[1,3,4,6]),('inbetweens_b_002.png',[7,9,10,12])]
    frames={}
    normalization=[]
    for name, indices in sources:
        sheet=Image.open(BASE/'source'/name).convert('RGBA')
        for cell,index in enumerate(indices):
            col,row=cell%2,cell//2
            box=(round(col*sheet.width/2),round(row*sheet.height/2),round((col+1)*sheet.width/2),round((row+1)*sheet.height/2))
            sprite=sheet.crop(box)
            # Alpha cleanup only; no limb transforms, pose synthesis or per-frame fitting.
            sprite.putalpha(sprite.getchannel('A').point(lambda a: 0 if a<8 else a))
            sprite=sprite.resize((round(sprite.width*scale),round(sprite.height*scale)),Image.Resampling.LANCZOS)
            sprite.putalpha(sprite.getchannel('A').point(lambda a: 0 if a<8 else a))
            bounds=sprite.getbbox()
            if not bounds or min(bounds[:2])<16 or bounds[2]>sprite.width-16 or bounds[3]>sprite.height-16:
                raise ValueError(f'Clipped or empty cell: {name}:{index}')
            offset=(32,ground-bounds[3])
            frame=Image.new('RGBA',canvas)
            frame.alpha_composite(sprite,offset)
            frames[index]=frame
            normalization.append({'frame':index,'source':name,'cell':cell,'scale':scale,'translation':offset,'bbox':frame.getbbox()})
    baseline=Image.open(BASE/'source/baseline_standard.png').convert('RGBA')
    assert baseline.size==canvas and baseline.getbbox()[3]==ground
    frames[0]=baseline
    frames[13]=baseline
    for index in range(14):
        frames[index].save(output/'fullframe'/f'{prefix}_{index:02d}.png')
    shutil.copyfile(output/'fullframe'/f'{prefix}_00.png',output/'fullframe'/f'{prefix}_13.png')
    for index in [2,5,8,11]:
        shutil.copyfile(output/'fullframe'/f'{prefix}_{index:02d}.png',output/'keyframe'/f'{prefix}_{index:02d}.png')
    atlas=Image.new('RGBA',(canvas[0]*14,canvas[1]))
    contact=Image.new('RGB',(canvas[0]*7,canvas[1]*2),(238,239,241))
    draw=ImageDraw.Draw(contact)
    for index in range(14):
        atlas.alpha_composite(frames[index],(index*canvas[0],0))
        x,y=(index%7)*canvas[0],(index//7)*canvas[1]
        contact.paste(frames[index],(x,y),frames[index])
        draw.text((x+18,y+18),f'{index:02d}'+(' / KEY' if index in [2,5,8,11] else ''),fill=(30,35,42))
    atlas.save(output/'spritesheet.png')
    contact.save(output/'contact-sheet.png')
    write_json(BASE/'records/normalization.json',{'shared_scale':scale,'fixed_foot_baseline':ground,'horizontal_offset':32,'per_frame_scale_fit':False,'canvas':canvas,'frames':normalization})
    manifest={
        'schema_version':1,'plan':'Plan B','revision_id':'plan_b_walk_001','tool':'2dimg2motion',
        'upstream_commit':'d4d73e243b6ff64b7cbb3879e45e951f972a7e62',
        'action':'walk','facing':'right','frameCount':14,'keyframeIndices':[2,5,8,11],
        'anchorIndices':[0,2,5,8,11,13],'segmentInsertions':[1,2,2,2,1],
        'canvas':{'width':530,'height':648},'footBaseline':ground,'durationMs':85,
        'coordinateSpace':'screen-space','activeLimb':'near leg with thigh pouch',
        'activeShoulder':'near shoulder; grip hand remains on M16 pistol grip',
        'anchorLimb':'far leg; far arm remains under M16 fore-end',
        'weaponHand':'near hand at pistol grip, far hand at fore-end','weapon':'M16 baked into frame',
        'frames':[f'fullframe/{prefix}_{i:02d}.png' for i in range(14)],
        'spritesheet':'spritesheet.png','contactSheet':'contact-sheet.png',
        'previewType':'browser PNG sequence','gifGenerated':False,
        'previewBackground':'#FFFFFF','gifOmissionReason':'Existing explicit user instruction: no automatic GIF generation.',
        'baseline':'../source/baseline_standard.png','processing':'Model redraws all 12 new poses. Pillow only splits cells, applies one common uniform scale, aligns soles by translation, removes near-zero alpha, and packs PNG files.',
        'status':'draft','art_direction_status':'awaiting_user_review',
        'limitations':['M16 is baked into these full-body frames; independent weapon replacement is not supported by this draft.','Baseline endpoints use existing master; face/cloth detail and torso width vary slightly between generated sheets.','Foot trajectory, cape continuity and loop settling require user motion review.']}
    write_json(output/'manifest.json',manifest)
    (output/'keyframe-prompts.md').write_text('# Keyframe prompts\n\nSee exact submitted JSON and MD in `../records/keyposes_prompt.*`, `keyposes_retry_002.*` and `keyposes_retry_003.*`.\n\nFinal key sheet: `../source/keyposes_003.png`.\n',encoding='utf-8')
    validate()

def validate():
    script=ROOT/'tools/vendor/2dimg2motion/scripts/validate_14frame_pattern.py'
    spec=importlib.util.spec_from_file_location('img2mo_validator',script)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    output=BASE/'output'
    omitted=output/'preview.gif'
    errors=module.validate_pattern(baseline=BASE/'source/baseline_standard.png',keyframes_dir=output/'keyframe',fullframes_dir=output/'fullframe',preview=omitted,prefix='clone_01-plan-b-walk')
    allowed=f'missing file: {omitted}'
    actual=[error for error in errors if error!=allowed]
    assert not omitted.exists(),'GIF generation was not authorized'
    report={'status':'passed' if not actual else 'failed','scope':'Upstream 14-frame PNG checks; GIF-only requirement explicitly excluded by existing user instruction.', 'upstream_errors':errors,'excluded_checks':['GIF existence, frame count and white GIF background'],'errors':actual,'visual_review':'Contact sheet and browser playback reviewed separately; draft awaiting user art approval.'}
    write_json(BASE/'reviews/structure.json',report)
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if actual: raise SystemExit(1)

def record():
    """Register this Plan B revision while preserving other current catalog entries."""
    generation={
        'plan':'Plan B','tool':'2dimg2motion','tool_source':'https://github.com/WU-HAOTIAN34/2dimg2motion',
        'tool_commit':'d4d73e243b6ff64b7cbb3879e45e951f972a7e62',
        'recorded_at':datetime.now(timezone.utc).isoformat(),'request_local_date':'2026-11-06',
        'image_generation_tool':'built-in image_gen.imagegen','model_id':None,'seed':None,'actual_cost':None,
        'model_id_note':'The built-in tool did not expose a model ID, seed, token usage or monetary charge.',
        'image_generation_calls':6,'observed_image_tool_wall_seconds':233.1,
        'observed_image_tool_durations_seconds':[34.9,38.8,39.0,43.5,38.6,38.3],
        'input':'art/characters/clone_01/motion/rig_004/source/side_master.png',
        'appearance_dependency':'reference_003_3d','side_master_dependency':'side_master_004',
        'calls':[
            {'prompt':'keyposes_prompt.json','source':'keyposes.png','result':'rejected: repeated leg phase'},
            {'prompt':'keyposes_retry_002.json','source':'keyposes_002.png','result':'rejected: 08 still repeated near-leg contact'},
            {'prompt':'keyposes_retry_003.json','source':'keyposes_003.png','result':'used: opposite contact and passing corrected'},
            {'prompt':'inbetweens_a_prompt.json','source':'inbetweens_a.png','result':'used: frames 01,03,04,06'},
            {'prompt':'inbetweens_b_prompt.json','source':'inbetweens_b.png','result':'rejected: wrong leg phase in 07/09'},
            {'prompt':'inbetweens_b_retry_002.json','source':'inbetweens_b_002.png','result':'used: frames 07,09,10,12'}],
        'post_processing':'Official standardize_baseline.py; tools/plan_b_motion.py pack. No pose synthesis or limb transformations.',
        'verification':'Upstream PNG-only 14-frame structure checks; browser integration checks; contact sheet and selected browser frames visually inspected.',
        'gif_generated':False,'adoption':'awaiting_user_review',
        'remaining_issues':['Small shifts in face, torso thickness, cape folds and rifle details across source sheets.','Loop endpoints preserve the original baseline, producing a brief settling beat.','Full-body M16 is baked into frames; independent weapon switching is not provided.']}
    write_json(BASE/'records/generation.json',generation)
    review={'status':'draft','art_direction_status':'awaiting_user_review',
        'inspected':['baseline_standard.png','keyposes.png','keyposes_002.png','keyposes_003.png','inbetweens_a.png','inbetweens_b.png','inbetweens_b_002.png','output/contact-sheet.png','browser-frame-08.png','browser-mobile.png'],
        'observations':['Final contact phases alternate near pouch leg and far leg.','No sliced sprites or neighboring fragments observed. Both hands stay on the same rifle grips.','Same uniform scale applied to all generated cells; source apparent heights 472-488px. Fixed output sole baseline y=503.','Face, cloth, body and rifle details drift slightly across redraws; source-baseline endpoints are thinner than some generated torso poses.'],
        'quality':'Playable review draft; no final visual-quality or production approval claimed.'}
    write_json(BASE/'reviews/visual.json',review)
    files=sorted(file for file in BASE.rglob('*') if file.is_file())
    files += [ROOT/'art/characters/clone_01/motion/plan_b/README.md',ROOT/'game/animation/frame-sequence.js',ROOT/'game/plan-b-lab.js',ROOT/'tools/plan_b_motion.py',ROOT/'tools/review_plan_b.py']
    artifacts=[{'path':file.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(file.read_bytes()).hexdigest()} for file in files]
    recipe=hashlib.sha256(b''.join((BASE/'records'/name).read_bytes() for name in ['keyposes_prompt.json','keyposes_retry_002.json','keyposes_retry_003.json','inbetweens_a_prompt.json','inbetweens_b_retry_002.json'])+(BASE/'source/baseline_standard.png').read_bytes()).hexdigest()
    revision={
        'revision_id':'plan_b_walk_001','display_name':'플랜 B · 2dimg2motion 걷기 001',
        'status':'draft','verification':'passed','verification_scope':'14_frame_PNG_structure_and_local_browser_controls_only',
        'art_direction_status':'awaiting_user_review','recipe_key':recipe,'artifacts':artifacts,
        'dependencies':[{'kind':'character','entity_id':'clone_01','revision_id':'reference_003_3d'},{'kind':'character','entity_id':'clone_01','revision_id':'side_master_004'}],
        'preview':{'type':'frame_sequence','image_path':(BASE/'output/fullframe/clone_01-plan-b-walk_00.png').relative_to(ROOT).as_posix(),'width':530,'height':648,'sample_url':'#/samples/characters/clone_01?plan=b&motion=walk','manifest_path':(BASE/'output/manifest.json').relative_to(ROOT).as_posix()},
        'motions':['walk'],'capabilities':['png_sequence','spritesheet','browser_playback'],
        'description':'플랜 B: 2dimg2motion 전신 재생성 보행 14프레임. M16 포함 PNG 검토본이며 얼굴·망토·루프 연결의 품질 검토가 남아 있습니다.',
        'review_notes':['키포즈 4개와 중간 포즈 8개는 이미지 모델로 생성','GIF 생성 없음 · PNG 14프레임 재생','구조·브라우저 기능 검사 통과 · 최종 아트 채택 대기']}
    catalog_path=ROOT/'game/public/assets/catalog/asset_index.json'
    catalog=json.loads(catalog_path.read_text(encoding='utf-8'))
    entry=next(item for item in catalog['entries'] if item['kind']=='character' and item['entity_id']=='clone_01')
    entry['revisions']=[item for item in entry['revisions'] if item['revision_id']!='plan_b_walk_001']+[revision]
    write_json(catalog_path,catalog)
    print(json.dumps({'revision_id':revision['revision_id'],'artifacts':len(artifacts),'recipe_key':recipe},indent=2))

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['prepare','pack','validate','record'])
    args=parser.parse_args()
    {'prepare':prepare,'pack':pack,'validate':validate,'record':record}[args.command]()
