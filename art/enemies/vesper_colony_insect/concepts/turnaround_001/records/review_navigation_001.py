"""Verify navigation from the sample-library home after adding the creature menu."""
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path.cwd()
base = root / "art/enemies/vesper_colony_insect/concepts/turnaround_001"
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="C:/Program Files/Google/Chrome/Application/chrome.exe", headless=True)
    page = browser.new_page(viewport={"width": 1500, "height": 1050}, device_scale_factor=1)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto("http://127.0.0.1:4173/", wait_until="domcontentloaded")
    creature = page.locator('a[data-nav="enemy"][data-entity="vesper_colony_insect"]')
    creature.wait_for(state="visible")
    creature.click()
    page.locator("#turnaround-grid img").first.wait_for(state="attached")
    page.locator("#turnaround-grid img").evaluate_all("(images) => Promise.all(images.map(image => image.decode()))")
    assert page.locator("#turnaround-grid img").count() == 4
    assert page.locator("#revision-select").input_value() == "turnaround_001"
    assert page.locator("a.nav-item.current").count() == 1
    assert "current" in creature.get_attribute("class")
    assert not page.locator("#error").is_visible()
    page.locator('[data-bg="grid"]').click()
    page.screenshot(path=str(base / "reviews/navigation-001.png"), full_page=True)
    page.locator("#revision-select").select_option("illustration_001")
    page.locator("#character-art").evaluate("(image) => image.decode()")
    assert page.locator("#character-art").get_attribute("src").endswith("/illustration.png")
    page.locator('a[data-nav="enemy"][data-entity="swarm_creature_melee"]').click()
    page.locator("#empty-state").wait_for(state="visible")
    assert page.locator("a.nav-item.current").count() == 1
    creature.click()
    page.locator("#turnaround-grid").wait_for(state="visible")
    page.locator("#turnaround-grid img").evaluate_all("(images) => Promise.all(images.map(image => image.decode()))")
    assert page.locator("#revision-select").input_value() == "turnaround_001"
    browser.close()
report = {"status": "passed" if not errors else "failed",
    "browser": "headless local Chrome; in-app browser connection unavailable earlier in this session",
    "checks": ["home menu opens creature", "latest four-view revision is default", "four images decode",
        "only selected enemy menu highlighted", "original concept accessible", "previous planned enemy remains accessible"],
    "page_errors": errors,
    "source_sha256": {str(p): hashlib.sha256((root / p).read_bytes()).hexdigest() for p in ("game/app.js", "game/index.html")},
    "scope": "navigation and static creature view only"}
(base / "reviews/navigation-001.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report))

