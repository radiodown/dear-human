"""Organize model-drawn pixel art. Does not create or modify poses."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def main():
    source = Image.open(ROOT / 'source/baseline_generated.png').convert('RGBA')
    if source.size != (1024, 1536):
        raise ValueError('This recipe expects the preserved 1024 x 1536 source.')
    baseline = Image.new('RGBA', (512, 512))
    baseline.alpha_composite(source.resize((256, 384), Image.Resampling.NEAREST), (128, 64))
    baseline.save(ROOT / 'output/baseline.png')
    normalization = {
        'operation': 'One uniform nearest-neighbor baseline resize BEFORE animation generation, then fixed transparent padding. No pose changes.',
        'source_size': list(source.size), 'resized_size': [256, 384],
        'scale': .25, 'canvas': [512, 512], 'offset': [128, 64],
        'per_frame_fitting': False,
    }
    (ROOT / 'records/normalization.json').write_text(json.dumps(normalization, indent=2) + '\n')
    keys = Image.open(ROOT / 'source/keyposes.png').convert('RGBA')
    # Compare all generated cells with ONE shared sheet scale. No character fitting.
    keys = keys.resize((1024, 1024), Image.Resampling.NEAREST)
    board = Image.new('RGB', (1536, 1070), '#eceee4')
    board.paste(baseline, (0, 40), baseline)
    draw = ImageDraw.Draw(board)
    draw.text((16, 12), 'BASELINE 003', fill='#292e32')
    for i, index in enumerate([2, 5, 8, 11]):
        x, y = (i % 2) * 512, (i // 2) * 512
        cell = keys.crop((x, y, x + 512, y + 512))
        dx, dy = 512 + x, 40 + y
        board.paste(cell, (dx, dy), cell)
        draw.text((dx + 16, dy + 12), f'KEY {index:02}', fill='#292e32')
        draw.line((dx, dy + 438, dx + 512, dy + 438), fill='#bbb7ac')
    board.save(ROOT / 'reviews/baseline-key-comparison.png')


if __name__ == '__main__':
    main()
