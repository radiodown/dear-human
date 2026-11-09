"""Apply recorded image_gen outputs for the four squad turnarounds; never generates images."""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
VIEWS = {"front": "정면", "back": "후면", "left": "좌측면", "right": "우측면"}
PEOPLE = {"sena": ("세나", "illustration_004"), "moa": ("모아", "illustration_007"), "yuna": ("유나", "illustration_008"), "iren": ("아렌", "face_original_sample_011")}


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    newline = original_newline(path) if path.name == "asset_index.json" else "\n"
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline=newline)


def original_newline(path):
    result = subprocess.run(["git", "show", f"HEAD:{path.relative_to(ROOT).as_posix()}"], cwd=ROOT, capture_output=True)
    return "\r\n" if result.returncode == 0 and b"\r\n" in result.stdout else "\n"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rel(path):
    return path.relative_to(ROOT).as_posix()


def dimensions(path):
    with Image.open(path) as image:
        image.load()
        return image.size


def main():
    catalog_path = ROOT / "game/public/assets/catalog/asset_index.json"
    catalog = read(catalog_path)
    media = {}
    for cid, (name, dependency) in PEOPLE.items():
        base = ROOT / f"art/characters/{cid}/concepts/turnaround_002"
        records, source = base / "records", base / "source"
        source.mkdir(exist_ok=True)
        outputs, reused = [], []
        for view, title in VIEWS.items():
            target = source / f"{view}.png"
            job_path = records / f"tool_{view}.json"
            repaired = records / f"tool_{view}_repair.json"
            if job_path.is_file():
                job = read(job_path)
                original = Path(job["original_output_path"])
                if repaired.is_file():
                    shutil.copy2(original, source / f"attempt-{view}-cape.png")
                    job = read(repaired)
                    original = Path(job["original_output_path"])
                shutil.copy2(original, target)
                assert sha(original) == sha(target)
            else:
                assert cid == "sena" and view != "right"
                original = ROOT / f"art/characters/sena/concepts/turnaround_001/source/{view}.png"
                shutil.copy2(original, target)
                reused.append({"view": view, "path": rel(original), "sha256": sha(original)})
            width, height = dimensions(target)
            wiki_target = ROOT / f"wiki/public/assets/characters/{cid}-turnaround-002-{view}.png"
            shutil.copy2(target, wiki_target)
            outputs.append({"view": view, "path": rel(target), "sha256": sha(target), "width": width, "height": height, "wiki_path": rel(wiki_target), "wiki_byte_identical": sha(target) == sha(wiki_target)})
        jobs = [read(p) for p in sorted(records.glob("tool_*.json"))]
        for job in jobs:
            job["inputs"] = [{"path": value, "sha256": sha(Path(value))} for value in job["args"].get("referenced_image_paths", [])]
        generation = {"schema_version": 1, "entity_id": cid, "revision_id": "turnaround_002", "tool": "built-in image_gen", "calls": len(jobs), "model": None, "cost": None, "unexposed_fields": "Exact model and cost not exposed by the tool.", "generations": [{key: j.get(key) for key in ["dir", "started_at_utc", "finished_at_utc", "original_output_path", "inputs"]} for j in jobs], "reused": reused, "outputs": outputs, "visual_review": "Separate front/back/left-facing/right-facing full-body concepts. Neutral empty hands; current hair and face direction applied. Moa cape corrections, when present, replace rejected cape attempts. Rear details and exact cross-view proportions remain subject to user art review.", "art_direction_status": "awaiting_user_review", "unchanged": ["Lian assets and article", "gameplay", "existing motion", "previous originals"]}
        write(records / "generation.json", generation)
        entry = next(e for e in catalog["entries"] if e["kind"] == "character" and e["entity_id"] == cid)
        master = next(r for r in entry["revisions"] if r["revision_id"] == dependency)
        artifacts = [{"path": rel(p), "sha256": sha(p)} for p in sorted(source.glob("*.png")) + sorted(records.glob("*.json")) + sorted(records.glob("*.md"))]
        revision = {"revision_id": "turnaround_002", "display_name": f"{name} · 현재 외형 앞뒤좌우 002", "status": "draft", "verification": "untested", "art_direction_status": "awaiting_user_review", "recipe_key": f"{cid}-turnaround-002", "artifacts": artifacts, "dependencies": [{"kind": "character", "entity_id": cid, "revision_id": dependency}], "description": f"{name}의 현재 외형을 반영한 정면·후면·좌측면·우측면 전신 시안. 손에 든 장비를 뺀 중립 자세이며 복장·부착 장비를 확인한다. 리안·기존 모션·게임은 유지한다.", "appearance_specs": master.get("appearance_specs", []) + [["보기", "정면·후면·좌측면·우측면"], ["자세", "중립 서기 · 빈손"]], "palette": master.get("palette", []), "review_notes": [f"내장 image_gen {len(jobs)}회 · 원본 및 실패 시도 보존", "세나의 기존 정면·후면·좌측면 세 장은 원본 바이트 재사용" if cid == "sena" else "최신 얼굴·헤어를 기준으로 새 다방향 제작", "방향별 얼굴·신체 비례·장식·가림 세부는 사용자 검수 대기", "좌·우는 화면에서 바라보는 방향 기준이며 이미지를 단순 반전하지 않음"], "preview": {"image_path": outputs[0]["path"], "width": outputs[0]["width"], "height": outputs[0]["height"], "views": list(VIEWS), "images": {o["view"]: {"image_path": o["path"], "width": o["width"], "height": o["height"]} for o in outputs}, "type": "concept_image", "production_ready_cutout": False}}
        entry["revisions"] = [r for r in entry["revisions"] if r["revision_id"] != "turnaround_002"] + [revision]
        entry["review_revision_id"] = "turnaround_002"
        article_path = ROOT / f"wiki/content/articles/{cid}.md"
        raw = article_path.read_text(encoding="utf-8")
        _, front, body = raw.split("---", 2)
        metadata = {line.split(":", 1)[0]: json.loads(line.split(":", 1)[1]) for line in front.splitlines() if line.strip()}
        metadata["turnaround"] = [{"view": o["view"], "src": f"assets/characters/{cid}-turnaround-002-{o['view']}.png", "title": VIEWS[o["view"]], "alt": f"{name} 현재 외형 {VIEWS[o['view']]} 전신", "width": o["width"], "height": o["height"]} for o in outputs]
        metadata["portrait"] = {"src": metadata["turnaround"][0]["src"], "alt": f"{name} 현재 외형 정면 전신", "caption": f"{name} · 앞뒤좌우 002 정면 · 세부 검수 대기 · 누르면 크게 보기", "width": outputs[0]["width"], "height": outputs[0]["height"]}
        metadata["profile"]["note"] = "외형상 25~26세와 각성 후 활동 기간은 별개다. 현재 전신은 앞뒤좌우 002이며, 방향별 얼굴·장식·비례의 세부 일치도는 검수 대기다. 이전 원화와 장비·모션은 보존한다."
        citation = "2026-11-09 사용자 요청 · 리안 제외 네 대원 앞뒤좌우 적용"
        if citation not in metadata["sources"]:
            metadata["sources"].append(citation)
        if cid == "iren":
            for field in metadata["profile"]["fields"]:
                if field[0] == "얼굴 표현":
                    field[1] = "011 고유 얼굴을 적용한 전신 002 · 세부 검수 대기"
            avatar = ROOT / "wiki/public/assets/characters/iren-face-011.png"
            shutil.copy2(ROOT / "art/characters/iren/concepts/face_original_sample_011/source/portrait.png", avatar)
            aw, ah = dimensions(avatar)
            metadata["avatar"] = {"src": "assets/characters/iren-face-011.png", "alt": "아렌의 현재 고유 얼굴 011", "width": aw, "height": ah, "fit": "cover"}
            body = body.replace("위에 표시하는 전신 005와 얼굴 아이콘은 이전 외형을 기록한 그림이다. 새 상반신 샘플만으로 전신·아이콘을 교체하지 않았으며, 기존 그림은 보존한다.", "현재 전신은 011 고유 얼굴을 적용한 앞뒤좌우 002다. 작은 인물 표시는 011 원본을 화면의 정사각형 틀에 맞춰 표시하며, 원본 픽셀은 수정하지 않았다. 전신 005와 이전 아이콘은 과거 외형 기록으로 보존한다.")
        notice = "현재 전신은 **앞뒤좌우 002**다. 손에 든 무기·방패를 뺀 중립 자세로 정면·후면·좌측면·우측면을 위 갤러리에서 확인할 수 있다. 병과별 복장과 부착 장비를 유지하며, 이 보기만으로 장비 설정이나 게임 동작을 바꾸지 않는다. 방향별 세부 일치도는 검수 대기다."
        heading = "## 외형과 전투복\n"
        if notice not in body:
            assert heading in body
            body = body.replace(heading, heading + "\n" + notice + "\n", 1)
        body = body.replace("최신 전신 007은", "이전 전신 007은").replace("현재 전신과 얼굴 아이콘은 이 채택 샘플을 적용해 다시 생성한 **008**이다.", "이전 전신과 현재 얼굴 아이콘 **008**은 이 채택 샘플을 적용한 결과다.")
        article_path.write_text("---\n" + "\n".join(f"{k}: {json.dumps(v, ensure_ascii=False, separators=(',', ':'))}" for k, v in metadata.items()) + "\n---" + body, encoding="utf-8", newline=original_newline(article_path))
        media[cid] = generation
    write(catalog_path, catalog)
    write(ROOT / "wiki/content/media/squad-turnaround-002.json", {"schema_version": 1, "characters": media, "note": "Wiki copies retain the source PNG bytes. Lian excluded."})
    print(json.dumps({"characters": list(PEOPLE), "views": len(PEOPLE) * len(VIEWS), "calls": sum(m["calls"] for m in media.values())}, ensure_ascii=False))


if __name__ == "__main__":
    main()
