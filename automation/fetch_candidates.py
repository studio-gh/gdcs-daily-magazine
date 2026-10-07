#!/usr/bin/env python3
"""Collect and normalize fresh RSS/Atom candidates without external packages."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

USER_AGENT = "CreativeIntelligenceMagazine/1.0 (+https://github.com/studio-gh/gdcs-daily-magazine)"


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def text_of(node: ET.Element, names: set[str]) -> str:
    for child in node.iter():
        if local_name(child.tag) in names and child.text:
            return " ".join(child.text.split())
    return ""


def link_of(node: ET.Element) -> str:
    for child in node.iter():
        if local_name(child.tag) != "link":
            continue
        href = child.attrib.get("href", "").strip()
        rel = child.attrib.get("rel", "alternate")
        if href and rel in {"alternate", ""}:
            return href
        if child.text and child.text.strip().startswith("http"):
            return child.text.strip()
    return text_of(node, {"guid", "id"})


def strip_markup(value: str) -> str:
    value = html.unescape(value or "")
    value = re.sub(r"<[^>]+>", " ", value)
    return " ".join(value.split())[:1000]


def parse_date(value: str) -> datetime | None:
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError, OverflowError):
        pass
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def canonical_url(value: str) -> str:
    try:
        parsed = urllib.parse.urlsplit(value)
        query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
        query = [(k, v) for k, v in query if not k.lower().startswith("utm_") and k.lower() not in {"ref", "source"}]
        return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc.lower(), parsed.path.rstrip("/"), urllib.parse.urlencode(query), ""))
    except ValueError:
        return value


def normalized_title(value: str) -> str:
    value = re.sub(r"\s+[|–—-]\s+[^|–—-]{2,40}$", "", value)
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def fetch_source(source: dict, cutoff: datetime) -> list[dict]:
    request = urllib.request.Request(source["url"], headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml"})
    with urllib.request.urlopen(request, timeout=25) as response:
        payload = response.read(4_000_000)
    root = ET.fromstring(payload)
    nodes = [node for node in root.iter() if local_name(node.tag) in {"item", "entry"}]
    results = []
    for node in nodes:
        title = strip_markup(text_of(node, {"title"}))
        url = canonical_url(link_of(node))
        if not title or not url.startswith(("http://", "https://")):
            continue
        published_raw = text_of(node, {"pubdate", "published", "updated", "date"})
        published = parse_date(published_raw)
        if published and published.astimezone(timezone.utc) < cutoff:
            continue
        description = strip_markup(text_of(node, {"description", "summary", "content", "encoded"}))
        item_source = strip_markup(text_of(node, {"source"})) or source["name"]
        norm = normalized_title(title)
        fingerprint = hashlib.sha1(f"{norm}|{url}".encode()).hexdigest()[:16]
        results.append({
            "title": title,
            "url": url,
            "publication": item_source,
            "feed": source["name"],
            "category": source["category"],
            "source_tier": source["tier"],
            "published": published.astimezone(timezone.utc).isoformat() if published else "",
            "summary": description,
            "candidate_fingerprint": fingerprint,
        })
    return results


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sources", default="automation/sources.json")
    parser.add_argument("--output", default=".cache/candidates.json")
    parser.add_argument("--hours", type=int, default=60)
    parser.add_argument("--max-candidates", type=int, default=60)
    args = parser.parse_args()

    sources = json.loads(Path(args.sources).read_text())
    cutoff = datetime.now(timezone.utc) - timedelta(hours=args.hours)
    candidates: list[dict] = []
    failures: list[dict] = []
    for source in sources:
        try:
            candidates.extend(fetch_source(source, cutoff))
        except Exception as exc:  # A broken feed should not stop publication.
            failures.append({"source": source["name"], "error": str(exc)[:180]})

    seen_urls: set[str] = set()
    seen_titles: set[str] = set()
    unique: list[dict] = []
    for item in sorted(candidates, key=lambda row: (row["source_tier"], row["published"]), reverse=True):
        norm = normalized_title(item["title"])
        if item["url"] in seen_urls or norm in seen_titles:
            continue
        seen_urls.add(item["url"])
        seen_titles.add(norm)
        unique.append(item)
        if len(unique) >= args.max_candidates:
            break

    output = {"generated_at": datetime.now(timezone.utc).isoformat(), "candidate_count": len(unique), "failures": failures, "candidates": unique}
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
    print(f"Collected {len(unique)} unique candidates from {len(sources) - len(failures)}/{len(sources)} sources")
    if failures:
        print("Feed failures: " + ", ".join(row["source"] for row in failures), file=sys.stderr)
    return 0 if unique else 2


if __name__ == "__main__":
    raise SystemExit(main())
