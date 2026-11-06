from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from preview_server import resolve_asset


class PreviewPathsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='dear-human-preview-')
        self.root = Path(self.temp.name)
        for relative in ['game/index.html', 'game/.env', 'game/public/assets/catalog/asset_index.json', 'art/characters/clone_01/concept.png', 'AGENTS.md']:
            path = self.root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('fixture', encoding='utf-8')

    def tearDown(self):
        self.temp.cleanup()

    def test_frontend_art_and_existing_catalog_have_distinct_roots(self):
        for url, relative in [('/', 'game/index.html'), ('/art/characters/clone_01/concept.png?rev=1', 'art/characters/clone_01/concept.png'), ('/assets/catalog/asset_index.json', 'game/public/assets/catalog/asset_index.json')]:
            with self.subTest(url=url):
                self.assertEqual(resolve_asset(self.root, url), (self.root / relative).resolve())

    def test_traversal_dotfiles_missing_files_and_directory_listings_are_blocked(self):
        for url in ['/../AGENTS.md', '/art/%2e%2e/AGENTS.md', '/art/..%5cAGENTS.md', '/assets/../../AGENTS.md', '/.env', '/art/characters/', '/missing.png']:
            with self.subTest(url=url):
                self.assertIsNone(resolve_asset(self.root, url))


if __name__ == '__main__':
    unittest.main()
