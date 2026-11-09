"""Preserve the inputs and consuming sources before adding the elevated still."""
from pathlib import Path
import shutil

BASE = Path(__file__).resolve().parents[1]
PROJECT = BASE.parents[5]


def main():
    paths = ['game/app.js', 'game/index.html', 'game/styles.css',
             'game/plan-b-lab.js', 'game/public/assets/catalog/asset_index.json',
             'AGENTS.md', 'README.md']
    for name in paths:
        target = BASE / 'records/runtime_snapshot_before' / name
        if target.exists():
            raise FileExistsError(f'Do not overwrite the before snapshot: {target}')
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PROJECT / name, target)
    target = BASE / 'source/reference-side.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(PROJECT / 'art/characters/clone_01/motion/plan_b/pixel_guard_007/source/baseline.png', target)
    print('Preserved source reference and seven pre-change files.')


if __name__ == '__main__':
    main()
