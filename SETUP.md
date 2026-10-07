# One-time activation

After this upload, publication is unattended.

1. Extract `gdcs-daily-magazine-automated.zip`.
2. Open `https://github.com/studio-gh/gdcs-daily-magazine`.
3. Choose **Add file → Upload files**.
4. Drag the extracted folder contents into the upload area. Confirm that `.github/workflows/publish.yml` is included. On macOS, press `Command + Shift + .` if hidden folders are not visible.
5. Commit directly to `main` with the message `Install unattended Creative Intelligence publisher`.

Uploading the automation files triggers the first issue immediately. Later runs occur every day at 08:00 in São Paulo. Netlify deploys each issue from `main` through the existing repository connection.

## Verify once

Open the repository's **Actions** tab and select **Publish Creative Intelligence Magazine**. The first run should finish with a green check. The workflow still publishes through its deterministic editorial fallback when Copilot is unavailable.

No Notion database, manual story selection, API secret or recurring action is required.
