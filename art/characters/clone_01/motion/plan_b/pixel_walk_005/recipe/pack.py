"""Split and pack model-generated sprites; never draw or interpolate poses."""
from pathlib import Path
import argparse
import json
import shutil
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
KEYS = [2, 5, 8, 11]
GROUPS = [('keyposes', KEYS), ('inbetweens_a', [1, 3, 4, 6]), ('inbetweens_b', [7, 9, 10, 12])]
PREFIX = 'clone_01-pixel-walk'


def split_sheet(name, indices):
    raw = Image.open(ROOT / f'source/{name}.png').convert('RGBA')
    if raw.width != raw.height:
        raise ValueError('Expected one square 2x2 source sheet.')
    sheet = raw.resize((1024, 1024), Image.Resampling.NEAREST)
    cells = {}
    for cell, index in enumerate(indices):
        x, y = (cell % 2) * 512, (cell // 2) * 512
        image = sheet.crop((x, y, x + 512, y + 512))
        # Uniform removal of almost-invisible alpha noise in generated gutters.
        # Keep all source pixels in source/; do not move or resize any body part.
        image.putalpha(image.getchannel('A').point(lambda value: 0 if value <= 8 else value))
        cells[index] = image
    return cells, {'source': f'source/{name}.png', 'source_size': list(raw.size),
                   'normalized_sheet_size': [1024, 1024], 'shared_scale': 1024 / raw.width,
                   'indices': indices, 'alpha_noise_cutoff': 8, 'per_frame_fitting': False}


def keys_review():
    cells, report = split_sheet('keyposes', KEYS)
    board = Image.new('RGB', (1536, 1090), '#eceee4')
    draw = ImageDraw.Draw(board)
    baseline = Image.open(ROOT / 'source/baseline.png').convert('RGBA')
    for slot, (label, image) in enumerate([('BASELINE', baseline)] + [(f'KEY {i:02}', cells[i]) for i in KEYS]):
        x, y = (slot % 3) * 512, (slot // 3) * 545
        board.paste(image, (x, y + 28), image)
        draw.text((x + 14, y + 8), label, fill='#292e32')
        draw.line((x, y + 466, x + 512, y + 466), fill='#bbb7ac')
    board.save(ROOT / 'reviews/key-size-comparison.png')
    (ROOT / 'records/key-split.json').write_text(json.dumps(report, indent=2) + '\n')


def pack():
    gate = json.loads((ROOT / 'reviews/key-gate.json').read_text())
    if gate['status'] != 'passed':
        raise ValueError('Do not pack rejected keys.')
    output = ROOT / 'output'
    frames, processing = {}, []
    for name, indices in GROUPS:
        cells, report = split_sheet(name, indices)
        frames.update(cells)
        processing.append(report)
    for i in [0, 13]:
        shutil.copyfile(ROOT / 'source/baseline.png', output / f'fullframe/{PREFIX}_{i:02}.png')
        frames[i] = Image.open(ROOT / 'source/baseline.png').convert('RGBA')
    for i in range(1, 13):
        frames[i].save(output / f'fullframe/{PREFIX}_{i:02}.png')
    for i in KEYS:
        shutil.copyfile(output / f'fullframe/{PREFIX}_{i:02}.png', output / f'keyframe/{PREFIX}_{i:02}.png')
    atlas = Image.new('RGBA', (14 * 512, 512))
    contact = Image.new('RGB', (7 * 256, 2 * 284), '#eceee4')
    labels = ImageDraw.Draw(contact)
    for i in range(14):
        atlas.alpha_composite(frames[i], (i * 512, 0))
        thumbnail = frames[i].resize((256, 256), Image.Resampling.NEAREST)
        x, y = (i % 7) * 256, (i // 7) * 284
        contact.paste(thumbnail, (x, y + 28), thumbnail)
        labels.text((x + 12, y + 8), f'{i:02}' + (' KEY' if i in KEYS else ''), fill='#292e32')
    atlas.save(output / 'spritesheet.png')
    contact.save(output / 'contact-sheet.png')
    manifest = {
        'schema_version': 1, 'plan': 'Plan B', 'revision_id': 'plan_b_pixel_walk_005',
        'tool': '2dimg2motion / built-in image_gen', 'action': 'walk', 'facing': 'right',
        'frameCount': 14, 'keyframeIndices': KEYS, 'anchorIndices': [0, 2, 5, 8, 11, 13],
        'segmentInsertions': [1, 2, 2, 2, 1], 'canvas': {'width': 512, 'height': 512},
        'durationMs': 75, 'pixelArt': True, 'footBaseline': 438,
        'coordinateSpace': 'screen-space', 'activeLimb': 'near lighter foreground leg A; fixed depth identity',
        'activeShoulder': 'near shoulder, rear grip hand at screen-left',
        'anchorLimb': 'far dark background leg B; front support hand at screen-right',
        'weaponHand': 'near hand on rear pistol grip, far hand beneath front handguard',
        'weapon': 'M16 baked into whole-body PNG',
        'frames': [f'fullframe/{PREFIX}_{i:02}.png' for i in range(14)],
        'spritesheet': 'spritesheet.png', 'contactSheet': 'contact-sheet.png',
        'baseline': '../source/baseline.png', 'previewType': 'browser PNG sequence',
        'previewBackground': '#FFFFFF', 'gifGenerated': False,
        'status': 'draft', 'art_direction_status': 'awaiting_user_review',
        'processing': 'Model-generated poses only. Equal 2x2 cell splitting, common sheet-to-cell normalization and uniform alpha<=8 noise cleanup. Exact baseline endpoints untouched. No per-frame fitting or pose synthesis.',
        'limitations': ['M16 is included in full-body sprites.', 'Generated pixel style, no enforced fixed palette.', 'A few pixels of foot baseline jitter and cape/detail variation remain; no per-frame realignment used.', 'Motion polish and style acceptance await user review.'],
    }
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'records/packing.json').write_text(json.dumps(processing, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('stage', choices=['keys', 'pack'])
    args = parser.parse_args()
    keys_review() if args.stage == 'keys' else pack()
