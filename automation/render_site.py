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

SITE_URL = "https://studio-gh.github.io/gdcs-daily-magazine"


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def safe_url(value: object) -> str:
    raw = str(value or "")
    return raw if urlsplit(raw).scheme in {"http", "https"} else "#"


def image_url(story: dict, base: str = "") -> str:
    raw = str(story.get("image") or "")
    if urlsplit(raw).scheme in {"http", "https"}:
        return raw
    if raw.startswith("assets/"):
        return f"{base}{raw}"
    return f"{base}assets/creative-intelligence-cover.png"


def story_rows(stories: list[dict], base: str = "") -> str:
    return "\n".join(
        f'''<a class="department-story reveal" href="{esc(safe_url(story.get('url')))}" target="_blank" rel="noreferrer">
          <figure><img src="{esc(image_url(story, base))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='{base}assets/creative-intelligence-cover.png'"><figcaption>{esc(story.get('source'))}</figcaption></figure>
          <div class="department-copy"><p class="story-label">{esc(story.get('flag'))}</p><h3>{esc(story.get('title'))}</h3><p>{esc(story.get('summary'))}</p><p class="studio-move">{esc(story.get('practical'))}</p></div>
          <span class="story-arrow">↗</span>
        </a>'''
        for story in stories
    ) or '<p class="empty-state">No story cleared the editorial bar for this department today.</p>'


def mood_rows(stories: list[dict], base: str = "") -> str:
    return "\n".join(
        f'''<a class="mood-item reveal" data-index="{index:02d}" href="{esc(safe_url(story.get('url')))}" target="_blank" rel="noreferrer">
          <img src="{esc(image_url(story, base))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='{base}assets/creative-intelligence-cover.png'"><span class="mood-shade"></span>
          <div><p>{esc(story.get('source'))}</p><h3>{esc(story.get('title'))}</h3><small>{esc(story.get('why'))}</small></div>
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
    front = top[1:5] if lead else top[:4]
    department_pool = top[5:] + campaigns if lead else top[4:] + campaigns
    total = len(top) + len(campaigns) + len(inspiration)
    departments = {beat: [] for beat in ("Graphic design", "Motion + video", "Social + campaigns", "Tools + workflow")}
    for story in department_pool:
        departments.setdefault(story.get("beat") or "Tools + workflow", []).append(story)
    lead_image = image_url(lead or {}, base)
    front_html = "".join(
        f'''<a class="front-story reveal" href="{esc(safe_url(story.get('url')))}" target="_blank" rel="noreferrer"><figure><img src="{esc(image_url(story, base))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='{base}assets/creative-intelligence-cover.png'"></figure><p class="story-label">{esc(story.get('beat'))}</p><h3>{esc(story.get('title'))}</h3><p>{esc(story.get('why'))}</p></a>'''
        for story in front
    )
    department_html = "".join(
        f'''<section class="department ruled-section" id="{beat.lower().replace(' + ', '-').replace(' ', '-')}"><div class="section-inner"><div class="section-index"><span>{index:02d}</span><p>{esc(beat)}</p></div><div class="department-heading"><h2>{esc(beat)}</h2><p>{esc({"Graphic design": "Identity, type, packaging and visual systems with something precise to study.", "Motion + video": "Sequences, films and moving systems that expand the visual language.", "Social + campaigns": "Platform-native ideas, campaigns and cultural moves built to travel.", "Tools + workflow": "Software shifts worth testing against a real brief, not a demo."}[beat])}</p></div><div class="department-list">{story_rows(departments.get(beat, []), base)}</div></div></section>'''
        for index, beat in enumerate(departments, 3)
    )
    watch_items = "".join(f"<li><span>{index:02d}</span><div><strong>{esc(item)}</strong></div></li>" for index, item in enumerate(issue.get("watchlist", []), 1))
    return f'''<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#1a0503"><meta name="description" content="Creative Intelligence Magazine for {esc(issue.get('date'))}.">
  <meta property="og:title" content="{esc(issue.get('issue_title'))} | Creative Studio Magazine"><meta property="og:description" content="{esc(issue.get('editor_note'))}"><meta property="og:image" content="{SITE_URL}/assets/creative-intelligence-cover.png">
  <title>{esc(issue.get('issue_title'))} | Creative Studio Magazine</title><link rel="alternate" type="application/rss+xml" title="Creative Intelligence Magazine" href="{SITE_URL}/feed.xml">
  <link rel="preload" href="{esc(lead_image)}" as="image"><link rel="stylesheet" href="{base}styles.css">
</head><body>
  <div class="progress" aria-hidden="true"><span></span></div><header class="site-header"><a class="wordmark" href="{base}index.html"><span>CSM</span><small>Creative Studio Magazine</small></a>
    <button class="menu-button" type="button" aria-expanded="false" aria-controls="issue-nav"><span></span><span></span><span class="sr-only">Open issue navigation</span></button>
    <nav id="issue-nav" aria-label="Issue sections"><a href="#visual-front">Front</a><a href="#graphic-design">Design</a><a href="#motion-video">Motion</a><a href="#social-campaigns">Social</a><a href="#inspiration">Moodboard</a><a href="{base}archive/">Index</a></nav><button class="print-button" type="button" title="Print this issue" aria-label="Print this issue">↗</button>
  </header><main>
    <section class="cover" id="cover" aria-labelledby="cover-title"><img src="{esc(lead_image)}" alt="" fetchpriority="high" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='{base}assets/creative-intelligence-cover.png'"><div class="cover-shade"></div><div class="cover-meta"><p>Daily edition <span>{esc(issue.get('date'))}</span></p><p>{total} selected signals</p></div>
      <div class="cover-copy"><p class="kicker">Creative intelligence for visual teams</p><h1 id="cover-title">{esc(issue.get('issue_title'))}</h1><p class="dek">{esc(lead.get('title') if lead else issue.get('editor_note'))}</p></div><a class="scroll-cue" href="#letter"><span></span>Open today’s issue</a>
    </section>
    <section class="letter ruled-section" id="letter"><div class="section-inner"><div class="section-index"><span>01</span><p>Editor’s note</p></div><div class="letter-layout reveal"><h2>A sharper read on visual culture.</h2><div class="prose"><p class="dropcap">{esc(issue.get('editor_note'))}</p><p class="signoff">Edited from {esc(issue.get('candidate_count'))} candidates · {esc(issue.get('generation_method'))}</p></div></div></div></section>
    <section class="visual-front ruled-section" id="visual-front"><div class="section-inner"><div class="section-index"><span>02</span><p>The visual front</p></div><article class="lead-story reveal"><figure><img src="{esc(lead_image)}" alt="" loading="eager" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='{base}assets/creative-intelligence-cover.png'"><figcaption>{esc(lead.get('source') if lead else '')}</figcaption></figure><div><p class="story-label">Cover story · {esc(lead.get('beat') if lead else '')}</p><h2>{esc(lead.get('title') if lead else 'A selective day')}</h2><p class="lead-dek">{esc(lead.get('why') if lead else 'No story cleared the lead threshold.')}</p><p>{esc(lead.get('summary') if lead else '')}</p><p class="studio-move">{esc(lead.get('practical') if lead else '')}</p><a class="text-link" href="{esc(safe_url(lead.get('url') if lead else ''))}" target="_blank" rel="noreferrer">Read original source <span>↗</span></a></div></article><div class="front-grid">{front_html}</div></div></section>
    {department_html}
    <section class="moodboard ruled-section dark-section" id="inspiration"><div class="section-inner"><div class="section-index"><span>07</span><p>Moodboard fuel</p></div><div class="section-intro reveal"><h2>Look closely.</h2><p>References selected for their typography, image-making, motion, composition or art direction.</p></div><div class="moodboard-grid">{mood_rows(inspiration, base)}</div></div></section>
    <section class="watchlist ruled-section" id="watchlist"><div class="section-inner"><div class="section-index"><span>08</span><p>What to watch next</p></div><div class="watch-grid reveal"><h2>Signals still taking shape.</h2><ol>{watch_items}</ol></div></div></section>
    <section class="sources ruled-section" id="source-desk"><div class="section-inner"><div class="section-index"><span>09</span><p>Source desk</p></div><div class="sources-heading reveal"><h2>{total} stories. No repeats.</h2><p>Original reporting and primary sources behind the issue.</p></div><div class="source-list">{source_rows(issue)}</div></div></section>
  </main><footer><a class="wordmark" href="#cover"><span>CSM</span><small>Creative Studio Magazine</small></a><p>{esc(issue.get('date'))} · {esc(issue.get('issue_title'))}</p><a href="{base}archive/index.html">Archive ↗</a></footer><script src="{base}script.js"></script>
</body></html>'''


def render_weekly(weekly: dict, issue_date: str, base: str = "../../") -> str:
    fallback = f"{base}assets/creative-intelligence-cover.png"
    tool_rows = "".join(f'<a class="department-story" href="{esc(safe_url(row.get("url")))}"><figure><img src="{fallback}" alt=""><figcaption>Tool radar</figcaption></figure><div class="department-copy"><p class="story-label">{esc(row.get("recommendation"))}</p><h3>{esc(row.get("title"))}</h3><p>{esc(row.get("note"))}</p></div><span class="story-arrow">↗</span></a>' for row in weekly.get("tool_radar", []))
    signal_rows = "".join(f'<a class="department-story" href="{esc(safe_url(row.get("url")))}"><figure><img src="{fallback}" alt=""><figcaption>Studio signal</figcaption></figure><div class="department-copy"><h3>{esc(row.get("title"))}</h3><p>{esc(row.get("move"))} {esc(row.get("lesson"))}</p></div><span class="story-arrow">↗</span></a>' for row in weekly.get("studio_signals", []))
    actions = "".join(f'<li><span>{index:02d}</span><div><strong>{esc(item)}</strong></div></li>' for index, item in enumerate(weekly.get("team_actions", []), 1))
    watch = "".join(f'<li><span>{index:02d}</span><div><strong>{esc(item)}</strong></div></li>' for index, item in enumerate(weekly.get("watchlist", []), 1))
    mood = "".join(f'<a class="mood-item" href="{esc(safe_url(row.get("url")))}"><img src="{fallback}" alt=""><span class="mood-shade"></span><div><p>Moodboard fuel</p><h3>{esc(row.get("title"))}</h3><small>{esc(row.get("look_at"))}</small></div></a>' for row in weekly.get("moodboard", []))
    cover = weekly.get("cover_story", {})
    debate = weekly.get("debate", {})
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{esc(weekly.get('title'))} | Creative Studio Magazine</title><link rel="stylesheet" href="{base}styles.css"></head><body><main>
    <section class="cover"><img src="{fallback}" alt="Abstract layered working-file sculpture."><div class="cover-shade"></div><div class="cover-meta"><p>Weekly edition <span>{esc(issue_date)}</span></p></div><div class="cover-copy"><p class="kicker">Creative Studio Magazine</p><h1>{esc(weekly.get('title'))}</h1><p class="dek">{esc(weekly.get('theme'))}</p></div></section>
    <section class="letter ruled-section"><div class="section-inner"><div class="section-index"><span>01</span><p>Editor’s letter</p></div><div class="letter-layout"><h2>The week, edited.</h2><div class="prose"><p class="dropcap">{esc(weekly.get('editors_letter'))}</p></div></div></div></section>
    <section class="visual-front ruled-section"><div class="section-inner"><div class="section-index"><span>02</span><p>Cover story</p></div><article class="lead-story"><figure><img src="{fallback}" alt=""></figure><div><p class="story-label">The week’s creative shift</p><h2>{esc(cover.get('headline'))}</h2><p class="lead-dek">{esc(cover.get('dek'))}</p><p>{esc(cover.get('body'))}</p><p class="studio-move">{esc(cover.get('takeaway'))}</p></div></article></div></section>
    <section class="department ruled-section"><div class="section-inner"><div class="section-index"><span>03</span><p>Tool radar</p></div><div class="department-heading"><h2>Tools worth a real brief.</h2></div><div class="department-list">{tool_rows}</div></div></section>
    <section class="department ruled-section"><div class="section-inner"><div class="section-index"><span>04</span><p>Studio signals</p></div><div class="department-heading"><h2>Moves worth studying.</h2></div><div class="department-list">{signal_rows}</div></div></section>
    <section class="letter ruled-section"><div class="section-inner"><div class="section-index"><span>05</span><p>Debate item</p></div><div class="letter-layout"><h2>{esc(debate.get('question'))}</h2><div class="prose"><p><strong>One side:</strong> {esc(debate.get('side_a'))}</p><p><strong>The other:</strong> {esc(debate.get('side_b'))}</p><p class="studio-move">{esc(debate.get('position'))}</p></div></div></div></section>
    <section class="moodboard ruled-section dark-section"><div class="section-inner"><div class="section-index"><span>06</span><p>Moodboard fuel</p></div><div class="moodboard-grid">{mood}</div></div></section>
    <section class="watchlist ruled-section"><div class="section-inner"><div class="section-index"><span>07</span><p>Watchlist + team actions</p></div><div class="watch-grid"><div><h2>Keep watching.</h2><ol>{watch}</ol></div><div><h2>Take it into the studio.</h2><ol>{actions}</ol></div></div></div></section></main><footer><a class="wordmark" href="{base}index.html"><span>CSM</span><small>Creative Studio Magazine</small></a><p>{esc(weekly.get('title'))}</p><a href="{base}archive/index.html">Archive ↗</a></footer></body></html>'''


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
    rows = "".join(
        f'<a class="archive-row" href="{esc("../" + row["url_path"] if row.get("url_path") else row["date"] + "/")}"><span>{esc(row["date"])}</span><h3>{esc(row["title"])}</h3><strong>Read issue ↗</strong></a>'
        for row in reversed(history.get("issues", []))
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Archive | Creative Studio Magazine</title><link rel="stylesheet" href="../styles.css"></head><body><main><section class="ruled-section archive"><div class="section-inner"><div class="section-index"><span>{len(history.get("issues", [])):02d}</span><p>Daily archive</p></div><div class="department-heading"><h2>Every edit, kept open.</h2><p>Daily creative intelligence for design, motion and social teams.</p></div><div class="archive-list">{rows}</div></div></section></main><footer><a class="wordmark" href="../index.html"><span>CSM</span><small>Creative Studio Magazine</small></a><p>Daily archive</p><a href="../feed.xml">RSS ↗</a></footer></body></html>')


def render_rss(history: dict, path: Path) -> None:
    items = []
    for row in reversed(history.get("issues", [])[-30:]):
        link = f"{SITE_URL}/{row['url_path']}" if row.get("url_path") else f"{SITE_URL}/archive/{row['date']}/"
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
