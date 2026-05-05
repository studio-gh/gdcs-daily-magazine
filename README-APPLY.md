# Apply this bundle

This bundle is meant to replace the repo's current mixed publishing setup with one clean workflow.

## Upload or replace these files

- `.github/workflows/publish-magazine.yml`
- `.github/workflows/publish-weekly-edition.yml`
- `package.json`
- `scripts/generate-magazine.mjs`
- `scripts/sample-edition.json`
- `README-SETUP.md`

## Remove these outdated files and folders from the current repo

Remove these because they belong to the older manual `magazines/` publishing path and conflict with the newer `archives/` workflow:

- `magazines/`
- `2026-05-05.html`

Remove these generated archive landing pages if they still contain links to `/magazines/...`:

- `archives/index.html`
- `archives/2026/04/index.html`
- `archives/2026/05/index.html`

The generator in this bundle will recreate archive landing pages automatically on the next daily run.

## Keep these folders

- `archives/`
- `summaries/`
- `weekly/`
- `weekly-summaries/`
- `images/`
- `.github/workflows/`
- `scripts/`

## What the repo should look like after cleanup

Daily edition outputs:

- `index.html`
- `archives/YYYY/MM/YYYY-MM-DD.html`
- `archives/index.html`
- `archives/YYYY/MM/index.html`
- `summaries/YYYY-MM-DD-summary.html`
- `summaries/YYYY-MM-DD-summary.txt`
- `images/YYYY-MM-DD/...`

Weekly edition outputs:

- `weekly/YYYY-W##.html`
- `weekly/latest.html`
- `weekly-summaries/YYYY-W##-summary.html`
- `weekly-summaries/YYYY-W##-summary.txt`

## Recommended order

1. Upload the replacement files from this bundle.
2. Delete the outdated files and folders listed above from the repo.
3. Add the `OPENAI_API_KEY` GitHub secret if it is not already present.
4. Run `Publish Morning Edition` manually once.
5. Confirm that `index.html`, the new `archives/...` file, and the archive landing pages all update together.
