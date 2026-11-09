"""Copy individual model-drawn stills unchanged and assemble a static overview, never animate."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
from PIL import Image, ImageDraw

BASE=Path(__file__).resolve().parents[1]


def save(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes((json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))


def import_image(pose):
    folder=BASE/pose
    meta=json.loads((folder/'records/generation.json').read_text(encoding='utf-8'))
    (folder/'source').mkdir(parents=True,exist_ok=True)
    (folder/'output').mkdir(exist_ok=True)
    shutil.copy2(meta['generated_source'],folder/'source/generated.png')
    shutil.copy2(meta['generated_source'],folder/'output/pose.png')
    with Image.open(folder/'output/pose.png') as image:
        image.load()
        assert image.mode=='RGBA'
        assert image.getchannel('A').getextrema()==(0,255)
        info={'size':list(image.size),'mode':image.mode,'alpha_extrema':[0,255],
              'source_output_sha256':hashlib.sha256((folder/'output/pose.png').read_bytes()).hexdigest(),
              'postprocessing':'None. Identical original bytes; display size is controlled by the page.',
              'kind':'single_pose_concept','animation_available':False}
    save(folder/'output/manifest.json',{'schema_version':1,'type':'still_pose','pose':pose,'image':'pose.png',**info})
    print(json.dumps({'pose':pose,**info}))


def overview():
    plan=json.loads((BASE/'records/poses.json').read_text(encoding='utf-8'))
    sheet=Image.new('RGB',(400*4,450*2),'#eceee4')
    draw=ImageDraw.Draw(sheet)
    for i,(pose,spec) in enumerate(plan.items()):
        image=Image.open(BASE/pose/'output/pose.png').convert('RGBA')
        image.thumbnail((400,400),Image.Resampling.NEAREST)
        x,y=(i%4)*400,(i//4)*450
        sheet.paste(image,(x+(400-image.width)//2,y+30),image)
        draw.text((x+12,y+10),pose.upper()+' / STATIC POSE',fill='#30342f')
    (BASE/'output').mkdir(exist_ok=True)
    sheet.save(BASE/'output/pose-overview.png')
    print('Saved static overview; no motion frames, atlas or GIF created.')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('command',choices=['import','overview'])
    p.add_argument('pose',nargs='?')
    args=p.parse_args()
    import_image(args.pose) if args.command=='import' else overview()
