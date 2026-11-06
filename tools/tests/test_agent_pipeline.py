import contextlib
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import agent_pipeline as pipeline


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="dear-human-pipeline-")
        self.root = Path(self.temp.name).resolve()
        self.assertTrue(self.root.is_relative_to(Path(tempfile.gettempdir()).resolve()))
        (self.root / "docs").mkdir()
        (self.root / "AGENTS.md").write_text("# Test workspace\n", encoding="utf-8")
        (self.root / "docs/18-preview-library-and-reuse.md").write_text("# Samples\n", encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def revision(self, name, verification="passed", dependencies=None):
        path = self.root / "fixtures" / f"{name}.bin"
        path.parent.mkdir(exist_ok=True)
        path.write_bytes(name.encode())
        return {
            "revision_id": "r001",
            "recipe_key": "same-recipe",
            "verification": verification,
            "artifacts": [{"path": path.relative_to(self.root).as_posix(), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}],
            "dependencies": dependencies or [],
        }

    def entry(self, kind, name, revision):
        return {"kind": kind, "entity_id": name, "status": "ready", "selected_revision_id": None, "revisions": [revision], "capabilities": []}

    def catalog(self, *entries):
        return {"schema_version": 1, "entries": list(entries)}

    def run_cli(self, *args):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = pipeline.main(["--root", str(self.root), *args])
        return code, json.loads(output.getvalue())

    def test_documents_report_broken_links_and_invalid_json(self):
        (self.root / "README.md").write_text('[missing](docs/missing.md)\n```json\n{"bad":}\n```\n', encoding="utf-8")
        summary, errors = pipeline.docs_check(self.root)
        self.assertEqual(summary["json_examples"], 1)
        self.assertEqual({e["code"] for e in errors}, {"json_example", "local_link"})

    def test_document_examples_do_not_create_false_links(self):
        (self.root / "README.md").write_text('```text\n[example](not-real.md)\n```\n[real](docs/18-preview-library-and-reuse.md)\n', encoding="utf-8")
        summary, errors = pipeline.docs_check(self.root)
        self.assertEqual(summary["local_links"], 1)
        self.assertEqual(errors, [])

    def test_art_prompt_documents_are_included(self):
        records = self.root / 'art/characters/clone_01/concepts/v001/records'
        records.mkdir(parents=True)
        (records / 'prompt.md').write_text('```json\n{"prompt":}\n```\n', encoding='utf-8')
        summary, errors = pipeline.docs_check(self.root)
        self.assertEqual(summary['json_examples'], 1)
        self.assertEqual([error['code'] for error in errors], ['json_example'])

    def test_planned_entries_cannot_claim_playback(self):
        entry = {"kind": "character", "entity_id": "c", "status": "planned", "revisions": [], "selected_revision_id": None, "capabilities": ["rig_playback"]}
        errors, _, _ = pipeline.validate_catalog(self.root, self.catalog(entry))
        self.assertIn("planned_ready", {e["code"] for e in errors})

    def test_selected_and_dependency_references_must_exist(self):
        rev = self.revision("c", dependencies=[{"kind": "weapon", "entity_id": "missing", "revision_id": "r999"}])
        entry = self.entry("character", "c", rev)
        entry["selected_revision_id"] = "r404"
        errors, _, _ = pipeline.validate_catalog(self.root, self.catalog(entry))
        self.assertEqual({e["code"] for e in errors}, {"selected_revision", "dependency_missing"})

    def test_artifact_hash_changes_fail_validation(self):
        rev = self.revision("c")
        (self.root / rev["artifacts"][0]["path"]).write_bytes(b"changed")
        errors, _, _ = pipeline.validate_catalog(self.root, self.catalog(self.entry("character", "c", rev)))
        self.assertIn("artifact_changed", {e["code"] for e in errors})

    def test_outside_paths_are_rejected(self):
        for path in ("../outside.bin", "https://example.test/file", "C:\\outside\\file.bin"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                pipeline.relative_file(self.root, path)

    def test_reuse_requires_passed_verification_and_unchanged_dependencies(self):
        base = self.revision("base")
        rev = self.revision("weapon", dependencies=[{"kind": "character", "entity_id": "base", "revision_id": "r001"}])
        catalog = self.catalog(self.entry("character", "base", base), self.entry("weapon", "w", rev))
        matches, errors = pipeline.find_reuse(self.root, catalog, "weapon", "w", "same-recipe")
        self.assertEqual((len(matches), errors), (1, []))
        rev["verification"] = "untested"
        self.assertEqual(pipeline.find_reuse(self.root, catalog, "weapon", "w", "same-recipe"), ([], []))
        rev["verification"] = "passed"
        (self.root / base["artifacts"][0]["path"]).write_bytes(b"changed dependency")
        matches, errors = pipeline.find_reuse(self.root, catalog, "weapon", "w", "same-recipe")
        self.assertEqual(matches, [])
        self.assertIn("artifact_changed", {e["code"] for e in errors})

    def test_dependency_cycles_are_rejected(self):
        a = self.revision("a", dependencies=[{"kind": "weapon", "entity_id": "b", "revision_id": "r001"}])
        b = self.revision("b", dependencies=[{"kind": "character", "entity_id": "a", "revision_id": "r001"}])
        errors, _, _ = pipeline.validate_catalog(self.root, self.catalog(self.entry("character", "a", a), self.entry("weapon", "b", b)))
        self.assertIn("dependency_cycle", {e["code"] for e in errors})

    def test_impact_is_transitive_and_excludes_unrelated_assets(self):
        a, b, c, d = ("character", "a", "r001"), ("weapon", "b", "r001"), ("fx", "c", "r001"), ("enemy", "d", "r001")
        result = pipeline.affected_revisions({a: [], b: [a], c: [b], d: []}, a)
        self.assertEqual({(x["kind"], x["entity_id"], x["revision_id"]) for x in result}, {b, c})

    def test_missing_and_invalid_catalogs_have_structured_results(self):
        code, result = self.run_cli("catalog-list")
        self.assertEqual((code, result["status"], result["issues"][0]["code"]), (2, "not_ready", "catalog_missing"))
        path = self.root / pipeline.DEFAULT_CATALOG
        path.parent.mkdir(parents=True)
        path.write_text('{"bad":', encoding="utf-8")
        code, result = self.run_cli("catalog-check")
        self.assertEqual((code, result["status"]), (2, "failed"))

    def test_cli_queries_are_read_only_and_impact_uses_catalog_references(self):
        base = self.revision("base")
        weapon = self.revision("weapon", dependencies=[{"kind": "character", "entity_id": "base", "revision_id": "r001"}])
        catalog = self.catalog(self.entry("character", "base", base), self.entry("weapon", "w", weapon))
        path = self.root / pipeline.DEFAULT_CATALOG
        path.parent.mkdir(parents=True)
        original = json.dumps(catalog).encode()
        path.write_bytes(original)
        for args in (
            ("catalog-check",),
            ("catalog-list", "--kind", "weapon"),
            ("reuse-find", "--kind", "weapon", "--entity-id", "w", "--recipe-key", "same-recipe"),
        ):
            code, result = self.run_cli(*args)
            self.assertEqual((code, result["status"]), (0, "ok"))
        code, result = self.run_cli("impact", "--kind", "character", "--entity-id", "base", "--revision-id", "r001")
        self.assertEqual(code, 0)
        self.assertEqual(result["items"], [{"kind": "weapon", "entity_id": "w", "revision_id": "r001"}])
        self.assertEqual(path.read_bytes(), original)
        self.assertEqual((self.root / "fixtures/base.bin").read_bytes(), b"base")


if __name__ == "__main__":
    unittest.main()
