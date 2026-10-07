#!/usr/bin/env python3
"""Validate AI output and produce a deterministic issue if AI is unavailable."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

SECTION_LIMITS = {"top_stories": 16, "campaigns": 7, "inspiration": 7}
CAMPAIGN_TERMS = {"campaign", "brand", "rebrand", "identity", "packaging", "ooh", "advertising"}
INSPIRATION_TERMS = {"typography", "illustration", "editorial", "studio", "exhibition", "photography", "motion", "culture"}
TOOL_TERMS = {"figma", "adobe", "canva", "framer", "webflow", "runway", "midjourney", "openai", "powerpoint", "slides"}


def extract_json(raw: str) -> dict | None:
    if not raw.strip():
        return None
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.I | re.S)
    start, end = raw.find("{"), raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        value = json.loads(raw[start : end + 1])
        return value if isinstance(value, dict) else None
    except json.JSONDecodeError:
        return None


def company_from(item: dict) -> str:
    host = urlsplit(item["url"]).netloc.removeprefix("www.")
    title = item["title"]
    for term in sorted(TOOL_TERMS, key=len, reverse=True):
        if term in title.lower():
            return term.title()
    return item.get("publication") or host


def fallback_story(item: dict, date: str, flag: str) -> dict:
    summary = item.get("summary") or f"{item['title']} is a fresh signal from {item.get('publication', 'the source')}."
    summary = " ".join(summary.split())[:420]
    company = company_from(item)
    slug = re.sub(r"[^a-z0-9]+", "-", f"{company}-{item['title'][:70]}".lower()).strip("-")
    return {
        "title": item["title"],
        "source_title": item["title"],
        "url": item["url"],
        "source": item.get("publication") or item.get("feed") or "Source",
        "company": company,
        "summary": summary,
        "why": "The signal is specific enough to test, reference or discuss in a creative-team context.",
        "practical": "Open the source, identify the concrete visual or workflow move, and decide whether it belongs in a live brief.",
        "fingerprint": f"{slug[:110]}-{date}",
        "flag": flag,
    }


def candidate_score(item: dict) -> float:
    text = f"{item['title']} {item.get('summary', '')} {item.get('category', '')}".lower()
    score = float(item.get("source_tier", 1)) * 3
    score += sum(1.3 for term in TOOL_TERMS | CAMPAIGN_TERMS | INSPIRATION_TERMS if term in text)
    if item.get("summary"):
        score += 1
    if item.get("published"):
        score += 1
    return score


def deterministic_issue(candidates: list[dict], date: str, friday: bool) -> dict:
    ranked = sorted(candidates, key=candidate_score, reverse=True)
    used: set[str] = set()

    def take(predicate, count: int, flag: str) -> list[dict]:
        result = []
        for item in ranked:
            if item["url"] in used or not predicate(item):
                continue
            used.add(item["url"])
            result.append(fallback_story(item, date, flag))
            if len(result) == count:
                break
        return result

    campaigns = take(lambda row: row.get("category") == "campaigns" or any(term in row["title"].lower() for term in CAMPAIGN_TERMS), 6, "Client reference")
    inspiration = take(lambda row: row.get("category") in {"design-culture", "graphic-design"} or any(term in row["title"].lower() for term in INSPIRATION_TERMS), 6, "Moodboard fuel")
    top = take(lambda row: True, 14, "Tool test")
    weekly = None
    if friday:
        lead = (top + campaigns + inspiration)[:1]
        weekly = {
            "title": "The Week Stayed Open",
            "theme": "The strongest creative signals favored usable systems and specific visual decisions over novelty alone.",
            "editors_letter": "This automated holding edition preserves the week’s strongest verified signals. Its selections passed source, freshness and duplicate checks even though the AI editorial pass was unavailable.",
            "cover_story": {"headline": lead[0]["title"] if lead else "A quieter week", "dek": lead[0]["why"] if lead else "Only verified signals made the issue.", "body": lead[0]["summary"] if lead else "The candidate pool did not support a larger lead.", "takeaway": lead[0]["practical"] if lead else "Keep watching."},
            "tool_radar": [{"title": row["title"], "recommendation": "Watch", "note": row["practical"], "url": row["url"]} for row in top[:5]],
            "studio_signals": [{"title": row["title"], "move": row["summary"], "lesson": row["practical"], "url": row["url"]} for row in campaigns[:5]],
            "steal_this_move": {"title": "Preserve editability", "origin": "This week’s tool signals", "method": "Test what remains changeable after generation.", "exercise": "Hand one generated asset to a teammate and measure the revision cost."},
            "debate": {"question": "Is finished-looking output hiding production debt?", "side_a": "Speed expands exploration.", "side_b": "Flattened output moves cost downstream.", "position": "Judge the working file, not only the preview."},
            "moodboard": [{"title": row["title"], "look_at": row["practical"], "url": row["url"]} for row in inspiration[:8]],
            "watchlist": [row["title"] for row in top[5:10]],
            "team_actions": ["Test one tool on a live brief.", "Save one visual reference with a written reason.", "Discuss the debate question in critique."],
        }
    return {
        "date": date,
        "issue_title": "The Daily Edit",
        "editor_note": "Today’s issue favors concrete workflow changes, visual systems and studio references over generic technology news. Automated fallback selection was used, so the source desk remains the final authority.",
        "top_stories": top,
        "campaigns": campaigns,
        "inspiration": inspiration,
        "watchlist": [row["title"] for row in ranked if row["url"] not in used][:7],
        "weekly_issue": weekly,
    }


def validate_ai(issue: dict, candidates: list[dict], date: str) -> dict | None:
    allowed = {row["url"]: row for row in candidates}
    issue["date"] = date
    seen: set[str] = set()
    total = 0
    for section, limit in SECTION_LIMITS.items():
        clean = []
        for story in issue.get(section, []):
            if not isinstance(story, dict) or story.get("url") not in allowed or story["url"] in seen:
                continue
            candidate = allowed[story["url"]]
            story["source_title"] = candidate["title"]
            story["url"] = candidate["url"]
            story["source"] = story.get("source") or candidate.get("publication") or candidate.get("feed")
            for field in ("title", "company", "summary", "why", "practical", "fingerprint", "flag"):
                story[field] = str(story.get(field, "")).strip()
            if not all(story[field] for field in ("title", "summary", "why", "practical", "fingerprint")):
                continue
            seen.add(story["url"])
            clean.append(story)
            total += 1
            if len(clean) >= limit:
                break
        issue[section] = clean
    if total < 5:
        return None
    issue["issue_title"] = str(issue.get("issue_title") or "The Daily Edit")[:100]
    issue["editor_note"] = str(issue.get("editor_note") or "A selective daily brief for creative teams.")[:900]
    issue["watchlist"] = [str(value)[:260] for value in issue.get("watchlist", []) if str(value).strip()][:8]
    return issue


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", default=".cache/copilot-output.txt")
    parser.add_argument("--candidates", default=".cache/candidates.json")
    parser.add_argument("--output", default="data/latest.json")
    args = parser.parse_args()

    candidate_data = json.loads(Path(args.candidates).read_text())
    candidates = candidate_data.get("candidates", [])
    now = datetime.now(ZoneInfo("America/Sao_Paulo"))
    date = now.date().isoformat()
    raw_path = Path(args.raw)
    parsed = extract_json(raw_path.read_text(errors="replace") if raw_path.exists() else "")
    issue = validate_ai(parsed, candidates, date) if parsed else None
    method = "copilot"
    if issue is None:
        issue = deterministic_issue(candidates, date, now.weekday() == 4)
        method = "deterministic-fallback"
    issue["generation_method"] = method
    issue["candidate_count"] = len(candidates)
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(issue, indent=2, ensure_ascii=False) + "\n")
    print(f"Normalized {sum(len(issue[s]) for s in SECTION_LIMITS)} selected stories using {method}")


if __name__ == "__main__":
    main()
