"""Organize generated whole-character sheets; never synthesize poses or fit individual frames."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
from PIL import Image, ImageDraw

BASE = Path(__file__).resolve().parents[1]
PROJECT = BASE.parents[5]
CELL = 627


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes((json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare():
    if (BASE/'source/baseline.png').exists():
        raise FileExistsError('Do not overwrite prepared sources.')
    for name in ['game/app.js','game/index.html','game/styles.css','game/plan-b-lab.js',
                 'game/animation/frame-sequence.js','game/animation/sequence-fire.js',
                 'game/public/assets/catalog/asset_index.json','AGENTS.md','README.md']:
        target = BASE/'records/runtime_snapshot_before'/name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PROJECT/name, target)
    (BASE/'source').mkdir(parents=True, exist_ok=True)
    source = PROJECT/'art/characters/clone_01/motion/plan_b/fighter_outfit_003/output/baseline.png'
    shutil.copy2(source, BASE/'source/baseline_original.png')
    shutil.copy2(PROJECT/'art/characters/clone_01/concepts/kneeling_fire_001/source/kneeling_fire.png', BASE/'source/kneeling_reference.png')
    raw = Image.open(source).convert('RGBA')
    baseline = raw.resize((CELL,CELL), Image.Resampling.NEAREST)
    baseline.save(BASE/'source/baseline.png')
    board = Image.new('RGBA',(CELL*2,CELL*2))
    for i in range(4):
        board.paste(baseline,((i%2)*CELL,(i//2)*CELL))
    board.save(BASE/'source/baseline_board.png')
    save(BASE/'records/baseline-normalization.json', {'source_size':list(raw.size),'size':[CELL,CELL],
         'scale':CELL/raw.width,'resampling':'nearest','offset':[0,0],'alpha_cleanup':False,
         'performed_before_pose_generation':True,'individual_pose_fitting':False,'source_sha256':digest(source)})
    print('Prepared 627px common baseline and 2x2 edit board; snapshots preserved.')


def import_sheet(clip, stage):
    metadata = json.loads((BASE/clip/'records'/f'{stage}_generation.json').read_text(encoding='utf-8'))
    dest = BASE/clip/'source'
    dest.mkdir(parents=True, exist_ok=True)
    raw_path = dest/f'{stage}_generated.png'
    shutil.copy2(metadata['generated_source'],raw_path)
    raw = Image.open(raw_path).convert('RGBA')
    sheet = raw if raw.size==(CELL*2,CELL*2) else raw.resize((CELL*2,CELL*2),Image.Resampling.NEAREST)
    sheet.save(dest/f'{stage}.png')
    indices = [0,2,4,6] if stage.startswith('keys') else [1,3,5,7]
    metrics=[]
    for cell,index in enumerate(indices):
        box=((cell%2)*CELL,(cell//2)*CELL,(cell%2+1)*CELL,(cell//2+1)*CELL)
        frame=sheet.crop(box)
        target=dest/f'{stage}_cells'/f'{index:02d}.png'
        target.parent.mkdir(parents=True, exist_ok=True)
        frame.save(target)
        bbox=frame.getchannel('A').point(lambda a:255 if a>64 else 0).getbbox()
        if not bbox:
            raise ValueError(f'Empty cell {clip}:{stage}:{index}')
        metrics.append({'frame':index,'solid_bbox':bbox})
    compare=Image.new('RGB',(CELL*5,CELL+30),'#eceee4')
    baseline=Image.open(BASE/'source/baseline.png').convert('RGBA')
    compare.paste(baseline,(0,30),baseline)
    draw=ImageDraw.Draw(compare)
    draw.text((10,8),'BASELINE / SAME SCALE',fill='#30342f')
    for cell,index in enumerate(indices):
        frame=Image.open(dest/f'{stage}_cells'/f'{index:02d}.png').convert('RGBA')
        compare.paste(frame,((cell+1)*CELL,30),frame)
        draw.text(((cell+1)*CELL+10,8),f'{clip} / {index:02d}',fill='#30342f')
    (BASE/clip/'reviews').mkdir(parents=True, exist_ok=True)
    compare.save(BASE/clip/'reviews'/f'{stage}_comparison.png')
    save(BASE/clip/'records'/f'{stage}_split.json',{'raw_size':list(raw.size),'board_size':[CELL*2,CELL*2],
         'raw_sha256':digest(raw_path),'whole_sheet_normalization':raw.size!=(CELL*2,CELL*2),
         'individual_pose_scale_or_translation':False,'alpha_cleanup':False,'frames':metrics})
    print(json.dumps({'clip':clip,'stage':stage,'raw_size':list(raw.size),'frames':metrics}))


def pack(clip):
    plan=json.loads((BASE/'records/plan.json').read_text(encoding='utf-8'))[clip]
    gate=json.loads((BASE/clip/'reviews/key_gate.json').read_text(encoding='utf-8'))
    assert gate['status']=='provisional_pass', 'Inspect key poses before packing.'
    frames=[]
    for i in range(8):
        selected=BASE/clip/'records/selected_keys.json'
        key_stage=json.loads(selected.read_text(encoding='utf-8'))['stage'] if selected.exists() else 'keys'
        stage=key_stage if i%2==0 else 'between'
        frames.append(Image.open(BASE/clip/'source'/f'{stage}_cells'/f'{i:02d}.png').convert('RGBA'))
    anchors=BASE/clip/'records/anchors.json'
    if anchors.exists():
        for index,path in json.loads(anchors.read_text(encoding='utf-8'))['frames'].items():
            anchor=Image.open(BASE/path).convert('RGBA')
            assert anchor.size==(CELL,CELL)
            frames[int(index)]=anchor
    out=BASE/clip/'output'
    (out/'frames').mkdir(parents=True,exist_ok=True)
    atlas=Image.new('RGBA',(CELL*8,CELL))
    contact=Image.new('RGB',(CELL*4,(CELL+24)*2),'#eceee4')
    draw=ImageDraw.Draw(contact)
    for i,frame in enumerate(frames):
        frame.save(out/'frames'/f'{i:02d}.png')
        atlas.paste(frame,(i*CELL,0))
        x,y=(i%4)*CELL,(i//4)*(CELL+24)
        contact.paste(frame,(x,y+24),frame)
        draw.text((x+10,y+6),f'{i:02d} / '+('KEY' if i%2==0 else 'BETWEEN'),fill='#30342f')
    atlas.save(out/'spritesheet.png')
    contact.save(out/'contact-sheet.png')
    manifest={'schema_version':1,'plan':'Plan B','revision_id':f'plan_b_fighter_motion_004_{clip}',
        'action':clip,'frameCount':8,'keyframeIndices':[0,2,4,6],'canvas':{'width':CELL,'height':CELL},
        'durationMs':plan['durationMs'],'frameDurationsMs':[plan['durationMs']]*8,'loopRange':[0,7],
        'loop':plan['loop'],'pixelArt':True,'shotIndices':[0,4] if clip.endswith('_fire') else [],
        'frames':[f'frames/{i:02d}.png' for i in range(8)],'spritesheet':'spritesheet.png',
        'contactSheet':'contact-sheet.png','referenceFrameIndices':[],'facing':'right',
        'anchorSourceFrames':json.loads(anchors.read_text(encoding='utf-8'))['frames'] if anchors.exists() else {},
        'requestedCameraPitch':12,'art_direction_status':'awaiting_user_review',
        'processing':'2x2 model-generated sheets split into equal cells, one shared whole-sheet normalization if needed. No individual pose scaling/alignment, interpolation, limb transforms or generated GIF.',
        'limitations':['Approximate drawn 12-degree view; not 3D projection.','Full-body rifle/cape/hair are baked; detail and contact continuity require user review.']}
    save(out/'manifest.json',manifest)
    if clip=='kneel':
        held=BASE/'kneel_hold/output'
        (held/'frames').mkdir(parents=True,exist_ok=True)
        held_atlas=Image.new('RGBA',(CELL*8,CELL))
        for i in range(8):
            frames[-1].save(held/'frames'/f'{i:02d}.png')
            held_atlas.paste(frames[-1],(i*CELL,0))
        held_atlas.save(held/'spritesheet.png')
        save(held/'manifest.json',{**manifest,'action':'kneel_hold','loop':True,
             'spritesheet':'spritesheet.png','keyframeIndices':[],
             'note':'Static final kneel pose duplicated only as an input-fire resting track; not an additional animation.'})
    save(BASE/clip/'reviews/structure.json',{'status':'passed','scope':'8 RGBA frames, atlas dimensions and nonempty decoded content only; not final art acceptance.',
        'frame_count':8,'canvas':[CELL,CELL],'atlas':[CELL*8,CELL],'loop':plan['loop'],
        'unique_frame_hashes':len({digest(out/'frames'/f'{i:02d}.png') for i in range(8)}),
        'source_key_gate':'provisional only; user art review pending'})
    print(f'Packed {clip}: 8 frames, loop={plan["loop"]}')


def select_keys(clip,stage):
    save(BASE/clip/'records/selected_keys.json',{'stage':stage,'selection':'Visual provisional gate; no pixel editing or pose transforms.'})
    shutil.copy2(BASE/clip/'reviews'/f'{stage}_comparison.png',BASE/clip/'reviews/accepted_keys_comparison.png')
    print(f'Selected {clip} key stage: {stage}')


def contact_guide():
    board=Image.open(BASE/'source/baseline_board.png').convert('RGBA')
    draw=ImageDraw.Draw(board)
    for row in range(2):
        for col in range(2):
            draw.line((col*CELL+40,row*CELL+574,col*CELL+550,row*CELL+574),fill=(40,180,255,255),width=2)
    board.save(BASE/'source/contact_guide_board.png')
    save(BASE/'records/contact-guide.json',{'purpose':'Visual grounding guide for kneel key retry; not a delivered sprite.',
         'line_y':574,'line_color':[40,180,255],'character_pixels_changed':False,'new_pose_synthesis':False})


def import_reference():
    metadata=json.loads((BASE/'kneel/records/reference_generation.json').read_text(encoding='utf-8'))
    target=BASE/'kneel/source/grounded_reference_original.png'
    shutil.copy2(metadata['generated_source'],target)
    raw=Image.open(target).convert('RGBA')
    image=raw.resize((CELL,CELL),Image.Resampling.NEAREST)
    image.save(BASE/'kneel/source/grounded_reference.png')
    board=Image.new('RGBA',(CELL*2,CELL*2))
    for i in range(4):board.paste(image,((i%2)*CELL,(i//2)*CELL))
    board.save(BASE/'kneel/source/grounded_reference_board.png')
    save(BASE/'kneel/records/grounded-reference-normalization.json',{'raw_size':list(raw.size),'size':[CELL,CELL],
        'scale':CELL/raw.width,'resampling':'nearest','offset':[0,0],'alpha_cleanup':False,
        'before_dependent_generation':True,'individual_pose_fit':False})


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command',choices=['prepare','import','pack','select','guide','import-reference'])
    parser.add_argument('clip',nargs='?')
    parser.add_argument('stage',nargs='?')
    args=parser.parse_args()
    if args.command=='prepare':prepare()
    elif args.command=='guide':contact_guide()
    elif args.command=='import-reference':import_reference()
    elif args.command=='import':import_sheet(args.clip,args.stage)
    elif args.command=='select':select_keys(args.clip,args.stage)
    else:pack(args.clip)
