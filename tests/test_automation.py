import unittest

from automation.fetch_candidates import image_of
from automation.normalize_curation import beat_from, deterministic_issue, extract_json, magazine_worthy, validate_ai
from automation.render_site import render_issue, render_weekly, story_visual
import xml.etree.ElementTree as ET


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

    def test_missing_story_images_use_distinct_editorial_panels(self):
        output = "".join(story_visual({"title": beat, "beat": beat}) for beat in (
            "Graphic design", "Motion + video", "Social + campaigns", "Tools + workflow"
        ))
        self.assertIn("visual-graphic-design", output)
        self.assertIn("visual-motion-video", output)
        self.assertIn("visual-social-campaigns", output)
        self.assertIn("visual-tools-workflow", output)
        self.assertNotIn("creative-intelligence-cover.png", output)

    def test_broken_source_image_reveals_panel_instead_of_cover(self):
        issue = deterministic_issue(self.candidates, "2026-10-06", False)
        issue["top_stories"][0]["image"] = "https://example.com/missing.jpg"
        output = render_issue(issue)
        self.assertIn('onerror="this.remove()"', output)
        self.assertNotIn("this.onerror=null;this.src='assets/creative-intelligence-cover.png'", output.split('<section class="visual-front', 1)[1])

    def test_ai_output_rejects_unknown_urls(self):
        story = {"title": "Invented", "url": "https://invalid.example/story", "summary": "x", "why": "x", "practical": "x", "fingerprint": "x", "company": "x", "flag": "x"}
        issue = {"top_stories": [story], "campaigns": [], "inspiration": [], "watchlist": []}
        self.assertIsNone(validate_ai(issue, self.candidates, "2026-10-06"))

    def test_extracts_feed_image(self):
        node = ET.fromstring('<item><description><![CDATA[<p>Story</p><img src="https://example.com/art.jpg">]]></description></item>')
        self.assertEqual(image_of(node, node.find("description").text), "https://example.com/art.jpg")

    def test_assigns_creative_beats(self):
        self.assertEqual(beat_from({"title": "A kinetic title sequence", "category": "motion-video"}), "Motion + video")
        self.assertEqual(beat_from({"title": "A new typeface", "category": "graphic-design"}), "Graphic design")

    def test_rejects_generic_technology_filler(self):
        generic = {"title": "A new phone gets a discount", "summary": "Consumer electronics sale", "category": "creative-technology", "feed": "The Verge"}
        visual = {"title": "A new motion identity for a global brand", "summary": "A kinetic typography system", "category": "motion-video", "feed": "Example"}
        self.assertFalse(magazine_worthy(generic))
        self.assertTrue(magazine_worthy(visual))

    def test_weekly_uses_editorial_layout(self):
        issue = deterministic_issue(self.candidates, "2026-10-09", True)
        output = render_weekly(issue["weekly_issue"], issue["date"])
        self.assertIn("lead-story", output)
        self.assertIn("moodboard-grid", output)
        self.assertIn("department-list", output)


if __name__ == "__main__":
    unittest.main()
