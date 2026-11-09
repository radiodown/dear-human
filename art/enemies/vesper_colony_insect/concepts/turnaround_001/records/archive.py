"""Archive metadata and register existing generated PNGs; never edits image pixels."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image
from tools.agent_pipeline import validate_catalog

root = Path.cwd()
base = root / "art/enemies/vesper_colony_insect/concepts/turnaround_001"
catalog_path = root / "game/public/assets/catalog/asset_index.json"
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

runs = json.loads((base / "records/tool-runs.json").read_text(encoding="utf-8"))
files = []
for run in runs:
    path = base / "source" / (run["view"] + ".png")
    assert path.is_file() and sha(path) == sha(Path(run["path"]))
    with Image.open(path) as image:
        image.load()
        assert image.mode == "RGBA", (path, image.mode)
        alpha = image.getchannel("A")
        histogram = alpha.histogram()
        assert histogram[0] > image.width * image.height * .15
        assert alpha.getextrema()[1] >= 240
        major_bbox = alpha.point(lambda value: 255 if value > 200 else 0).getbbox()
        assert major_bbox and major_bbox[0] > 0 and major_bbox[1] > 0
        assert major_bbox[2] < image.width and major_bbox[3] < image.height
        files.append({"view": run["view"], "path": path.relative_to(root).as_posix(),
            "original_generated_path": run["path"], "width": image.width, "height": image.height,
            "mode": image.mode, "alpha_extrema": alpha.getextrema(), "transparent_pixels": histogram[0],
            "partial_alpha_pixels": sum(histogram[1:255]),
            "major_alpha_bbox": major_bbox, "bytes": path.stat().st_size,
            "sha256": sha(path), "original_byte_identical": True})
    inputs = json.loads((base / "records" / ("prompt_" + run["view"] + ".json")).read_text(encoding="utf-8"))
    run["input_reference_hashes"] = [{"path": p, "sha256": sha(Path(p))} for p in inputs["referenced_image_paths"]]
    run["duration_seconds"] = (datetime.strptime(run["end"]["current_time"], "%Y-%m-%d %H:%M:%S UTC") - datetime.strptime(run["start"]["current_time"], "%Y-%m-%d %H:%M:%S UTC")).total_seconds()
write(base / "records/file-verification.json", {"status": "passed",
    "scope": "decode_rgba_original_byte_sha256_transparent_pixels_major_contour_inside_frame",
    "files": files, "pixel_modification": "none", "art_approval": "awaiting_user_review"})
write(base / "records/generation.json", {"entity_id": "vesper_colony_insect",
    "revision_id": "turnaround_001", "conversation_date": "2026-11-09",
    "tool": "built-in image_gen.imagegen", "generation_calls": len(runs), "runs": runs,
    "saved_at_utc": datetime.now(timezone.utc).isoformat(),
    "model": None, "seed": None, "cost": None,
    "files": files, "postprocessing": "none; original alpha preserved",
    "art_direction_status": "awaiting_user_review", "runtime_integration": False})
before_bytes = catalog_path.read_bytes()
assert not (base / "records/catalog-before-registration.json").exists()
(base / "records/catalog-before-registration.json").write_bytes(before_bytes)
catalog = json.loads(before_bytes.decode("utf-8-sig"))
before_issues, _, _ = validate_catalog(root, catalog, True)
write(base / "records/catalog-issues-before.json", before_issues)
entry = next(e for e in catalog["entries"] if e["kind"] == "enemy" and e["entity_id"] == "vesper_colony_insect")
revision = json.loads((base / "records/revision-template.json").read_text(encoding="utf-8"))
entry["display_name"] = revision.pop("entity_display_name")
assert not any(r["revision_id"] == "turnaround_001" for r in entry["revisions"])
artifacts = [base / "README.md", base / "records/generation.json", base / "records/file-verification.json"]
for view in ("front", "back", "left", "right"):
    artifacts += [base / "source" / (view + ".png"), base / "records" / ("prompt_" + view + ".json"), base / "records" / ("prompt_" + view + ".md")]
revision["artifacts"] = [{"path": p.relative_to(root).as_posix(), "sha256": sha(p)} for p in artifacts]
entry["revisions"].append(revision)
entry["review_revision_id"] = "turnaround_001"
after_issues, _, _ = validate_catalog(root, catalog, True)
assert after_issues == before_issues, [issue for issue in after_issues if issue not in before_issues]
write(catalog_path, catalog)
write(base / "records/revision.json", revision)
print(json.dumps({"saved_images": len(files), "alpha_verification": "passed", "preexisting_catalog_issues": len(before_issues)}))

