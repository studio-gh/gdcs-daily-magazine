# Creative Studio Magazine visual redesign

This update replaces seven existing repository files. It does not contain a sample issue or invented stories.

## Upload

1. Unzip the package.
2. Open `studio-gh/gdcs-daily-magazine` on GitHub and choose **Add file > Upload files**.
3. Drag the **contents** of `gdcs-magazine-visual-redesign` into the upload area. Do not drag the outer folder itself.
4. Confirm that GitHub lists the same paths shown below, then commit directly to `main`.

Files replaced:

- `.github/workflows/publish.yml`
- `automation/fetch_candidates.py`
- `automation/normalize_curation.py`
- `automation/render_site.py`
- `automation/sources.json`
- `styles.css`
- `tests/test_automation.py`

The existing publisher will run after the commit because the upload changes `automation/**`, `styles.css`, and the workflow file. When **Publish Creative Intelligence Magazine** and then **pages-build-deployment** are green, refresh the live magazine.
