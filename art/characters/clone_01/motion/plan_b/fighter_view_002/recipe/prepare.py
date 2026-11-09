"""Preserve the previous angle and consuming sources before the revised view."""
from pathlib import Path
import shutil

BASE = Path(__file__).resolve().parents[1]
PROJECT = BASE.parents[5]


def main():
    for name in ['game/app.js', 'game/index.html', 'game/styles.css', 'game/plan-b-lab.js',
                 'game/public/assets/catalog/asset_index.json', 'AGENTS.md', 'README.md']:
        target = BASE / 'records/runtime_snapshot_before' / name
        if target.exists():
            raise FileExistsError(f'Do not overwrite the before snapshot: {target}')
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PROJECT / name, target)
    for name, source in {
        'reference-pitch30.png':'camera_pitch30_001/output/baseline.png',
        'reference-side.png':'pixel_guard_007/source/baseline.png',
    }.items():
        target = BASE / 'source' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PROJECT / 'art/characters/clone_01/motion/plan_b' / source, target)
    print('Saved pre-change sources and both image references.')


if __name__ == '__main__':
    main()
