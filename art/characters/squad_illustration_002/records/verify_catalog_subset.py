from pathlib import Path
import importlib.util
import json

root = Path(__file__).resolve().parents[4]
records = Path(__file__).parent
module_spec = importlib.util.spec_from_file_location('dear_human_pipeline', root/'tools/agent_pipeline.py')
pipeline = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(pipeline)
catalog_file = root/'game/public/assets/catalog/asset_index.json'
catalog = json.loads(catalog_file.read_text(encoding='utf-8'))
before = json.loads((records/'catalog-before-registration.json').read_text(encoding='utf-8'))
names = {'sena','moa','yuna','iren'}
assert [entry for entry in catalog['entries'] if entry['entity_id'] not in names] == before['entries']
errors, _, _ = pipeline.validate_catalog(root, catalog, check_files=False)
checked = []
for entry in catalog['entries']:
    for revision in entry['revisions']:
        if entry['entity_id'] in names or (entry['entity_id']=='clone_01' and revision['revision_id']=='reference_003_3d'):
            label = f"{entry['entity_id']}:{revision['revision_id']}"
            errors.extend(pipeline.artifact_issues(root, revision, label))
            checked.append(label)
assert not errors, errors
browser = json.loads((records/'browser-review.json').read_text(encoding='utf-8'))
assert len(browser['results']) == 8 and not browser['page_errors']
for entry in catalog['entries']:
    if entry['entity_id'] in names:
        revision = next(revision for revision in entry['revisions'] if revision['revision_id']=='illustration_002')
        revision['verification'] = 'passed'
        revision['verification_scope'] = 'png_decode_dimensions_sha256_byte_identical_wiki_copy_and_targeted_static_preview'
        revision['art_direction_status'] = 'awaiting_user_review'
catalog_file.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(records/'catalog-subset-review.json').write_text(json.dumps({'scope':'catalog structure and only the eight new revisions plus their shared original style reference; no historical revision retest','checked':checked,'issues':errors,'existing_entries_unchanged':True,'art_direction_status':'awaiting_user_review'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Catalog subset passed:',len(checked),'referenced revisions; existing entries preserved.')
