#!/usr/bin/env python3
"""Render the current issue, dated archive, weekly edition and RSS feed."""

from __future__ import annotations

import argparse
import html
import json
from datetime import date, datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from urllib.parse import urlsplit

SITE_URL = "https://gdcs-daily-magazine.netlify.app"


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def safe_url(value: object) -> str:
    raw = str(value or "")
    return raw if urlsplit(raw).scheme in {"http", "https"} else "#"


def story_rows(stories: list[dict]) -> str:
    return "\n".join(
        f'''<a class="signal-item reveal" href="{esc(safe_url(story.get('url')))}" target="_blank" rel="noreferrer">
          <h3>{esc(story.get('title'))}</h3>
          <div><p>{esc(story.get('summary'))}</p><p class="practical"><strong>Studio move:</strong> {esc(story.get('practical'))}</p></div>
          <span>↗</span>
        </a>'''
        for story in stories
    ) or '<p class="empty-state">No story cleared the editorial bar for this section today.</p>'


def mood_rows(stories: list[dict]) -> str:
    return "\n".join(
        f'''<a class="mood-item reveal" data-index="{index:02d}" href="{esc(safe_url(story.get('url')))}" target="_blank" rel="noreferrer">
          <h3>{esc(story.get('title'))}</h3><p>{esc(story.get('why'))}</p>
        </a>'''
        for index, story in enumerate(stories, 1)
    ) or '<p class="empty-state">No visual reference cleared the editorial bar today.</p>'


def source_rows(issue: dict) -> str:
    stories = issue.get("top_stories", []) + issue.get("campaigns", []) + issue.get("inspiration", [])
    return "\n".join(
        f'''<a class="source-item reveal" href="{esc(safe_url(story.get('url')))}" target="_blank" rel="noreferrer">
          <span>{index:02d}</span><div><strong>{esc(story.get('source_title') or story.get('title'))}</strong><small>{esc(story.get('source'))} · {esc(story.get('flag'))}</small></div>
        </a>'''
        for index, story in enumerate(stories, 1)
    )


def render_issue(issue: dict, base: str = "") -> str:
    top = issue.get("top_stories", [])
    campaigns = issue.get("campaigns", [])
    inspiration = issue.get("inspiration", [])
    lead = top[0] if top else None
    remaining = top[1:] if lead else []
    total = len(top) + len(campaigns) + len(inspiration)
    lead_html = ""
    if lead:
        lead_html = f'''<div class="feature-grid">
          <article class="feature-main reveal"><p class="story-number">01 / {esc(lead.get('company'))}</p><h3>{esc(lead.get('title'))}</h3><p>{esc(lead.get('summary'))}</p><blockquote>{esc(lead.get('why'))}</blockquote><a class="text-link" href="{esc(safe_url(lead.get('url')))}" target="_blank" rel="noreferrer">Read the source <span>↗</span></a></article>
          <aside class="feature-notes reveal"><p class="story-number">Studio implication</p><h3>{esc(lead.get('practical'))}</h3><p>{esc(lead.get('flag'))}</p></aside>
        </div>'''
    watch_items = "".join(f"<li><span>{index:02d}</span><div><strong>{esc(item)}</strong></div></li>" for index, item in enumerate(issue.get("watchlist", []), 1))
    return f'''<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#1a0503"><meta name="description" content="Creative Intelligence Magazine for {esc(issue.get('date'))}.">
  <meta property="og:title" content="{esc(issue.get('issue_title'))} | Creative Studio Magazine"><meta property="og:description" content="{esc(issue.get('editor_note'))}"><meta property="og:image" content="{SITE_URL}/assets/creative-intelligence-cover.png">
  <title>{esc(issue.get('issue_title'))} | Creative Studio Magazine</title><link rel="alternate" type="application/rss+xml" title="Creative Intelligence Magazine" href="{SITE_URL}/feed.xml">
  <link rel="preload" href="{base}assets/creative-intelligence-cover.png" as="image"><link rel="stylesheet" href="{base}styles.css">
</head><body>
  <div class="progress" aria-hidden="true"><span></span></div><header class="site-header"><a class="wordmark" href="{base}index.html"><span>CSM</span><small>Creative Studio Magazine</small></a>
    <button class="menu-button" type="button" aria-expanded="false" aria-controls="issue-nav"><span></span><span></span><span class="sr-only">Open issue navigation</span></button>
    <nav id="issue-nav" aria-label="Issue sections"><a href="#top-stories">Top stories</a><a href="#campaigns">Campaigns</a><a href="#inspiration">Inspiration</a><a href="#watchlist">Watchlist</a><a href="#source-desk">Sources</a></nav><button class="print-button" type="button" title="Print this issue" aria-label="Print this issue">↗</button>
  </header><main>
    <section class="cover" id="cover" aria-labelledby="cover-title"><img src="{base}assets/creative-intelligence-cover.png" alt="Layered acetate, paper and metal form an abstract editable working-file sculpture." fetchpriority="high"><div class="cover-shade"></div><div class="cover-meta"><p>Daily edition <span>{esc(issue.get('date'))}</span></p><p>{total} selected signals</p></div>
      <div class="cover-copy"><p class="kicker">Creative intelligence for design teams</p><h1 id="cover-title">{esc(issue.get('issue_title'))}</h1><p class="dek">{esc(issue.get('editor_note'))}</p></div><ol class="cover-lines" aria-label="Inside this issue">{''.join(f'<li><span>{i:02d}</span>{esc(story.get("title"))}</li>' for i, story in enumerate((top + campaigns)[:4], 1))}</ol><a class="scroll-cue" href="#letter"><span></span>Read the issue</a>
    </section>
    <section class="letter ruled-section" id="letter"><div class="section-index">Editor’s note <span>01</span></div><div class="letter-layout reveal"><h2>The day,<br>edited.</h2><div class="prose"><p class="dropcap">{esc(issue.get('editor_note'))}</p><p class="signoff">Generated from {esc(issue.get('candidate_count'))} candidates · {esc(issue.get('generation_method'))}</p></div></div></section>
    <section class="cover-story ruled-section" id="top-stories"><div class="section-index">Top stories <span>02</span></div><div class="story-lead reveal"><p class="eyebrow">Today’s lead</p><h2>{esc(lead.get('title') if lead else 'A selective day')}</h2><p class="standfirst">{esc(lead.get('why') if lead else 'No story cleared the lead threshold.')}</p></div>{lead_html}<div class="signal-list secondary-stories">{story_rows(remaining)}</div></section>
    <section class="signals ruled-section" id="campaigns"><div class="section-index">Campaigns to watch <span>03</span></div><div class="signals-heading reveal"><h2>Ideas that became systems.</h2><p>Brand, campaign, packaging and visual-language work worth opening.</p></div><div class="signal-list">{story_rows(campaigns)}</div></section>
    <section class="moodboard ruled-section dark-section" id="inspiration"><div class="section-index">Inspiration signals <span>04</span></div><div class="section-intro reveal"><h2>Save the move,<br>not just the image.</h2><p>Visual references with a concrete reason to keep them.</p></div><div class="moodboard-grid">{mood_rows(inspiration)}</div></section>
    <section class="watchlist ruled-section" id="watchlist"><div class="section-index">What to watch next <span>05</span></div><div class="watch-grid reveal"><h2>Keep the file open.</h2><ol>{watch_items}</ol></div></section>
    <section class="sources ruled-section" id="source-desk"><div class="section-index">Source desk <span>06</span></div><div class="sources-heading reveal"><h2>{total} stories.<br>No duplicates.</h2><p>Original reporting and primary sources used in this issue.</p></div><div class="source-list">{source_rows(issue)}</div></section>
  </main><footer><a class="wordmark" href="#cover"><span>CSM</span><small>Creative Studio Magazine</small></a><p>{esc(issue.get('date'))} · {esc(issue.get('issue_title'))}</p><a href="{base}archive/index.html">Archive ↗</a></footer><script src="{base}script.js"></script>
</body></html>'''


def render_weekly(weekly: dict, issue_date: str, base: str = "../../") -> str:
    tool_rows = "".join(f'<a class="signal-item" href="{esc(safe_url(row.get("url")))}"><h3>{esc(row.get("title"))}</h3><p><strong>{esc(row.get("recommendation"))}:</strong> {esc(row.get("note"))}</p><span>↗</span></a>' for row in weekly.get("tool_radar", []))
    signal_rows = "".join(f'<a class="signal-item" href="{esc(safe_url(row.get("url")))}"><h3>{esc(row.get("title"))}</h3><p>{esc(row.get("move"))} {esc(row.get("lesson"))}</p><span>↗</span></a>' for row in weekly.get("studio_signals", []))
    actions = "".join(f"<li>{esc(item)}</li>" for item in weekly.get("team_actions", []))
    cover = weekly.get("cover_story", {})
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{esc(weekly.get('title'))} | Creative Studio Magazine</title><link rel="stylesheet" href="{base}styles.css"></head><body><main>
    <section class="cover"><img src="{base}assets/creative-intelligence-cover.png" alt="Abstract layered working-file sculpture."><div class="cover-shade"></div><div class="cover-meta"><p>Weekly edition <span>{esc(issue_date)}</span></p></div><div class="cover-copy"><p class="kicker">Creative Studio Magazine</p><h1>{esc(weekly.get('title'))}</h1><p class="dek">{esc(weekly.get('theme'))}</p></div></section>
    <section class="letter ruled-section"><div class="section-index">Editor’s letter <span>01</span></div><div class="letter-layout"><h2>The week,<br>edited.</h2><div class="prose"><p class="dropcap">{esc(weekly.get('editors_letter'))}</p></div></div></section>
    <section class="cover-story ruled-section"><div class="section-index">Cover story <span>02</span></div><div class="story-lead"><h2>{esc(cover.get('headline'))}</h2><p class="standfirst">{esc(cover.get('dek'))}</p></div><div class="prose"><p>{esc(cover.get('body'))}</p><blockquote>{esc(cover.get('takeaway'))}</blockquote></div></section>
    <section class="signals ruled-section"><div class="section-index">Tool radar <span>03</span></div><div class="signal-list">{tool_rows}</div></section><section class="signals ruled-section"><div class="section-index">Studio signals <span>04</span></div><div class="signal-list">{signal_rows}</div></section>
    <section class="actions ruled-section"><div class="section-index">Team actions <span>05</span></div><div class="actions-grid"><h2>Take it into the studio.</h2><ol>{actions}</ol></div></section></main><footer><a class="wordmark" href="{base}index.html"><span>CSM</span><small>Creative Studio Magazine</small></a><p>{esc(weekly.get('title'))}</p><a href="{base}archive/index.html">Archive ↗</a></footer></body></html>'''


def update_history(issue: dict, history_path: Path) -> dict:
    history = json.loads(history_path.read_text()) if history_path.exists() else {"issues": []}
    stories = issue.get("top_stories", []) + issue.get("campaigns", []) + issue.get("inspiration", [])
    record = {
        "date": issue["date"],
        "title": issue["issue_title"],
        "fingerprints": [s.get("fingerprint") for s in stories],
        "urls": [s.get("url") for s in stories],
        "stories": [{key: s.get(key) for key in ("title", "url", "source", "summary", "why", "practical", "fingerprint", "flag")} for s in stories],
    }
    history["issues"] = [row for row in history.get("issues", []) if row.get("date") != issue["date"]]
    history["issues"].append(record)
    history["issues"] = history["issues"][-60:]
    history_path.parent.mkdir(parents=True, exist_ok=True)
    history_path.write_text(json.dumps(history, indent=2, ensure_ascii=False) + "\n")
    return history


def render_archive(history: dict, path: Path) -> None:
    rows = "".join(f'<a class="signal-item" href="{esc(row["date"])}/"><h3>{esc(row["title"])}</h3><p>{esc(row["date"])}</p><span>↗</span></a>' for row in reversed(history.get("issues", [])))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Archive | Creative Studio Magazine</title><link rel="stylesheet" href="../styles.css"></head><body><main><section class="signals ruled-section"><div class="section-index">Daily archive <span>{len(history.get("issues", [])):02d}</span></div><div class="signals-heading"><h2>Every edit,<br>kept open.</h2><p>Daily Creative Intelligence issues.</p></div><div class="signal-list">{rows}</div></section></main><footer><a class="wordmark" href="../index.html"><span>CSM</span><small>Creative Studio Magazine</small></a><p>Daily archive</p><a href="../feed.xml">RSS ↗</a></footer></body></html>')


def render_rss(history: dict, path: Path) -> None:
    items = []
    for row in reversed(history.get("issues", [])[-30:]):
        link = f"{SITE_URL}/archive/{row['date']}/"
        published = format_datetime(datetime.combine(date.fromisoformat(row["date"]), datetime.min.time(), tzinfo=timezone.utc))
        items.append(f"<item><title>{esc(row['title'])}</title><link>{link}</link><guid>{link}</guid><pubDate>{published}</pubDate><description>Creative Intelligence Magazine daily edition.</description></item>")
    path.write_text(f'''<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Creative Intelligence Magazine</title><link>{SITE_URL}</link><description>Daily creative intelligence for design teams.</description><language>en</language>{''.join(items)}</channel></rss>\n''')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--issue", default="data/latest.json")
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    root = Path(args.root)
    issue = json.loads(Path(args.issue).read_text())
    issue_date = issue["date"]
    history = update_history(issue, root / "data/history.json")
    (root / "index.html").write_text(render_issue(issue))
    archive_dir = root / "archive" / issue_date
    archive_dir.mkdir(parents=True, exist_ok=True)
    (archive_dir / "index.html").write_text(render_issue(issue, "../../"))
    render_archive(history, root / "archive/index.html")
    render_rss(history, root / "feed.xml")
    weekly = issue.get("weekly_issue")
    if weekly:
        iso = date.fromisoformat(issue_date).isocalendar()
        weekly_dir = root / "weekly" / f"{iso.year}-W{iso.week:02d}"
        weekly_dir.mkdir(parents=True, exist_ok=True)
        (weekly_dir / "index.html").write_text(render_weekly(weekly, issue_date))
    print(f"Rendered daily issue {issue_date} and {len(history.get('issues', []))} archive records")


if __name__ == "__main__":
    main()
