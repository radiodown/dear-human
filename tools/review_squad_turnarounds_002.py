"""Targeted static-image browser review for the four squad members, not game tests."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PEOPLE = ["sena", "moa", "yuna", "iren"]
VIEWS = ["front", "back", "left", "right"]


def main():
    catalog_path = ROOT / "game/public/assets/catalog/asset_index.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    original = json.loads(subprocess.check_output(["git", "show", "HEAD:game/public/assets/catalog/asset_index.json"], cwd=ROOT))
    lian = lambda data: next(e for e in data["entries"] if e["entity_id"] == "clone_01" and e["kind"] == "character")
    assert lian(catalog) == lian(original), "Lian catalog entry changed"
    reports = {}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="C:/Program Files/Google/Chrome/Application/chrome.exe", headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1100}, device_scale_factor=1)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        for cid in PEOPLE:
            review = ROOT / f"art/characters/{cid}/concepts/turnaround_002/reviews"
            review.mkdir(exist_ok=True)
            wiki_url = f"http://127.0.0.1:4174/#/article/{cid}"
            page.goto(wiki_url, wait_until="networkidle")
            gallery = page.locator(".character-turnaround")
            gallery.wait_for(state="visible")
            gallery.scroll_into_view_if_needed()
            page.wait_for_function("Array.from(document.querySelectorAll('.character-turnaround img')).length === 4 && Array.from(document.querySelectorAll('.character-turnaround img')).every(i=>i.complete&&i.naturalWidth>0)")
            wiki_images = gallery.locator("figure").evaluate_all("items=>items.map(f=>({view:f.dataset.direction,src:f.querySelector('img').getAttribute('src'),link:f.querySelector('a').getAttribute('href'),width:f.querySelector('img').naturalWidth,height:f.querySelector('img').naturalHeight}))")
            assert [i["view"] for i in wiki_images] == VIEWS
            assert all(i["src"] == i["link"] and f"{cid}-turnaround-002-" in i["src"] for i in wiki_images)
            gallery.screenshot(path=str(review / "wiki-desktop.png"))
            page.set_viewport_size({"width": 500, "height": 1000})
            gallery.scroll_into_view_if_needed()
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), f"{cid}: wiki overflow"
            gallery.screenshot(path=str(review / "wiki-mobile.png"))
            page.set_viewport_size({"width": 1440, "height": 1100})
            preview_url = f"http://127.0.0.1:4173/#/samples/characters/{cid}?rev=turnaround_002"
            page.goto(preview_url, wait_until="networkidle")
            page.wait_for_function("document.querySelector('#revision-select').value==='turnaround_002' && document.querySelectorAll('#turnaround-grid img').length===4 && Array.from(document.querySelectorAll('#turnaround-grid img')).every(i=>i.complete&&i.naturalWidth>0)")
            page.locator("#art-stage").screenshot(path=str(review / "preview-gallery.png"))
            switched = []
            for view in VIEWS:
                page.locator(f'button[data-view="{view}"]').click()
                page.wait_for_function("v=>{const i=document.querySelector('#character-art');return !i.hidden&&i.complete&&i.naturalWidth>0&&i.src.includes('/'+v+'.png')}", arg=view)
                assert f"view={view}" in page.url
                switched.append(view)
            page.reload(wait_until="networkidle")
            assert page.locator('button[data-view="right"]').get_attribute("aria-pressed") == "true"
            page.locator('button[data-view="sheet"]').click()
            page.set_viewport_size({"width": 500, "height": 1000})
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), f"{cid}: preview overflow"
            page.locator("#art-stage").screenshot(path=str(review / "preview-mobile.png"))
            page.set_viewport_size({"width": 1440, "height": 1100})
            report = {"status": "passed", "recorded_at_utc": datetime.now(timezone.utc).isoformat(), "browser": "Separate local headless Chrome/Playwright after in-app runtime failed before connection (missing sandboxPolicy metadata).", "wiki_url": wiki_url, "preview_url": preview_url, "checks": ["Four wiki images decoded with correct direction labels and original links", "500px wiki and sample page without horizontal overflow", "All four sample view buttons load the corresponding PNG", "URL restores the right view after reload", "Lian catalog entry unchanged"], "wiki_images": wiki_images, "switched": switched, "page_errors": errors.copy(), "art_direction_status": "awaiting_user_review", "scope": "Static images and their display only; no game/motion regressions or new generation."}
            assert not errors, errors
            (review / "verification.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            reports[cid] = report["status"]
            entry = next(e for e in catalog["entries"] if e["entity_id"] == cid and e["kind"] == "character")
            rev = next(r for r in entry["revisions"] if r["revision_id"] == "turnaround_002")
            for artifact in rev["artifacts"]:
                assert hashlib.sha256((ROOT / artifact["path"]).read_bytes()).hexdigest() == artifact["sha256"]
            rev["verification"] = "passed"
            rev["verification_scope"] = "png_hashes_and_four_wiki_images_and_four_sample_view_buttons_url_restore_500px"
        browser.close()
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\r\n")
    print(json.dumps({"status": "passed", "members": reports, "page_errors": errors}, ensure_ascii=False))


if __name__ == "__main__":
    main()
