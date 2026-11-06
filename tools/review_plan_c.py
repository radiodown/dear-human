"""Explicit Plan C readiness probe on the existing sample page; no app integration."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:4173')
    parser.add_argument('--chrome', default='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    source_paths = [
        'game/plan-c/package.json', 'game/plan-c/package-lock.json',
        'game/plan-c/part-mesh.js', 'game/plan-c/browser-probe.js', 'tools/review_plan_c.py',
        'art/characters/clone_01/motion/rig_005/rig/parts.json',
    ]
    definition = json.loads((root / source_paths[-1]).read_text())
    source_paths.extend(a['path'] for a in definition['atlases'].values())
    digest = lambda p: hashlib.sha256((root / p).read_bytes()).hexdigest()
    before = {p: digest(p) for p in source_paths}
    args.output.mkdir(parents=True, exist_ok=True)
    errors, external_requests = [], []
    origin = urlsplit(args.base_url).netloc
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chrome, headless=True)
        page = browser.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('request', lambda r: external_requests.append(r.url) if urlsplit(r.url).scheme in {'http', 'https'} and urlsplit(r.url).netloc != origin else None)
        page.goto(args.base_url + '/#/samples/characters/clone_01')
        result = page.evaluate("""async () => {
            const probe = await import('/plan-c/browser-probe.js');
            return await probe.runBrowserProbe();
        }""")
        result['browser'] = browser.version
        browser.close()
    assert before == {p: digest(p) for p in source_paths}, 'Probe sources changed during review'
    assert not errors, errors
    assert not external_requests, external_requests
    captures = []
    for capture in result.pop('captures', []):
        target = args.output / (capture['name'] + '.png')
        target.write_bytes(base64.b64decode(capture['png'].split(',', 1)[1]))
        captures.append({'path': str(target), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
    result.update({'captures': captures, 'page_errors': errors, 'external_requests': external_requests,
                   'source_hashes': [{'path': p, 'sha256': h} for p, h in before.items()]})
    (args.output / 'browser.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: result[k] for k in ['status', 'three_revision', 'browser']}, ensure_ascii=False))
    if result['status'] != 'passed':
        raise SystemExit(1)


if __name__ == '__main__':
    main()
