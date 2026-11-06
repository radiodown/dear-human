"""Read-only, standard-library checks for the Dear Human production workspace."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path, PureWindowsPath
from urllib.parse import unquote, urlsplit

DEFAULT_CATALOG = "game/public/assets/catalog/asset_index.json"
KINDS = {"character", "weapon", "enemy", "armor", "fx"}
STATUSES = {"planned", "draft", "ready", "failed", "archived"}
FENCE = re.compile(r"^```([^\n]*)\n(.*?)^```[ \t]*$", re.M | re.S)
LINK = re.compile(r"\[[^\]]+\]\(([^\s)]+)(?:\s+\"[^\"]*\")?\)")


def issue(code, path, message):
    return {"code": code, "path": str(path), "message": message}


def relative_file(root: Path, value: str) -> Path:
    if not isinstance(value, str) or not value:
        raise ValueError("Expected a non-empty project-relative path")
    path = Path(value)
    if path.is_absolute() or PureWindowsPath(value).is_absolute() or urlsplit(value).scheme:
        raise ValueError("Absolute paths and URLs are not artifact paths")
    if ".." in path.parts or ".." in PureWindowsPath(value).parts:
        raise ValueError("Parent traversal is not allowed in artifact paths")
    resolved = (root / path).resolve()
    if not resolved.is_relative_to(root.resolve()):
        raise ValueError("Path resolves outside the project")
    return resolved


def read_json(path):
    def reject_constant(value):
        raise ValueError(f"Non-JSON constant: {value}")
    return json.loads(path.read_text(encoding="utf-8-sig"), parse_constant=reject_constant)


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def docs_check(root):
    files = list(root.glob("*.md"))
    files += list((root / "docs").rglob("*.md"))
    files += list((root / "skills").rglob("SKILL.md"))
    files += list((root / "art").rglob("*.md"))
    errors, links, examples = [], 0, 0
    for path in sorted(set(files)):
        label = path.relative_to(root).as_posix()
        if not path.resolve().is_relative_to(root.resolve()):
            errors.append(issue("outside_project", label, "Document resolves outside project"))
            continue
        content = path.read_text(encoding="utf-8-sig")
        if len(re.findall(r"^```", content, re.M)) % 2:
            errors.append(issue("code_fence", label, "Unbalanced code fences"))
        for block in FENCE.finditer(content):
            if block[1].strip() == "json":
                examples += 1
                try:
                    json.loads(block[2], parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x)))
                except ValueError as exc:
                    errors.append(issue("json_example", label, str(exc)))
        for match in LINK.finditer(FENCE.sub("", content)):
            target = match[1].strip("<>")
            if target.startswith("#") or urlsplit(target).scheme in {"http", "https", "mailto", "data", "app", "plugin"}:
                continue
            links += 1
            file_part = unquote(target.split("#", 1)[0].split("?", 1)[0])
            resolved = (path.parent / file_part).resolve()
            if not resolved.is_relative_to(root.resolve()) or not resolved.is_file():
                errors.append(issue("local_link", label, target))
    return {"documents": len(set(files)), "local_links": links, "json_examples": examples}, errors


def entry_key(entry):
    return entry["kind"], entry["entity_id"]


def revision_key(entry, revision):
    return (*entry_key(entry), revision["revision_id"])


def artifact_issues(root, revision, label):
    errors = []
    artifacts = revision.get("artifacts")
    if not isinstance(artifacts, list) or not artifacts:
        return [issue("artifacts", label, "A revision must reference real artifacts")]
    for artifact in artifacts:
        if not isinstance(artifact, dict):
            errors.append(issue("artifact", label, "Expected an artifact object"))
            continue
        expected = artifact.get("sha256", "")
        if not isinstance(expected, str) or not re.fullmatch(r"[a-f0-9]{64}", expected):
            errors.append(issue("artifact_hash", label, "Expected lowercase SHA-256"))
        try:
            path = relative_file(root, artifact.get("path"))
            if not path.is_file():
                errors.append(issue("artifact_missing", label, artifact["path"]))
            elif isinstance(expected, str) and re.fullmatch(r"[a-f0-9]{64}", expected) and sha256(path) != expected:
                errors.append(issue("artifact_changed", label, artifact["path"]))
        except (ValueError, OSError) as exc:
            errors.append(issue("artifact_path", label, str(exc)))
    return errors


def validate_catalog(root, catalog, check_files=True):
    errors, revisions, graph, entries_seen = [], {}, {}, set()
    if not isinstance(catalog, dict) or catalog.get("schema_version") != 1 or not isinstance(catalog.get("entries"), list):
        return [issue("catalog_schema", DEFAULT_CATALOG, "Expected schema_version 1 and entries array")], {}, {}
    for entry in catalog["entries"]:
        if not isinstance(entry, dict) or entry.get("kind") not in KINDS or not isinstance(entry.get("entity_id"), str) or not entry["entity_id"]:
            errors.append(issue("entity", DEFAULT_CATALOG, "Invalid kind or entity_id"))
            continue
        key = entry_key(entry)
        label = ":".join(key)
        if key in entries_seen:
            errors.append(issue("duplicate_entity", label, "Duplicate kind and entity_id"))
        entries_seen.add(key)
        versions = entry.get("revisions")
        if entry.get("status") not in STATUSES or not isinstance(versions, list):
            errors.append(issue("entity_schema", label, "Invalid status or revisions"))
            continue
        if entry["status"] == "planned" and (versions or entry.get("selected_revision_id") is not None or entry.get("capabilities")):
            errors.append(issue("planned_ready", label, "Planned entries cannot claim revisions or playback"))
        if entry["status"] != "planned" and not versions:
            errors.append(issue("empty_revisions", label, "Non-planned entries need a revision"))
        ids = set()
        for rev in versions:
            if not isinstance(rev, dict) or not isinstance(rev.get("revision_id"), str) or not rev["revision_id"]:
                errors.append(issue("revision", label, "Invalid revision_id"))
                continue
            ident = revision_key(entry, rev)
            if ident in revisions:
                errors.append(issue("duplicate_revision", label, rev["revision_id"]))
            ids.add(rev["revision_id"])
            revisions[ident] = rev
            graph[ident] = []
            verification = rev.get("verification", "untested")
            if verification not in {"untested", "passed", "failed"}:
                errors.append(issue("verification", label, "Unknown verification status"))
            if check_files:
                errors.extend(artifact_issues(root, rev, ":".join(ident)))
            deps = rev.get("dependencies", [])
            if not isinstance(deps, list):
                errors.append(issue("dependencies", label, "Expected dependencies array"))
                continue
            for dep in deps:
                if not isinstance(dep, dict) or dep.get("kind") not in KINDS or not all(isinstance(dep.get(k), str) and dep[k] for k in ("entity_id", "revision_id")):
                    errors.append(issue("dependency", label, "Invalid dependency reference"))
                    continue
                graph[ident].append((dep["kind"], dep["entity_id"], dep["revision_id"]))
        selected = entry.get("selected_revision_id")
        if selected is not None and selected not in ids:
            errors.append(issue("selected_revision", label, "Selected revision does not exist"))
    for source, dependencies in graph.items():
        for dep in dependencies:
            if dep not in revisions:
                errors.append(issue("dependency_missing", ":".join(source), ":".join(dep)))
    done, visiting = set(), set()

    def visit(node):
        if node in visiting:
            errors.append(issue("dependency_cycle", ":".join(node), "Dependency cycle"))
            return
        if node in done:
            return
        visiting.add(node)
        for dep in graph.get(node, []):
            if dep in graph:
                visit(dep)
        visiting.remove(node)
        done.add(node)

    for node in graph:
        visit(node)
    return errors, revisions, graph


def find_reuse(root, catalog, kind, entity_id, recipe_key):
    matches, errors = [], []
    index = {revision_key(e, r): r for e in catalog["entries"] for r in e["revisions"]}
    for entry in catalog["entries"]:
        if entry_key(entry) != (kind, entity_id):
            continue
        for rev in entry["revisions"]:
            if rev.get("recipe_key") == recipe_key and rev.get("verification") == "passed":
                problems, visited, pending = [], set(), [revision_key(entry, rev)]
                while pending:
                    ident = pending.pop()
                    if ident in visited:
                        continue
                    visited.add(ident)
                    dependency_revision = index.get(ident)
                    if dependency_revision is None:
                        problems.append(issue("dependency_missing", ":".join(ident), "Missing dependency revision"))
                        continue
                    problems.extend(artifact_issues(root, dependency_revision, ":".join(ident)))
                    pending.extend((d["kind"], d["entity_id"], d["revision_id"]) for d in dependency_revision.get("dependencies", []))
                errors.extend(problems)
                if not problems:
                    matches.append({"kind": kind, "entity_id": entity_id, "revision_id": rev["revision_id"], "recipe_key": recipe_key})
    return matches, errors


def affected_revisions(graph, target):
    reverse = {}
    for source, dependencies in graph.items():
        for dependency in dependencies:
            reverse.setdefault(dependency, set()).add(source)
    found, pending = set(), [target]
    while pending:
        for dependent in reverse.get(pending.pop(), set()):
            if dependent not in found:
                found.add(dependent)
                pending.append(dependent)
    found.discard(target)
    return [{"kind": k, "entity_id": e, "revision_id": r} for k, e, r in sorted(found)]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--catalog", default=DEFAULT_CATALOG)
    parser.add_argument("--limit", type=int, default=20)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("docs-check")
    commands.add_parser("catalog-check")
    listing = commands.add_parser("catalog-list")
    listing.add_argument("--kind", choices=sorted(KINDS))
    listing.add_argument("--entity-id")
    for command in ("reuse-find", "impact"):
        sub = commands.add_parser(command)
        sub.add_argument("--kind", choices=sorted(KINDS), required=True)
        sub.add_argument("--entity-id", required=True)
        sub.add_argument("--recipe-key" if command == "reuse-find" else "--revision-id", required=True)
    args = parser.parse_args(argv)
    root = args.root.resolve()
    result = {"schema_version": 1, "command": args.command, "status": "ok", "summary": {}, "items": [], "issues": []}
    code = 0
    try:
        if args.limit < 1 or not (root / "AGENTS.md").is_file() or not (root / "docs/18-preview-library-and-reuse.md").is_file():
            raise ValueError("Use a positive limit and the project root containing AGENTS.md and docs/18")
        if args.command == "docs-check":
            result["summary"], result["issues"] = docs_check(root)
        else:
            catalog_path = relative_file(root, args.catalog)
            if not catalog_path.is_file():
                result["status"] = "not_ready"
                result["issues"] = [issue("catalog_missing", args.catalog, "Catalog has not been initialized")]
                code = 2
            else:
                catalog = read_json(catalog_path)
                errors, revisions, graph = validate_catalog(root, catalog, args.command == "catalog-check")
                result["issues"] = errors
                result["summary"] = {"entities": len(catalog.get("entries", [])) if isinstance(catalog, dict) else 0, "revisions": len(revisions)}
                if not errors:
                    if args.command == "catalog-list":
                        result["items"] = [{"kind": e["kind"], "entity_id": e["entity_id"], "status": e["status"], "revision_count": len(e["revisions"]), "selected_revision_id": e.get("selected_revision_id")} for e in catalog["entries"] if (not args.kind or e["kind"] == args.kind) and (not args.entity_id or e["entity_id"] == args.entity_id)]
                    elif args.command == "reuse-find":
                        result["items"], result["issues"] = find_reuse(root, catalog, args.kind, args.entity_id, args.recipe_key)
                    elif args.command == "impact":
                        target = (args.kind, args.entity_id, args.revision_id)
                        if target not in revisions:
                            raise ValueError("Requested revision does not exist")
                        result["items"] = affected_revisions(graph, target)
        if result["issues"] and code == 0:
            result["status"], code = "failed", 1
    except (ValueError, OSError, TypeError, RecursionError) as exc:
        result["status"], code = "failed", 2
        result["issues"] = [issue("input_error", str(root), str(exc))]
    result["summary"].update({"item_count": len(result["items"]), "issue_count": len(result["issues"])})
    result["items"] = result["items"][:args.limit]
    result["issues"] = result["issues"][:args.limit]
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return code


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
