from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image

root = Path(__file__).resolve().parents[4]
manifest = json.loads((Path(__file__).parent / 'generated-files.json').read_text(encoding='utf-8'))
for item in manifest['outputs']:
    target = root / 'art/characters' / item['id'] / 'concepts/illustration_001/source/illustration.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        raise FileExistsError(target)
    shutil.copyfile(item['source_path'], target)
    with Image.open(target) as illustration:
        illustration.verify()
    with Image.open(target) as illustration:
        size = list(illustration.size)
    record = {**item, 'project_path': target.relative_to(root).as_posix(), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'size': size, 'art_direction_status': 'rejected_by_user', 'cost': None, 'model': None, 'feedback': manifest['feedback']}
    (target.parent.parent / 'records/generation.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(item['id'], size, 'preserved')
