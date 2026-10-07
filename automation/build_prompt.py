#!/usr/bin/env python3
"""Compose the constrained editorial prompt supplied to Copilot CLI."""

from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidates", default=".cache/candidates.json")
    parser.add_argument("--history", default="data/history.json")
    parser.add_argument("--contract", default="automation/editorial_prompt.md")
    parser.add_argument("--output", default=".cache/editorial-prompt.md")
    args = parser.parse_args()

    now = datetime.now(ZoneInfo("America/Sao_Paulo"))
    candidate_data = json.loads(Path(args.candidates).read_text())
    history_path = Path(args.history)
    history = json.loads(history_path.read_text()) if history_path.exists() else {"issues": []}
    recent = history.get("issues", [])[-14:]

    prompt = Path(args.contract).read_text().rstrip()
    prompt += f"\n\n# Run context\n\nLocal date: {now.date().isoformat()}\nDay: {now.strftime('%A')}\n"
    prompt += f"Candidate count: {candidate_data.get('candidate_count', 0)}\n"
    prompt += "Friday weekly issue required: " + ("yes" if now.weekday() == 4 else "no") + "\n"
    prompt += "\n# Recent issue history (deduplicate against this)\n\n```json\n"
    prompt += json.dumps(recent, ensure_ascii=False, indent=2) + "\n```\n"
    prompt += "\n# Candidate pool\n\nUse only these candidates. Do not alter their URLs.\n\n```json\n"
    prompt += json.dumps(candidate_data.get("candidates", []), ensure_ascii=False, indent=2) + "\n```\n"

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(prompt)
    print(f"Wrote {output} ({len(prompt)} characters)")


if __name__ == "__main__":
    main()
