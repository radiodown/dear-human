"""Organize model-drawn combat frames; do not draw, warp or interpolate poses."""
from pathlib import Path
import argparse
import json
import shutil
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
KEYS = [2, 5, 8, 11]
GROUPS = [('keyposes', KEYS), ('inbetweens_a', [1, 3, 4, 6]), ('inbetweens_b', [7, 9, 10, 12])]


def split_sheet(folder, name, indices):
    raw = Image.open(folder / f'source/{name}.png').convert('RGBA')
    if raw.width != raw.height:
        raise ValueError('Expected one square 2x2 source sheet.')
    sheet = raw.resize((1024, 1024), Image.Resampling.NEAREST)
    cells = {}
    for slot, index in enumerate(indices):
        x, y = (slot % 2) * 512, (slot // 2) * 512
        image = sheet.crop((x, y, x + 512, y + 512))
        image.putalpha(image.getchannel('A').point(lambda value: 0 if value <= 8 else value))
        cells[index] = image
    return cells, {'source': f'source/{name}.png', 'source_size': list(raw.size),
                   'normalized_sheet_size': [1024, 1024], 'shared_scale': 1024 / raw.width,
                   'alpha_noise_cutoff': 8, 'indices': indices, 'per_frame_fitting': False}


def keys_review(folder):
    cells, report = split_sheet(folder, 'keyposes', KEYS)
    baseline = Image.open(folder / 'source/baseline.png').convert('RGBA')
    board = Image.new('RGB', (1536, 1090), '#eceee4')
    draw = ImageDraw.Draw(board)
    for slot, (label, image) in enumerate([('BASELINE', baseline)] + [(f'KEY {i:02}', cells[i]) for i in KEYS]):
        x, y = (slot % 3) * 512, (slot // 3) * 545
        board.paste(image, (x, y + 28), image)
        draw.text((x + 14, y + 8), label, fill='#292e32')
        draw.line((x, y + 466, x + 512, y + 466), fill='#bbb7ac')
    board.save(folder / 'reviews/key-size-comparison.png')
    (folder / 'records/key-split.json').write_text(json.dumps(report, indent=2) + '\n')


def pack(folder, action):
    gate = json.loads((folder / 'reviews/key-gate.json').read_text())
    if gate['status'] != 'passed':
        raise ValueError('Do not pack rejected key poses.')
    prefix = 'clone_01-' + action.replace('_', '-')
    output = folder / 'output'
    frames, processing = {}, []
    for name, indices in GROUPS:
        cells, report = split_sheet(folder, name, indices)
        frames.update(cells)
        processing.append(report)
    for i in [0, 13]:
        shutil.copyfile(folder / 'source/baseline.png', output / f'fullframe/{prefix}_{i:02}.png')
        frames[i] = Image.open(folder / 'source/baseline.png').convert('RGBA')
    for i in range(1, 13):
        frames[i].save(output / f'fullframe/{prefix}_{i:02}.png')
    for i in KEYS:
        shutil.copyfile(output / f'fullframe/{prefix}_{i:02}.png', output / f'keyframe/{prefix}_{i:02}.png')
    shots = [2, 8] if action == 'walk_fire' else []
    atlas = Image.new('RGBA', (14 * 512, 512))
    contact = Image.new('RGB', (7 * 256, 2 * 284), '#eceee4')
    labels = ImageDraw.Draw(contact)
    for i in range(14):
        atlas.alpha_composite(frames[i], (i * 512, 0))
        thumbnail = frames[i].resize((256, 256), Image.Resampling.NEAREST)
        x, y = (i % 7) * 256, (i // 7) * 284
        contact.paste(thumbnail, (x, y + 28), thumbnail)
        labels.text((x + 12, y + 8), f'{i:02}' + (' SHOT' if i in shots else ' KEY' if i in KEYS else ''), fill='#292e32')
    atlas.save(output / 'spritesheet.png')
    contact.save(output / 'contact-sheet.png')
    timings = ([85, 85, 45, 100, 85, 105, 85, 80, 45, 100, 85, 105, 85, 85]
               if action == 'walk_fire' else [95] * 14)
    manifest = {
        'schema_version': 1, 'plan': 'Plan B', 'revision_id': f'plan_b_guard_007_{action}',
        'tool': '2dimg2motion / built-in image_gen', 'action': action, 'facing': 'right',
        'frameCount': 14, 'keyframeIndices': KEYS, 'anchorIndices': [0, 2, 5, 8, 11, 13],
        'segmentInsertions': [1, 2, 2, 2, 1], 'canvas': {'width': 512, 'height': 512},
        'durationMs': 85 if action == 'walk_fire' else 95, 'frameDurationsMs': timings,
        'pixelArt': True, 'footBaseline': 438, 'loopRange': [1, 12],
        'playbackFrameCount': 12, 'referenceFrameIndices': [0, 13], 'shotIndices': shots,
        'coordinateSpace': 'screen-space',
        'activeLimb': 'near lighter foreground leg A; same hip/knee/ankle chain',
        'activeShoulder': 'near shoulder; rear grip hand at screen-left',
        'anchorLimb': 'far dark background leg B; front support hand at screen-right',
        'weaponHand': 'near hand on rear pistol grip, far hand beneath front handguard',
        'weapon': 'Classic M16 baked into whole-body PNG',
        'frames': [f'fullframe/{prefix}_{i:02}.png' for i in range(14)],
        'spritesheet': 'spritesheet.png', 'contactSheet': 'contact-sheet.png',
        'baseline': '../source/baseline.png', 'previewType': 'browser PNG sequence',
        'previewBackground': '#FFFFFF', 'gifGenerated': False,
        'keyPosePrompt': '../' + gate.get('prompt', 'records/keyposes_prompt.json'),
        'status': 'draft', 'art_direction_status': 'awaiting_user_review',
        'processing': 'Model-generated poses and firing visuals. Whole-sheet common normalization, equal-cell split, uniform alpha<=8 noise cleanup and PNG packing only. No pose synthesis, per-frame fitting or limb transforms.',
        'limitations': ['Character, weapon and any firing visuals are baked into these PNGs.', 'This is an animation preview; no combat hit/ammo logic is connected.', 'Palette/grid, detailed continuity and final art acceptance remain under review.'],
    }
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (folder / 'records/packing.json').write_text(json.dumps(processing, indent=2) + '\n')
    accepted_prompt = Path(gate.get('prompt', 'records/keyposes_prompt.json')).with_suffix('.md')
    shutil.copyfile(folder / accepted_prompt, output / 'keyframe-prompts.md')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['walk', 'walk_fire'])
    parser.add_argument('stage', choices=['keys', 'pack'])
    args = parser.parse_args()
    folder = ROOT / args.action
    keys_review(folder) if args.stage == 'keys' else pack(folder, args.action)
