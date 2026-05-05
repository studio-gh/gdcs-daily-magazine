import fs from "node:fs/promises";
import path from "node:path";

const EDITION_TYPE = process.env.EDITION_TYPE === "weekly" ? "weekly" : "daily";

const BRAND = {
  violet: "#4f17a8",
  violetDeep: "#35116f",
  ink: "#200f3b",
  aqua: "#05bfe0",
  tangerine: "#ff610f",
  paper: "#fbf8ff",
  line: "rgba(32, 15, 59, 0.14)"
};

const SECTION_ORDER = [
  "AI Latest",
  "Tool Updates",
  "Workflow Shifts",
  "Design Campaigns to Watch",
  "Inspiration"
];

const SPREAD_STYLES = [
  "spread-hero",
  "spread-midnight",
  "spread-pullquote",
  "spread-numeral",
  "spread-academic",
  "spread-techgrid",
  "spread-stamped",
  "spread-ribbon",
  "spread-notebook",
  "spread-poster"
];

const JSON_SCHEMA = {
  name: "morning_edition",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "edition_date",
      "cover_title",
      "cover_deck",
      "cover_notes",
      "stories",
      "slack_summary",
      "email_subject",
      "email_summary"
    ],
    properties: {
      edition_date: { type: "string" },
      cover_title: { type: "string" },
      cover_deck: { type: "string" },
      cover_notes: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: { type: "string" }
      },
      slack_summary: { type: "string" },
      email_subject: { type: "string" },
      email_summary: { type: "string" },
      stories: {
        type: "array",
        minItems: 10,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "section",
            "source_name",
            "published_date",
            "headline",
            "why_it_matters",
            "detail",
            "urgent",
            "story_url",
            "image_url",
            "image_alt"
          ],
          properties: {
            section: {
              type: "string",
              enum: SECTION_ORDER
            },
            source_name: { type: "string" },
            published_date: { type: "string" },
            headline: { type: "string" },
            why_it_matters: { type: "string" },
            detail: { type: "string" },
            urgent: { type: "boolean" },
            story_url: { type: "string" },
            image_url: { type: "string" },
            image_alt: { type: "string" }
          }
        }
      }
    }
  }
};

async function main() {
  const root = process.cwd();
  const runDate = getRunDate();
  const edition =
    process.env.MAGAZINE_INPUT_JSON
      ? JSON.parse(await fs.readFile(process.env.MAGAZINE_INPUT_JSON, "utf8"))
      : await generateEdition(runDate, EDITION_TYPE, root);

  edition.edition_date = runDate;
  edition.stories = sortStoriesBySection(edition.stories).slice(0, 10);

  if (edition.stories.length !== 10) {
    throw new Error(`Expected 10 stories, received ${edition.stories.length}`);
  }

  const imageDir = path.join(root, "images", runDate);
  await fs.mkdir(imageDir, { recursive: true });

  for (let index = 0; index < edition.stories.length; index += 1) {
    const story = edition.stories[index];
    story.local_image_path = await cacheImage(story.image_url, imageDir, index + 1);
  }

  const html = renderEditionHtml(edition);
  const summaryHtml = renderSummaryHtml(edition);
  const summaryTxt = renderSummaryText(edition);

  if (EDITION_TYPE === "weekly") {
    const weeklyId = isoWeekId(runDate);
    const weeklyDir = path.join(root, "weekly");
    const weeklySummariesDir = path.join(root, "weekly-summaries");
    await fs.mkdir(weeklyDir, { recursive: true });
    await fs.mkdir(weeklySummariesDir, { recursive: true });
    await fs.writeFile(path.join(weeklyDir, `${weeklyId}.html`), html);
    await fs.writeFile(path.join(weeklyDir, "latest.html"), html);
    await fs.writeFile(path.join(weeklySummariesDir, `${weeklyId}-summary.html`), summaryHtml);
    await fs.writeFile(path.join(weeklySummariesDir, `${weeklyId}-summary.txt`), summaryTxt);
    console.log(`Generated Weekly Edition for ${runDate}`);
    return;
  }

  const [year, month] = runDate.split("-");
  const archiveDir = path.join(root, "archives", year, month);
  const summariesDir = path.join(root, "summaries");
  await fs.mkdir(archiveDir, { recursive: true });
  await fs.mkdir(summariesDir, { recursive: true });

  await fs.writeFile(path.join(root, "index.html"), html);
  await fs.writeFile(path.join(archiveDir, `${runDate}.html`), html);
  await fs.writeFile(path.join(summariesDir, `${runDate}-summary.html`), summaryHtml);
  await fs.writeFile(path.join(summariesDir, `${runDate}-summary.txt`), summaryTxt);
  await writeArchiveIndexes(root);

  console.log(`Generated Morning Edition for ${runDate}`);
}

function getRunDate() {
  const explicit = process.env.MAGAZINE_DATE?.trim();
  if (explicit) return explicit;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

async function generateEdition(runDate, editionType, root) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required.");
  }

  const recentCoverage = await collectRecentCoverage(root, runDate);
  const coverageBlock =
    recentCoverage.length > 0
      ? `Recent archive coverage from the last 14 days. Avoid repeating these unless there is a material update and you explicitly state what changed:\n${recentCoverage.map((item) => `- ${item.date}: ${item.headline}`).join("\n")}`
      : "No recent archive coverage was found in the repo, so use your normal non-repetition judgment.";

  const systemText =
    editionType === "weekly"
      ? "You are producing a premium Friday weekly editorial magazine for PMI's Graphic Design Team. Use web search to find the most important official-source stories from this week only. Allowed source families: OpenAI/ChatGPT, Anthropic/Claude, Google/Gemini/Workspace/NotebookLM, Canva, Adobe, and Microsoft/Microsoft 365/Copilot/PowerPoint. Choose exactly 10 stories that mattered most to design workflow, experimentation, training, presentations, creative production, collaboration, creative operations, inspiring design campaigns, or visual-system inspiration across the week. AI and design-creativity news must remain the core of the issue, especially in the opening section. Build the issue in this section order: AI Latest first, then Tool Updates, Workflow Shifts, Design Campaigns to Watch, and Inspiration. Campaign and inspiration content should be complementary, not the main event. Exclude generic hype, crypto, celebrity news, and stories with no practical design impact. Every story must begin from a PMI-specific why-it-matters lens. Use concise, selective editorial writing and emphasize what deserves discussion or piloting next week."
      : "You are producing a premium internal editorial magazine for PMI's Graphic Design Team. Use web search to find the most relevant current stories from official primary sources first. Allowed source families: OpenAI/ChatGPT, Anthropic/Claude, Google/Gemini/Workspace/NotebookLM, Canva, Adobe, and Microsoft/Microsoft 365/Copilot/PowerPoint. Choose exactly 10 stories that matter to design workflow, experimentation, training, presentations, creative production, collaboration, creative operations, inspiring design campaigns, or visual-system inspiration. AI and design-creativity news must remain the core of the issue, especially in the opening section. Build the issue in this section order: AI Latest first, then Tool Updates, Workflow Shifts, Design Campaigns to Watch, and Inspiration. Campaign and inspiration content should be complementary, not the main event. Exclude generic hype, crypto, celebrity news, and stories with no practical design impact. Every story must begin from a PMI-specific why-it-matters lens. Use concise, sharp editorial writing. Keep the issue selective and calming so the team does not feel buried by the news cycle.";

  const userText =
    editionType === "weekly"
      ? `Create the Friday Weekly Edition for ${runDate}. Return valid JSON only. Requirements: exactly 10 stories from the current week; each story must have a section, a headline, a why-it-matters paragraph focused on PMI Creative Studio, a second supporting detail paragraph, a story URL, and an image URL from the original source or a same-source preview image. Mark urgent true only for immediately actionable workflow changes. Put 4-6 stories in AI Latest, then distribute the rest across the remaining sections. The cover title, deck, notes, and summaries should clearly reflect that this is a weekly wrap of the most important developments and what PMI's design team should discuss or test next week.\n\n${coverageBlock}`
      : `Create the Morning Edition for ${runDate}. Return valid JSON only. Requirements: exactly 10 stories; each story must have a section, a headline, a why-it-matters paragraph focused on PMI Creative Studio, a second supporting detail paragraph, a story URL, and an image URL from the original source or a same-source preview image. Mark urgent true only for immediately actionable workflow changes. Put 4-6 stories in AI Latest, then distribute the rest across the remaining sections. Make the overall issue feel selective, insightful, and share-ready for an internal senior design team.\n\n${coverageBlock}`;

  const body = {
    model: process.env.OPENAI_MODEL || "gpt-5",
    tools: [
      {
        type: "web_search",
        user_location: {
          type: "approximate",
          country: "BR",
          city: "Sao Paulo",
          region: "Sao Paulo"
        }
      }
    ],
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemText }]
      },
      {
        role: "user",
        content: [{ type: "input_text", text: userText }]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        ...JSON_SCHEMA
      }
    }
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const raw = extractResponseText(data);
  return JSON.parse(raw);
}

function extractResponseText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const texts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") texts.push(content.text);
      if (content.type === "output_text" && typeof content.text === "string") texts.push(content.text);
    }
  }

  if (!texts.length) {
    throw new Error("Unable to find response text in OpenAI response payload.");
  }

  return texts.join("\n");
}

async function cacheImage(sourceUrl, imageDir, index) {
  try {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!response.ok) {
      return sourceUrl;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/") && !contentType.includes("svg")) {
      return sourceUrl;
    }

    const extension = extensionFor(contentType, sourceUrl);
    const filename = `story-${String(index).padStart(2, "0")}${extension}`;
    const outputPath = path.join(imageDir, filename);
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
    return path.posix.join("images", path.basename(imageDir), filename);
  } catch {
    return sourceUrl;
  }
}

function extensionFor(contentType, sourceUrl) {
  if (contentType.includes("svg")) return ".svg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("gif")) return ".gif";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";

  const pathname = new URL(sourceUrl).pathname;
  const ext = path.extname(pathname);
  return ext || ".jpg";
}

function sortStoriesBySection(stories) {
  return [...stories].sort((a, b) => {
    const left = SECTION_ORDER.indexOf(a.section);
    const right = SECTION_ORDER.indexOf(b.section);
    return (left === -1 ? 999 : left) - (right === -1 ? 999 : right);
  });
}

function renderEditionHtml(edition) {
  const dateLabel = longDate(edition.edition_date);
  const editionName = EDITION_TYPE === "weekly" ? "Weekly Edition" : "Morning Edition";
  const kicker = EDITION_TYPE === "weekly" ? "PMI Creative Studio • Weekly Edition" : "PMI Creative Studio • Morning Edition";
  const datePillSuffix =
    EDITION_TYPE === "weekly"
      ? "Weekly editorial for the Graphic Design Team"
      : "Internal editorial for the Graphic Design Team";

  const jumpLinks = edition.stories
    .map(
      (story, index) =>
        `<a href="#story-${index + 1}"><span>${escapeHtml(story.section)}</span><strong>${index + 1}. ${escapeHtml(shortHeadline(story.headline, 30))}</strong></a>`
    )
    .join("\n");

  let currentSection = "";
  const storyMarkup = edition.stories
    .map((story, index) => {
      let prefix = "";
      if (story.section !== currentSection) {
        currentSection = story.section;
        prefix = renderSectionMarker(currentSection);
      }
      return `${prefix}\n${renderStory(story, index)}`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${editionName} | PMI Creative Studio | ${edition.edition_date}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root { --violet:${BRAND.violet}; --violet-deep:${BRAND.violetDeep}; --ink:${BRAND.ink}; --aqua:${BRAND.aqua}; --tangerine:${BRAND.tangerine}; --paper:${BRAND.paper}; --line:${BRAND.line}; --white:#ffffff; --muted:rgba(32,15,59,.72); --shadow:0 24px 60px rgba(32,15,59,.12); --max:1180px; }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; background:linear-gradient(180deg,#efe8fb 0%,#f7f3fd 22%,#f8f5fc 100%); }
    body { margin:0; font-family:"Inter",sans-serif; font-weight:400; color:var(--ink); line-height:1.8; letter-spacing:.006em; background:radial-gradient(circle at top left,rgba(5,191,224,.12),transparent 26%),radial-gradient(circle at bottom right,rgba(79,23,168,.1),transparent 28%),linear-gradient(180deg,#f3eefb 0%,#fbf8ff 100%); }
    a { color:inherit; }
    img { display:block; max-width:100%; }
    .shell { width:min(calc(100% - 32px),var(--max)); margin:0 auto; padding:28px 0 72px; }
    .cover { position:relative; overflow:hidden; padding:42px 44px 44px; border-radius:34px; background:linear-gradient(140deg,rgba(79,23,168,.95),rgba(53,17,111,.96) 56%,rgba(32,15,59,.98)); color:var(--white); box-shadow:0 32px 90px rgba(32,15,59,.28); min-height:78vh; display:grid; align-items:end; }
    .cover-grid { position:absolute; inset:0; background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px); background-size:28px 28px; mask-image:linear-gradient(180deg,rgba(0,0,0,.32),rgba(0,0,0,0)); opacity:.42; }
    .masthead { position:relative; z-index:1; display:grid; gap:24px; min-height:100%; align-content:space-between; }
    .kicker-row { display:flex; justify-content:space-between; gap:24px; align-items:start; flex-wrap:wrap; }
    .badge { display:inline-flex; gap:10px; padding:10px 16px; border-radius:999px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.16); font-size:.82rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; }
    .date-pill { padding:10px 14px; border:1px solid rgba(255,255,255,.18); background:rgba(255,255,255,.06); border-radius:16px; font-size:.88rem; max-width:340px; }
    h1 { margin:0; max-width:11ch; font-family:"Fraunces",serif; font-size:clamp(3.5rem,9vw,6.8rem); line-height:.92; letter-spacing:-.02em; font-weight:600; }
    .deck { max-width:720px; font-size:clamp(1.1rem,2vw,1.42rem); color:rgba(255,255,255,.88); margin:0; }
    .cover-meta { display:grid; grid-template-columns:1.1fr .9fr; gap:22px; }
    .cover-box { padding:18px 20px; border-radius:24px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.14); }
    .cover-box h2,.cover-box p { margin:0; }
    .cover-box h2 { font-size:.86rem; letter-spacing:.14em; text-transform:uppercase; color:rgba(255,255,255,.72); margin-bottom:10px; }
    .cover-box p { font-size:1.04rem; color:rgba(255,255,255,.92); }
    .jump { position:sticky; top:10px; z-index:30; margin:20px 0 26px; padding:14px 18px 16px; border-radius:24px; background:rgba(251,248,255,.82); border:1px solid rgba(79,23,168,.1); backdrop-filter:blur(16px); box-shadow:var(--shadow); }
    .jump h2 { margin:0 0 10px; font-size:.9rem; text-transform:uppercase; letter-spacing:.14em; color:var(--violet); }
    .jump-links { display:flex; flex-wrap:wrap; gap:10px; }
    .jump a { display:grid; gap:2px; text-decoration:none; padding:10px 14px; border-radius:18px; border:1px solid rgba(79,23,168,.12); background:rgba(79,23,168,.04); color:var(--ink); font-size:.82rem; line-height:1.25; min-width:176px; }
    .jump a span { text-transform:uppercase; letter-spacing:.12em; color:var(--muted); }
    .jump a strong { font-size:.92rem; font-weight:700; }
    .section-marker { margin:34px 0 18px; padding:18px 20px; border-radius:24px; background:linear-gradient(90deg,rgba(79,23,168,.12),rgba(5,191,224,.06)); border:1px solid rgba(79,23,168,.12); }
    .section-marker .eyebrow { margin:0 0 8px; text-transform:uppercase; letter-spacing:.14em; font-size:.78rem; font-weight:800; color:var(--violet); }
    .section-marker h2 { margin:0; font-family:"Fraunces",serif; font-size:clamp(1.8rem,3vw,2.8rem); line-height:1; }
    .section-marker p { margin:8px 0 0; color:var(--muted); font-size:.98rem; }
    .spread { position:relative; margin:26px 0; padding:34px; border-radius:34px; background:var(--white); border:1px solid var(--line); box-shadow:var(--shadow); overflow:hidden; }
    .spread-inner { position:relative; z-index:1; }
    .spread-header { display:flex; justify-content:space-between; gap:18px; align-items:center; margin-bottom:22px; flex-wrap:wrap; }
    .story-index { font-size:.84rem; text-transform:uppercase; letter-spacing:.16em; font-weight:800; color:var(--violet); }
    .story-source { font-size:.9rem; color:var(--muted); }
    .headline { margin:0 0 18px; font-family:"Fraunces",serif; font-size:clamp(2.1rem,4.4vw,4rem); line-height:.97; letter-spacing:-.025em; max-width:12ch; }
    .story-grid,.story-columns { display:grid; gap:26px; align-items:start; }
    .story-grid { grid-template-columns:1.05fr .95fr; }
    .story-columns { grid-template-columns:.92fr 1.08fr; }
    .copy p { margin:0 0 1.12em; font-size:clamp(1.02rem,1.38vw,1.14rem); color:var(--ink); font-weight:400; }
    .copy strong { color:var(--violet-deep); font-weight:600; }
    .figure { display:grid; gap:10px; }
    .figure img { width:100%; height:clamp(260px,38vw,560px); object-fit:cover; border-radius:22px; border:1px solid rgba(32,15,59,.08); background:#ede7fa; }
    .figure figcaption { font-size:.88rem; color:var(--muted); }
    .cta { display:inline-flex; margin-top:20px; padding:12px 16px; border-radius:999px; background:var(--ink); color:var(--white); text-decoration:none; font-weight:700; letter-spacing:.04em; font-size:.9rem; }
    .cta.light { background:var(--white); color:var(--ink); }
    .rule { width:110px; height:4px; border-radius:999px; background:linear-gradient(90deg,var(--aqua),var(--violet)); margin-bottom:18px; }
    .spread-hero::after { content:"Pipeline"; position:absolute; right:-10px; bottom:20px; font-family:"Fraunces",serif; font-size:clamp(4rem,14vw,9rem); color:rgba(79,23,168,.06); transform:rotate(-90deg); transform-origin:bottom right; }
    .spread-midnight { color:var(--white); background:linear-gradient(145deg,rgba(10,11,22,.96),rgba(32,15,59,.98) 55%,rgba(79,23,168,.94)); }
    .spread-midnight .story-index,.spread-midnight .story-source,.spread-midnight .copy p,.spread-midnight .copy strong,.spread-midnight figcaption,.spread-midnight .headline { color:rgba(255,255,255,.9); }
    .spread-midnight::before { content:""; position:absolute; inset:0; background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px); background-size:26px 26px; opacity:.45; }
    .spread-pullquote { background:linear-gradient(180deg,rgba(5,191,224,.08),transparent 34%),var(--paper); }
    .quote-block { margin:0 0 20px; padding:18px 22px; border-left:5px solid var(--aqua); font-family:"Fraunces",serif; font-size:clamp(1.5rem,2.3vw,2rem); line-height:1.16; color:var(--violet-deep); background:rgba(255,255,255,.7); border-radius:0 18px 18px 0; }
    .spread-numeral::before { content:attr(data-mark); position:absolute; right:28px; top:20px; font-family:"Fraunces",serif; font-size:clamp(7rem,17vw,13rem); line-height:.8; color:rgba(79,23,168,.08); }
    .spread-academic .copy p:first-child::first-letter { float:left; font-family:"Fraunces",serif; font-size:4.4rem; line-height:.84; padding-right:10px; color:var(--violet); }
    .spread-techgrid::before { content:""; position:absolute; inset:0; background-image:linear-gradient(rgba(32,15,59,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(32,15,59,.07) 1px,transparent 1px); background-size:18px 18px; mask-image:linear-gradient(180deg,rgba(0,0,0,.34),rgba(0,0,0,0)); }
    .terminal-note { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.88rem; letter-spacing:.03em; color:var(--aqua); text-transform:uppercase; margin-bottom:12px; }
    .spread-stamped .stamp { position:absolute; right:28px; top:28px; padding:9px 14px; border:2px solid var(--tangerine); color:var(--tangerine); font-weight:800; font-size:.86rem; letter-spacing:.14em; text-transform:uppercase; transform:rotate(7deg); border-radius:12px; }
    .spread-ribbon { background:linear-gradient(90deg,rgba(5,191,224,.12),rgba(5,191,224,.04) 18%,transparent 18%),var(--white); }
    .ribbon-tag { display:inline-flex; padding:8px 12px; border-radius:999px; background:rgba(5,191,224,.12); color:var(--violet-deep); font-weight:700; font-size:.88rem; letter-spacing:.04em; margin-bottom:12px; }
    .spread-notebook { background:linear-gradient(180deg,rgba(79,23,168,.04),transparent 26%),repeating-linear-gradient(180deg,rgba(79,23,168,.06) 0,rgba(79,23,168,.06) 1px,rgba(255,255,255,0) 1px,rgba(255,255,255,0) 38px),#fffefb; }
    .spread-poster { background:linear-gradient(180deg,rgba(32,15,59,.96),rgba(79,23,168,.94)); color:var(--white); }
    .spread-poster .headline,.spread-poster .copy p,.spread-poster .story-index,.spread-poster .story-source,.spread-poster figcaption { color:rgba(255,255,255,.92); }
    .spread-poster .poster-box { padding:18px; border-radius:22px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); }
    .footer-note { margin-top:36px; padding:24px; border-radius:26px; background:rgba(255,255,255,.84); border:1px solid var(--line); color:var(--muted); font-size:.96rem; }
    @media (max-width:960px){ .cover,.spread{padding:28px 22px;} .cover-meta,.story-grid,.story-columns{grid-template-columns:1fr;} .figure img{height:auto;} .spread-stamped .stamp{position:static;transform:none;display:inline-flex;margin-bottom:12px;} }
    @media (max-width:680px){ .shell{width:min(calc(100% - 18px),var(--max));padding-top:12px;} .cover{min-height:auto;} h1{max-width:8ch;} .jump{position:static; margin:14px 0 18px; padding:10px 12px; border-radius:18px; background:rgba(251,248,255,.68); box-shadow:0 10px 24px rgba(32,15,59,.08);} .jump h2{margin:0 0 6px; font-size:.74rem; letter-spacing:.1em;} .jump-links{gap:8px; flex-wrap:nowrap; overflow-x:auto; padding-bottom:2px; scrollbar-width:none;} .jump-links::-webkit-scrollbar{display:none;} .jump a{padding:8px 11px; font-size:.78rem; white-space:nowrap; min-width:150px;} .copy p{font-size:1rem; line-height:1.82;} }
  </style>
</head>
<body>
  <main class="shell">
    <section class="cover" aria-labelledby="cover-title">
      <div class="cover-grid" aria-hidden="true"></div>
      <div class="masthead">
        <div class="kicker-row">
          <div class="badge">${escapeHtml(kicker)}</div>
          <div class="date-pill">${escapeHtml(dateLabel)} • ${escapeHtml(datePillSuffix)}</div>
        </div>
        <div>
          <h1 id="cover-title">${escapeHtml(edition.cover_title)}</h1>
          <p class="deck">${escapeHtml(edition.cover_deck)}</p>
        </div>
        <div class="cover-meta">
          <div class="cover-box"><h2>Editorial lens</h2><p>${escapeHtml(edition.cover_notes[0])}</p></div>
          <div class="cover-box"><h2>Today’s pattern</h2><p>${escapeHtml(edition.cover_notes[1])}</p></div>
        </div>
      </div>
    </section>
    <nav class="jump" aria-label="Jump to section">
      <h2>Jump to story</h2>
      <div class="jump-links">${jumpLinks}</div>
    </nav>
    ${storyMarkup}
    <section class="footer-note">This ${EDITION_TYPE === "weekly" ? "weekly edition" : "edition"} was curated for PMI’s Graphic Design Team with a workflow-first filter: AI and design-creativity developments lead the issue, while campaigns and inspiration stay complementary and only appear when they offer real team value.</section>
  </main>
</body>
</html>`;
}

function renderSectionMarker(section) {
  const blurbs = {
    "AI Latest": "The core stories most likely to change how the team works, experiments, or briefs this week.",
    "Tool Updates": "Important product changes in the software stack the team already touches or may need to evaluate.",
    "Workflow Shifts": "Moves that change process, collaboration, approvals, or handoff patterns more than the pixels themselves.",
    "Design Campaigns to Watch": "Brand and campaign work worth scanning for craft, system thinking, or strategic framing.",
    Inspiration: "Complementary visual references that can sharpen taste, pacing, and conversation without overwhelming the core issue."
  };

  return `<section class="section-marker"><div class="eyebrow">Section</div><h2>${escapeHtml(section)}</h2><p>${escapeHtml(blurbs[section] || "")}</p></section>`;
}

function renderStory(story, index) {
  const style = SPREAD_STYLES[index % SPREAD_STYLES.length];
  const storyId = `story-${index + 1}`;
  const headline = `${story.urgent ? "⚡ " : ""}${story.headline}`;
  const lead = `<strong>Why it matters for PMI Creative Studio:</strong> ${escapeHtml(story.why_it_matters)}`;
  const detail = escapeHtml(story.detail);
  const imagePath = story.local_image_path || story.image_url;
  const classes = `spread ${style}`;

  if (style === "spread-pullquote") {
    return `<section id="${storyId}" class="${classes}"><div class="spread-inner"><div class="spread-header"><div class="story-index">${escapeHtml(story.section)} • Story ${pad(index + 1)} • ${escapeHtml(story.source_name)} • ${escapeHtml(story.published_date)}</div><div class="story-source">${escapeHtml(shortHeadline(story.headline, 42))}</div></div><blockquote class="quote-block">${escapeHtml(story.why_it_matters)}</blockquote><div class="story-grid"><div class="copy"><h2 class="headline">${escapeHtml(headline)}</h2><p>${lead}</p><p>${detail}</p><a class="cta" href="${escapeAttribute(story.story_url)}">Read the full story</a></div><figure class="figure"><img loading="eager" referrerpolicy="no-referrer" src="${escapeAttribute(imagePath)}" alt="${escapeAttribute(story.image_alt)}"><figcaption>Source image from the original story page.</figcaption></figure></div></div></section>`;
  }

  if (style === "spread-techgrid") {
    return `<section id="${storyId}" class="${classes}"><div class="spread-inner"><div class="spread-header"><div class="story-index">${escapeHtml(story.section)} • Story ${pad(index + 1)} • ${escapeHtml(story.source_name)} • ${escapeHtml(story.published_date)}</div><div class="story-source">${escapeHtml(shortHeadline(story.headline, 42))}</div></div><div class="terminal-note">Prototype lane • workflow impact • primary source</div><div class="story-columns"><figure class="figure"><img loading="eager" referrerpolicy="no-referrer" src="${escapeAttribute(imagePath)}" alt="${escapeAttribute(story.image_alt)}"><figcaption>Source image from the original story page.</figcaption></figure><div class="copy"><h2 class="headline">${escapeHtml(headline)}</h2><p>${lead}</p><p>${detail}</p><a class="cta" href="${escapeAttribute(story.story_url)}">Read the full story</a></div></div></div></section>`;
  }

  if (style === "spread-stamped") {
    return `<section id="${storyId}" class="${classes}"><div class="stamp">${story.urgent ? "Act Soon" : "Worth Reviewing"}</div><div class="spread-inner"><div class="spread-header"><div class="story-index">${escapeHtml(story.section)} • Story ${pad(index + 1)} • ${escapeHtml(story.source_name)} • ${escapeHtml(story.published_date)}</div><div class="story-source">${escapeHtml(shortHeadline(story.headline, 42))}</div></div><div class="story-grid"><div class="copy"><h2 class="headline">${escapeHtml(headline)}</h2><p>${lead}</p><p>${detail}</p><a class="cta" href="${escapeAttribute(story.story_url)}">Read the full story</a></div><figure class="figure"><img loading="eager" referrerpolicy="no-referrer" src="${escapeAttribute(imagePath)}" alt="${escapeAttribute(story.image_alt)}"><figcaption>Source image from the original story page.</figcaption></figure></div></div></section>`;
  }

  if (style === "spread-ribbon") {
    return `<section id="${storyId}" class="${classes}"><div class="spread-inner"><div class="spread-header"><div class="story-index">${escapeHtml(story.section)} • Story ${pad(index + 1)} • ${escapeHtml(story.source_name)} • ${escapeHtml(story.published_date)}</div><div class="story-source">${escapeHtml(shortHeadline(story.headline, 42))}</div></div><div class="ribbon-tag">${story.urgent ? "Immediate workflow signal" : "Team discussion candidate"}</div><div class="story-columns"><figure class="figure"><img loading="eager" referrerpolicy="no-referrer" src="${escapeAttribute(imagePath)}" alt="${escapeAttribute(story.image_alt)}"><figcaption>Source image from the original story page.</figcaption></figure><div class="copy"><h2 class="headline">${escapeHtml(headline)}</h2><p>${lead}</p><p>${detail}</p><a class="cta" href="${escapeAttribute(story.story_url)}">Read the full story</a></div></div></div></section>`;
  }

  if (style === "spread-poster") {
    return `<section id="${storyId}" class="${classes}"><div class="spread-inner"><div class="spread-header"><div class="story-index">${escapeHtml(story.section)} • Story ${pad(index + 1)} • ${escapeHtml(story.source_name)} • ${escapeHtml(story.published_date)}</div><div class="story-source">${escapeHtml(shortHeadline(story.headline, 42))}</div></div><div class="story-grid"><div class="poster-box copy"><h2 class="headline">${escapeHtml(headline)}</h2><p>${lead}</p><p>${detail}</p><a class="cta light" href="${escapeAttribute(story.story_url)}">Read the full story</a></div><figure class="figure"><img loading="eager" referrerpolicy="no-referrer" src="${escapeAttribute(imagePath)}" alt="${escapeAttribute(story.image_alt)}"><figcaption>Source image from the original story page.</figcaption></figure></div></div></section>`;
  }

  const numeralAttr = style === "spread-numeral" ? ` data-mark="${pad(index + 1)}"` : "";
  const lightClass = style === "spread-midnight" ? " light" : "";
  const layoutClass = index % 2 === 0 ? "story-grid" : "story-columns";

  return `<section id="${storyId}" class="${classes}"${numeralAttr}><div class="spread-inner"><div class="spread-header"><div class="story-index">${escapeHtml(story.section)} • Story ${pad(index + 1)} • ${escapeHtml(story.source_name)} • ${escapeHtml(story.published_date)}</div><div class="story-source">${escapeHtml(shortHeadline(story.headline, 42))}</div></div><div class="rule"></div><div class="${layoutClass}"><div class="copy"><h2 class="headline">${escapeHtml(headline)}</h2><p>${lead}</p><p>${detail}</p><a class="cta${lightClass}" href="${escapeAttribute(story.story_url)}">Read the full story</a></div><figure class="figure"><img loading="eager" referrerpolicy="no-referrer" src="${escapeAttribute(imagePath)}" alt="${escapeAttribute(story.image_alt)}"><figcaption>Source image from the original story page.</figcaption></figure></div></div></section>`;
}

function renderSummaryText(edition) {
  const editionPath =
    EDITION_TYPE === "weekly"
      ? `weekly/${isoWeekId(edition.edition_date)}.html`
      : `archives/${edition.edition_date.slice(0, 4)}/${edition.edition_date.slice(5, 7)}/${edition.edition_date}.html`;
  return [
    `PMI Creative Studio ${EDITION_TYPE === "weekly" ? "Weekly Edition" : "Morning Edition"}`,
    longDate(edition.edition_date),
    "Homepage: index.html",
    `Archive copy: ${editionPath}`,
    "",
    "SLACK VERSION",
    edition.slack_summary.trim(),
    "",
    "EMAIL VERSION",
    `Subject: ${edition.email_subject.trim()}`,
    "",
    edition.email_summary.trim(),
    "",
    `Read the full magazine: ${EDITION_TYPE === "weekly" ? "weekly/latest.html" : "index.html"}`
  ].join("\n");
}

function renderSummaryHtml(edition) {
  const editionTitle = EDITION_TYPE === "weekly" ? "Weekly Edition" : "Morning Edition";
  const editionPath =
    EDITION_TYPE === "weekly"
      ? `weekly/${isoWeekId(edition.edition_date)}.html`
      : `archives/${edition.edition_date.slice(0, 4)}/${edition.edition_date.slice(5, 7)}/${edition.edition_date}.html`;
  const homePath = EDITION_TYPE === "weekly" ? "weekly/latest.html" : "index.html";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${editionTitle} Share Pack | ${edition.edition_date}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root { --violet:${BRAND.violet}; --ink:${BRAND.ink}; --tangerine:${BRAND.tangerine}; --line:rgba(32,15,59,.12); --white:#fff; }
    * { box-sizing:border-box; } body { margin:0; font-family:"Inter",sans-serif; color:var(--ink); line-height:1.7; background:radial-gradient(circle at top left, rgba(5,191,224,.12), transparent 28%),linear-gradient(180deg,#f1ebfb 0%,#fbf9fe 100%); }
    .shell { width:min(calc(100% - 28px),980px); margin:0 auto; padding:28px 0 48px; }
    .hero { padding:28px 30px; border-radius:28px; background:linear-gradient(135deg,${BRAND.violet},${BRAND.ink}); color:var(--white); box-shadow:0 24px 60px rgba(32,15,59,.18); }
    .hero h1,.card h2 { margin:0 0 12px; font-family:"Fraunces",serif; line-height:.98; letter-spacing:-.02em; }
    .hero h1 { font-size:clamp(2.2rem,5vw,4rem); } .hero p { margin:0; font-size:1.06rem; color:rgba(255,255,255,.88); }
    .paths { margin-top:18px; display:grid; gap:8px; font-size:.95rem; } .grid { display:grid; grid-template-columns:1fr 1fr; gap:22px; margin-top:22px; }
    .card { background:rgba(255,255,255,.92); border:1px solid var(--line); border-radius:24px; padding:24px; box-shadow:0 18px 44px rgba(32,15,59,.08); }
    .label { display:inline-block; margin-bottom:12px; padding:7px 11px; border-radius:999px; background:rgba(79,23,168,.08); color:var(--violet); font-size:.82rem; font-weight:700; text-transform:uppercase; letter-spacing:.12em; }
    .message { white-space:pre-wrap; font-size:1rem; } .subject { margin:0 0 14px; padding:12px 14px; border-left:4px solid var(--tangerine); background:rgba(255,97,15,.07); border-radius:0 14px 14px 0; font-weight:700; }
    @media (max-width:820px){ .grid{grid-template-columns:1fr;} .hero,.card{padding:22px;} }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <h1>${editionTitle} share pack</h1>
      <p>This is the follow-up file generated after the magazine is published.</p>
      <div class="paths">
        <div><strong>Homepage:</strong> ${homePath}</div>
        <div><strong>Archive copy:</strong> ${editionPath}</div>
      </div>
    </section>
    <section class="grid">
      <article class="card">
        <div class="label">Slack</div>
        <h2>Share in team chat</h2>
        <div class="message">${escapeHtml(edition.slack_summary.trim())}</div>
      </article>
      <article class="card">
        <div class="label">Email</div>
        <h2>Share by email</h2>
        <div class="subject">Subject: ${escapeHtml(edition.email_subject.trim())}</div>
        <div class="message">${escapeHtml(edition.email_summary.trim())}</div>
      </article>
    </section>
  </main>
</body>
</html>`;
}

async function collectRecentCoverage(root, runDate) {
  const archivesRoot = path.join(root, "archives");
  const entries = [];

  try {
    for (const year of await listDirs(archivesRoot)) {
      const yearPath = path.join(archivesRoot, year);
      for (const month of await listDirs(yearPath)) {
        const monthPath = path.join(yearPath, month);
        const files = await fs.readdir(monthPath);
        for (const file of files) {
          if (!file.endsWith(".html") || file === "index.html") continue;
          const date = file.replace(/\.html$/, "");
          if (!isWithinLastDays(date, runDate, 14)) continue;
          const text = await fs.readFile(path.join(monthPath, file), "utf8");
          for (const headline of extractHeadlinesFromHtml(text).slice(0, 10)) {
            entries.push({ date, headline });
          }
        }
      }
    }
  } catch {
    return [];
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));

  const unique = [];
  const seen = new Set();
  for (const item of entries) {
    const key = `${item.date}::${item.headline.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 30) break;
  }
  return unique;
}

async function listDirs(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch {
    return [];
  }
}

function extractHeadlinesFromHtml(text) {
  const matches = [...text.matchAll(/<h2[^>]*>(.*?)<\/h2>/gis)];
  return matches
    .map((match) => stripHtml(match[1]).trim())
    .filter(Boolean)
    .map((headline) => headline.replace(/^⚡\s*/, ""));
}

function stripHtml(value) {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}

function isWithinLastDays(dateString, runDate, days) {
  const left = new Date(`${dateString}T12:00:00Z`);
  const right = new Date(`${runDate}T12:00:00Z`);
  const diffDays = Math.floor((right - left) / 86400000);
  return diffDays >= 0 && diffDays <= days;
}

async function writeArchiveIndexes(root) {
  const archivesRoot = path.join(root, "archives");
  const years = await listDirs(archivesRoot);
  const monthEntries = [];

  for (const year of years) {
    const months = await listDirs(path.join(archivesRoot, year));
    for (const month of months) {
      const monthPath = path.join(archivesRoot, year, month);
      const files = (await fs.readdir(monthPath))
        .filter((file) => file.endsWith(".html") && file !== "index.html")
        .sort()
        .reverse();
      if (!files.length) continue;

      const monthItems = files.map((file) => {
        const date = file.replace(/\.html$/, "");
        return {
          date,
          href: `/archives/${year}/${month}/${file}`,
          title: longDate(date)
        };
      });

      monthEntries.push({
        year,
        month,
        href: `/archives/${year}/${month}/`,
        label: `${year}-${month}`,
        items: monthItems
      });

      await fs.writeFile(
        path.join(monthPath, "index.html"),
        renderArchiveMonthIndex(year, month, monthItems)
      );
    }
  }

  monthEntries.sort((a, b) => `${b.year}${b.month}`.localeCompare(`${a.year}${a.month}`));
  await fs.writeFile(path.join(archivesRoot, "index.html"), renderArchiveLanding(monthEntries));
}

function renderArchiveLanding(monthEntries) {
  const cards = monthEntries
    .map(
      (entry) => `<article class="card"><div class="label">${entry.label}</div><h2><a href="${entry.href}">${escapeHtml(monthName(entry.month))} ${entry.year}</a></h2><ul>${entry.items
        .slice(0, 8)
        .map((item) => `<li><a href="${item.href}">${escapeHtml(item.title)}</a></li>`)
        .join("")}</ul></article>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Morning Edition Archive</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body{margin:0;font-family:"Inter",sans-serif;color:${BRAND.ink};background:linear-gradient(180deg,#f3eefb 0%,#fbf8ff 100%);}
    .shell{width:min(calc(100% - 28px),1080px);margin:0 auto;padding:28px 0 48px;}
    .hero,.card{background:rgba(255,255,255,.92);border:1px solid ${BRAND.line};border-radius:28px;box-shadow:0 18px 44px rgba(32,15,59,.08);}
    .hero{padding:28px 30px;margin-bottom:22px;}
    .hero h1,.card h2{margin:0 0 12px;font-family:"Fraunces",serif;line-height:1;}
    .hero p{margin:0;color:rgba(32,15,59,.72);}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;}
    .card{padding:22px;}
    .label{display:inline-block;margin-bottom:10px;padding:7px 11px;border-radius:999px;background:rgba(79,23,168,.08);color:${BRAND.violet};font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;}
    ul{margin:0;padding-left:18px;} li+li{margin-top:8px;} a{text-decoration:none;color:inherit;} a:hover{text-decoration:underline;}
    @media (max-width:820px){.grid{grid-template-columns:1fr;}.hero,.card{padding:22px;}}
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <h1>Morning Edition archive</h1>
      <p>Browse previous PMI Creative Studio daily issues by month.</p>
    </section>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>`;
}

function renderArchiveMonthIndex(year, month, items) {
  const list = items
    .map((item) => `<li><a href="${item.href}">${escapeHtml(item.title)}</a></li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${monthName(month)} ${year} Archive</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body{margin:0;font-family:"Inter",sans-serif;color:${BRAND.ink};background:linear-gradient(180deg,#f3eefb 0%,#fbf8ff 100%);}
    .shell{width:min(calc(100% - 28px),980px);margin:0 auto;padding:28px 0 48px;}
    .card{background:rgba(255,255,255,.92);border:1px solid ${BRAND.line};border-radius:28px;box-shadow:0 18px 44px rgba(32,15,59,.08);padding:28px 30px;}
    h1{margin:0 0 12px;font-family:"Fraunces",serif;line-height:1;}
    p{margin:0 0 18px;color:rgba(32,15,59,.72);}
    ul{margin:0;padding-left:18px;} li+li{margin-top:10px;} a{text-decoration:none;color:inherit;} a:hover{text-decoration:underline;}
    .back{display:inline-block;margin-bottom:16px;color:${BRAND.violet};font-weight:700;}
  </style>
</head>
<body>
  <main class="shell">
    <section class="card">
      <a class="back" href="/archives/">Back to archive</a>
      <h1>${monthName(month)} ${year}</h1>
      <p>Daily Morning Edition issues published during this month.</p>
      <ul>${list}</ul>
    </section>
  </main>
</body>
</html>`;
}

function monthName(month) {
  const date = new Date(`2026-${month}-01T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(date);
}

function longDate(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(`${dateString}T12:00:00-03:00`));
}

function isoWeekId(dateString) {
  const date = new Date(`${dateString}T12:00:00Z`);
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((date - firstThursday) / 604800000);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function shortHeadline(text, length) {
  return text.length <= length ? text : `${text.slice(0, length - 1).trim()}…`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
