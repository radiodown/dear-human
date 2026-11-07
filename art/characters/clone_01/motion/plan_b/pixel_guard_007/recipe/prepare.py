"""Normalize the model baseline and organize input boards; never generate poses."""
from pathlib import Path
import json
import shutil
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def main():
    raw = Image.open(ROOT / 'source/baseline_generated.png').convert('RGBA')
    image = raw.copy()
    alpha = image.getchannel('A').point(lambda value: 0 if value <= 8 else value)
    corner = alpha.crop((0, 0, 32, 32))
    # The generated source has a tiny isolated white gutter fragment, far from the body.
    box = corner.getbbox()
    if box is not None:
        if box[2] >= 31 or box[3] >= 31:
            raise ValueError('Corner component is not isolated; inspect before background cleanup.')
        alpha.paste(0, (0, 0, 32, 32))
    image.putalpha(alpha)
    small = image.resize((512, 512), Image.Resampling.NEAREST)
    solid = small.getchannel('A').point(lambda value: 255 if value > 64 else 0).getbbox()
    offset = (0, 438 - solid[3])
    baseline = Image.new('RGBA', (512, 512))
    baseline.alpha_composite(small, offset)
    baseline.save(ROOT / 'source/baseline.png')
    board = Image.new('RGBA', (1024, 1024))
    for i in range(4):
        board.alpha_composite(baseline, ((i % 2) * 512, (i // 2) * 512))
    for action in ['walk', 'walk_fire']:
        shutil.copyfile(ROOT / 'source/baseline.png', ROOT / action / 'source/baseline.png')
        board.save(ROOT / action / 'source/keypose_edit_board.png')
    compare = Image.new('RGB', (1024, 550), '#eceee4')
    draw = ImageDraw.Draw(compare)
    original = Image.open(ROOT / 'source/identity_005.png').convert('RGBA')
    compare.paste(original, (0, 30), original)
    compare.paste(baseline, (512, 30), baseline)
    draw.text((12, 10), '005 / PREVIOUS UPRIGHT POSTURE', fill='#59462e')
    draw.text((524, 10), '007 / HIP-LED FORWARD GUARD', fill='#59462e')
    draw.line((0, 468, 1024, 468), fill='#b7b3a5')
    compare.save(ROOT / 'reviews/posture-before-after.png')
    report = {
        'source_size': list(raw.size), 'whole_image_size': [512, 512],
        'scale': 512 / raw.width, 'resampling': 'nearest', 'offset': list(offset),
        'alpha_noise_cutoff': 8, 'isolated_corner_component_bbox': list(box) if box else None,
        'corner_cleanup_region': [0, 0, 32, 32] if box else None,
        'raw_source_retained': True, 'done_before_key_generation': True,
        'individual_pose_transform_or_fitting': False,
    }
    (ROOT / 'records/baseline-normalization.json').write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
