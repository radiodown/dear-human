"""Freeze interrupted motion work and remove its unfinished runtime wiring."""
from pathlib import Path
import hashlib
import json
import shutil

PROJECT=Path.cwd()
MOTION=PROJECT/'art/characters/clone_01/motion/plan_b/fighter_motion_004'
BASE=PROJECT/'art/characters/clone_01/motion/plan_b/simple_poses_005'


def main():
    for name in ['game/index.html','game/plan-b-lab.js','game/animation/frame-sequence.js']:
        archived=MOTION/'records/runtime_snapshot_at_user_stop'/name
        archived.parent.mkdir(parents=True,exist_ok=True)
        if not archived.exists():shutil.copy2(PROJECT/name,archived)
        shutil.copy2(MOTION/'records/runtime_snapshot_before'/name,PROJECT/name)
    for name in ['game/app.js','game/index.html','game/plan-b-lab.js','game/styles.css',
                 'game/public/assets/catalog/asset_index.json','AGENTS.md','README.md']:
        archived=BASE/'records/runtime_snapshot_before'/name
        archived.parent.mkdir(parents=True,exist_ok=True)
        if archived.exists():raise FileExistsError('Do not overwrite new version snapshots.')
        shutil.copy2(PROJECT/name,archived)
    (BASE/'source').mkdir(parents=True,exist_ok=True)
    shutil.copy2(PROJECT/'art/characters/clone_01/motion/plan_b/fighter_outfit_003/output/baseline.png',BASE/'source/reference-detailed.png')
    shutil.copy2(PROJECT/'art/characters/clone_01/concepts/kneeling_fire_001/source/kneeling_fire.png',BASE/'source/reference-kneel.png')
    record={'status':'stopped_by_user','reason':'User requested simpler/slimmer static pose concept art first, no motion work yet.',
            'remaining_generation_cancelled':True,'new_motion_runtime_wiring_removed':True,
            'not_catalog_registered':True,'existing_generated_material_preserved':True,
            'delivered_motion_completion_claimed':False,
            'known_state':'Five clips packed but not browser-reviewed; kneel keys and kneel-fire keys exist; their inbetweens and final packing are unfinished.'}
    (MOTION/'records/user_stop.json').write_bytes((json.dumps(record,ensure_ascii=False,indent=2)+'\n').encode())
    print('Preserved partial motion work, restored its three consuming files, prepared the static-only version.')


if __name__=='__main__':main()
