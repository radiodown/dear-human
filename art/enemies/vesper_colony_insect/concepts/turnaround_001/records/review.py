"""Small static-gallery review using local Chrome after the in-app browser failed."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path.cwd()
base = root / "art/enemies/vesper_colony_insect/concepts/turnaround_001"
reviews = base / "reviews"
reviews.mkdir(exist_ok=True)
url = "http://127.0.0.1:4173/#/samples/enemies/vesper_colony_insect?rev=turnaround_001"
errors = []
checks = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="C:/Program Files/Google/Chrome/Application/chrome.exe", headless=True)
    page = browser.new_page(viewport={"width": 1500, "height": 1060}, device_scale_factor=1)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url, wait_until="domcontentloaded", timeout=20000)
    page.locator("#turnaround-grid img").first.wait_for(state="attached", timeout=15000)
    page.locator("#turnaround-grid img").evaluate_all("(images) => Promise.all(images.map(image => image.decode()))")
    assert page.locator("#turnaround-grid img").count() == 4
    assert not page.locator("#error").is_visible()
    assert page.locator("#turnaround-grid").is_visible()
    page.locator('[data-bg="grid"]').click()
    checks.append("four original images decode in existing gallery on checker background")
    page.locator("#art-stage").screenshot(path=str(reviews / "gallery.png"))
    for view in ("front", "back", "left", "right"):
        page.locator('[data-view="' + view + '"]').click()
        page.locator("#character-art").evaluate("(image) => image.decode()")
        assert page.locator("#character-art").is_visible()
        assert page.locator("#character-art").get_attribute("src").endswith("/" + view + ".png")
        assert "view=" + view in page.url
        checks.append(view + " button and URL")
    page.locator('[data-bg="light"]').click()
    page.locator("#art-stage").screenshot(path=str(reviews / "right-light.png"))
    page.reload(wait_until="domcontentloaded")
    page.locator("#character-art").wait_for(state="visible")
    page.locator("#character-art").evaluate("(image) => image.decode()")
    assert "view=right" in page.url
    checks.append("right view survives reload")
    page.locator("#revision-select").select_option("illustration_001")
    page.locator("#character-art").evaluate("(image) => image.decode()")
    assert page.locator("#character-art").get_attribute("src").endswith("/illustration.png")
    checks.append("original concept version still available")
    page.locator("#revision-select").select_option("turnaround_001")
    page.locator('button[data-view="sheet"]').click()
    page.set_viewport_size({"width": 500, "height": 1000})
    page.locator("#turnaround-grid img").evaluate_all("(images) => Promise.all(images.map(image => image.decode()))")
    page.locator("#art-stage").screenshot(path=str(reviews / "gallery-500.png"))
    assert page.locator("#turnaround-grid").is_visible()
    checks.append("500px gallery display")
    browser.close()
report = {"status": "passed" if not errors else "failed", "scope": "static_gallery_view_buttons_url_restore_original_version_alpha_background",
    "browser": "separate headless local Chrome; in-app browser failed before connection: missing sandboxPolicy",
    "url": url, "checks": checks, "page_errors": errors, "art_approval": "awaiting_user_review",
    "excluded": ["motion", "gameplay", "exact_3d_anatomy"]}
(reviews / "browser.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=True))

