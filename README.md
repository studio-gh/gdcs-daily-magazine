# Netlify + GitHub site update bundle

This bundle is designed to fix the live site so:

- the homepage opens the latest edition
- the current issue includes an archive link at the bottom
- previous editions are reachable through an archive page

## Upload these paths into your GitHub repo

- `index.html`
- `archives/index.html`
- `archives/2026/05/index.html`
- `archives/2026/04/index.html`
- `magazines/2026/05-01.html`
- `magazines/2026/04-30.html`

## Why this should fix the live site

- `index.html` sends the Netlify homepage to the latest issue at `/magazines/2026/05-01.html`
- `/archives/` becomes the archive landing page
- the two magazine files now include an archive link at the bottom

## Important note

Yes, if you want a year/month archive structure, a May folder should exist here:

- `archives/2026/05/`

And an April folder should exist here:

- `archives/2026/04/`
