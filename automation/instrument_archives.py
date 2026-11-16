#!/usr/bin/env python3
"""Add the shared curation client to existing generated issue pages at build time."""
from pathlib import Path
import os


def instrument(root: Path) -> int:
    changed = 0
    for folder in (root / 'archive', root / 'weekly'):
        for page in folder.glob('*/index.html'):
            html = page.read_text(encoding='utf-8')
            if 'curation.js' in html or '</body>' not in html:
                continue
            relative = os.path.relpath(root / 'curation.js', page.parent).replace(os.sep, '/')
            html = html.replace('</body>', f'<script src="{relative}"></script></body>', 1)
            page.write_text(html, encoding='utf-8')
            changed += 1
    return changed


if __name__ == '__main__':
    print(f'Prepared {instrument(Path(__file__).resolve().parent.parent)} archived issues for curation')
