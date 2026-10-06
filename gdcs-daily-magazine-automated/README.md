# Creative Studio Magazine

An unattended editorial website for design, creative technology, campaigns and visual culture. The repository ships with Week 40, **The Work Stays Open**, and a daily publishing system that no longer depends on Notion or manual story selection.

## Run locally

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Automatic publishing

GitHub Actions runs every day at 11:00 UTC (08:00 in São Paulo). It:

1. Collects fresh RSS and Google News candidates from design-native and primary sources.
2. Deduplicates and prepares an evidence-bound candidate pool.
3. Uses GitHub Copilot CLI to apply the editorial contract in `automation/editorial_prompt.md`.
4. Falls back to deterministic, source-bound selection if Copilot is unavailable.
5. Generates the homepage, dated archive, compact history and `feed.xml`.
6. Generates a weekly magazine on Fridays.
7. Commits the issue to `main`, which triggers the connected Netlify deployment.

The workflow can also be run from **Actions → Publish Creative Intelligence Magazine → Run workflow**. It runs once immediately after the automation files are first uploaded.

The `studio-gh` organization should allow Copilot CLI in Actions. If it does not, the deterministic fallback still publishes a source-linked issue.

## Deploy

The site is static and can be deployed directly to Netlify or GitHub Pages. No build command is required; publish the repository root.

## Editorial system

- Visual thesis: a tactile, tangerine working-file aesthetic with strong magazine typography.
- Content plan: cover, editor's letter, cover story, tool radar, studio signals, practical move, debate, moodboard, watchlist, actions and source desk.
- Interaction thesis: reading progress, restrained section reveals and active issue navigation.
