"""Preserve the prior sprite, costume illustrations, and consuming sources."""
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
    references = {
        'reference-fighter.png':'art/characters/clone_01/motion/plan_b/fighter_view_002/output/baseline.png',
        'reference-approved.png':'art/characters/clone_01/concepts/reference_003_3d/source/appearance.png',
        'reference-front.png':'art/characters/clone_01/concepts/turnaround_001/source/front.png',
    }
    for name, source in references.items():
        target = BASE / 'source' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PROJECT / source, target)
    print('Saved pre-change sources and all three generation references.')


if __name__ == '__main__':
    main()
