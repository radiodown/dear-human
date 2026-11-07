"""Record the upstream PNG-contract checks separately from combat motion/art review."""
from pathlib import Path
import argparse
import importlib.util
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parents[5]


def main(action):
    folder = ROOT / action
    manifest = json.loads((folder / 'output/manifest.json').read_text())
    prefix = 'clone_01-' + action.replace('_', '-')
    path = PROJECT / 'tools/vendor/2dimg2motion/scripts/validate_14frame_pattern.py'
    spec = importlib.util.spec_from_file_location('official_png_validator', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    issues = module.validate_pattern(
        baseline=folder / 'source/baseline.png', keyframes_dir=folder / 'output/keyframe',
        fullframes_dir=folder / 'output/fullframe', preview=folder / 'output/preview.gif', prefix=prefix,
    )
    errors = [issue for issue in issues if not issue.startswith('unstable foot baseline:') and 'preview.gif' not in issue]
    frames = [Image.open(folder / 'output' / name) for name in manifest['frames']]
    bottoms = [image.getchannel('A').point(lambda value: 255 if value > 64 else 0).getbbox()[3] for image in frames]
    start, end = manifest['loopRange']
    moving_bottoms = bottoms[start:end + 1]
    report = {
        'status': 'passed_with_limitations' if not errors else 'failed',
        'validator': 'Unmodified2dimg2motion validate_14frame_pattern.py',
        'upstream_delivery_passed': False, 'raw_issues': issues, 'png_contract_errors': errors,
        'exported_frame_count': 14, 'moving_loop_range': [start, end],
        'opaque_foot_bottoms': bottoms,
        'moving_foot_bottom_range_px': max(moving_bottoms) - min(moving_bottoms),
        'shot_indices': manifest['shotIndices'], 'frame_durations_ms': manifest['frameDurationsMs'],
        'loop_duration_ms': sum(manifest['frameDurationsMs'][start:end + 1]),
        'per_frame_fitting': False,
        'gif_omission': 'No automatic GIF generation per user instruction; browser PNG playback is the preview.',
        'scope': 'PNG count/canvas/RGBA/corners/endpoint/key identity only. Exact ground equality, motion quality and full upstream GIF delivery are not claimed.',
    }
    (folder / 'reviews/structure.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['walk_fire', 'kneel_fire'])
    main(parser.parse_args().action)
