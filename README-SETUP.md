# Morning and Weekly Edition automation

This folder contains the files to automate the PMI Creative Studio Morning Edition and the Friday Weekly Edition in GitHub Actions and publish them to Netlify through your GitHub-connected repo.

## What this setup does

- Runs automatically every weekday at 9:00 AM in `America/Sao_Paulo`
- Runs a separate Friday Weekly Edition at 10:00 AM in `America/Sao_Paulo`
- Lets you run a manual test from the GitHub Actions tab
- Uses the OpenAI Responses API with the built-in `web_search` tool to gather current source material
- Generates:
  - `index.html` for the latest edition
  - `archives/YYYY/MM/YYYY-MM-DD.html` for dated back issues
  - `summaries/YYYY-MM-DD-summary.html`
  - `summaries/YYYY-MM-DD-summary.txt`
- Also generates every Friday:
  - `weekly/YYYY-W##.html`
  - `weekly/latest.html`
  - `weekly-summaries/YYYY-W##-summary.html`
  - `weekly-summaries/YYYY-W##-summary.txt`
- Commits the files back into the same repo
- Triggers Netlify to redeploy automatically from Git

## Files to upload into your repo

- `.github/workflows/publish-magazine.yml`
- `.github/workflows/publish-weekly-edition.yml`
- `package.json`
- `scripts/generate-magazine.mjs`
- `scripts/sample-edition.json`

## One-time GitHub setup

1. Open your repository on GitHub.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Click `New repository secret`.
4. Create a secret named `OPENAI_API_KEY`.
5. Paste your OpenAI API key there and save it.

You do not need to create a GitHub personal access token for commits. This workflow uses GitHub's built-in `GITHUB_TOKEN` with `contents: write`.

## Manual test

1. Upload the files listed above into the matching folders in your repo.
2. Open the `Actions` tab.
3. Open the workflow named `Publish Morning Edition`.
4. Click `Run workflow`.
5. Leave `run_date` blank, or set a test date like `2026-04-30`.
6. Run it.

If the run succeeds:

- `index.html` will update
- a new archive file will appear under `archives/`
- the summary files will appear under `summaries/`
- Netlify will redeploy automatically from the push

## Weekly Friday test

1. Open the `Actions` tab.
2. Open the workflow named `Publish Weekly Edition`.
3. Click `Run workflow`.
4. Leave `run_date` blank, or set a Friday date if you want a tidy test.
5. Run it.

If the run succeeds:

- a new weekly file will appear under `weekly/`
- `weekly/latest.html` will update
- the weekly summary files will appear under `weekly-summaries/`
- Netlify will redeploy automatically from the push

## Important note about source images

The generator tries to download source images locally into `images/YYYY-MM-DD/` and rewrites the HTML to use those local files. If a source blocks direct download, the script falls back to the original image URL.

That means most editions should be more reliable than the first manual prototype, but a few source hosts may still occasionally block previews.

## Readability updates included

- Body text is lighter and a touch airier, so it should feel easier to read.
- On mobile, the jump-to-section area is smaller, less sticky, and turns into a compact horizontal chip list so it does not dominate the screen.
