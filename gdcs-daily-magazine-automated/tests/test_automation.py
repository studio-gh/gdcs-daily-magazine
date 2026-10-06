import unittest

from automation.normalize_curation import deterministic_issue, extract_json, validate_ai
from automation.render_site import render_issue


class AutomationTests(unittest.TestCase):
    def setUp(self):
        self.candidates = [{"title": f"Figma motion system update {index}", "url": f"https://example.com/story-{index}", "publication": "Example Design", "feed": "Example Design", "category": "creative-tools" if index % 2 else "campaigns", "source_tier": 3, "published": "2026-10-06T10:00:00+00:00", "summary": "A concrete visual workflow update with editable components and motion rules."} for index in range(20)]

    def test_extracts_fenced_json(self):
        self.assertEqual(extract_json('```json\n{"date":"2026-10-06"}\n```')["date"], "2026-10-06")

    def test_fallback_is_unique_and_renderable(self):
        issue = deterministic_issue(self.candidates, "2026-10-06", False)
        urls = [story["url"] for key in ("top_stories", "campaigns", "inspiration") for story in issue[key]]
        self.assertEqual(len(urls), len(set(urls)))
        issue["generation_method"] = "test"
        issue["candidate_count"] = len(self.candidates)
        output = render_issue(issue)
        self.assertIn("Creative Studio Magazine", output)
        self.assertIn("feed.xml", output)

    def test_ai_output_rejects_unknown_urls(self):
        story = {"title": "Invented", "url": "https://invalid.example/story", "summary": "x", "why": "x", "practical": "x", "fingerprint": "x", "company": "x", "flag": "x"}
        issue = {"top_stories": [story], "campaigns": [], "inspiration": [], "watchlist": []}
        self.assertIsNone(validate_ai(issue, self.candidates, "2026-10-06"))


if __name__ == "__main__":
    unittest.main()
