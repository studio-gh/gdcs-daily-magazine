import tempfile
import unittest
from pathlib import Path

from automation.instrument_archives import instrument


class ArchiveCurationTests(unittest.TestCase):
    def test_instrument_is_idempotent_and_uses_relative_path(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            page = root / 'archive' / '2026-01-01' / 'index.html'
            page.parent.mkdir(parents=True)
            page.write_text('<html><body>Issue</body></html>')
            self.assertEqual(instrument(root), 1)
            self.assertIn('<script src="../../curation.js"></script></body>', page.read_text())
            self.assertEqual(instrument(root), 0)


if __name__ == '__main__':
    unittest.main()
