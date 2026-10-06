const stories = [
  { title: "GPT-6 Astra raises the bar for designed artifacts", company: "OpenAI", section: "Tool Radar", url: "https://openai.com/index/gpt-6-astra/", detail: "Benchmark a branded deck and live-site brief for hierarchy, editability and template fidelity." },
  { title: "Isabel + Helen organize a decade around movement", company: "Wallpaper*", section: "Moodboard Fuel", url: "https://www.wallpaper.com/design-interiors/isabel-helen-the-conran-shop-motion-sickness-london-design-festival-2026", detail: "Study the archive as a taxonomy of motion, material and spatial behavior." },
  { title: "Canva turns four specialist tools into one production system", company: "Canva", section: "Tool Radar", url: "https://www.canva.com/newsroom/news/canva-prosuite-launch/", detail: "Map one campaign from master artwork through motion and adaptation without flattening the craft." },
  { title: "Casa de Rose lets bottle geometry finish the illustration", company: "Packaging of the World", section: "Moodboard Fuel", url: "https://packagingoftheworld.com/2026/09/casa-de-rose-wine-label-design.html", detail: "Approve the label on the exact filled vessel, not only on the dieline." },
  { title: "Figma frames become controlled inputs inside Weave", company: "Figma", section: "Tool Radar", url: "https://www.figma.com/release-notes/", detail: "Expose only copy and hero imagery while the source layout stays governed." },
  { title: "Guinness modernizes through the toucan instead of another logo", company: "Design Week", section: "Studio Signals", url: "https://www.designweek.co.uk/the-outline-tartan-reimagined-guinness-toucan-and-a-new-inhaler-21-09-2026/", detail: "Audit characters and secondary equities before commissioning a new master mark." },
  { title: "Impressions of Japan lets the grid carry observation", company: "Abduzeedo", section: "Moodboard Fuel", url: "https://abduzeedo.com/editorial-design-minimal-book-layout-design-ashutosh-rana", detail: "Lock page size, margins, columns and type roles before composing expressive spreads." },
  { title: "Google Flow turns the phone camera into a generative input surface", company: "Google", section: "Tool Radar", url: "https://www.producthunt.com/products/google", detail: "Test a scout-to-board workflow, then define the handoff into controlled production." },
  { title: "Jenna Arts turns awkward micro-actions into editorial character", company: "Creative Boom", section: "Moodboard Fuel", url: "https://www.creativeboom.com/work/jenna-arts-on-why-the-stumbling-silly-ordinary-human-is-the-only-one-worth-drawing/", detail: "Brief an image around a socially awkward micro-action instead of an abstract theme." },
  { title: "Adobe moves editable creative work into Gemini and deepens Claude", company: "Adobe", section: "Cover Story", url: "https://blog.adobe.com/en/publish/2026/09/24/adobe-comes-to-gemini-expands-what-you-can-do-in-claude", detail: "Judge layer fidelity, typography and round-trip control." },
  { title: "Midjourney adds live style previews before the full render", company: "Midjourney", section: "Tool Radar", url: "https://updates.midjourney.com/alpha-changelog-9-23-26/", detail: "Use one locked prompt to audition styles before changing a live moodboard workflow." },
  { title: "Google Translate keeps the product quiet and human reaction loud", company: "LBB", section: "Studio Signals", url: "https://lbbonline.com/work/182879", detail: "Storyboard the human consequence before the screen interaction." },
  { title: "HSBC scales global photography through three production lanes", company: "LBB", section: "Steal This Move", url: "https://lbbonline.com/news/hsbc-we-re-there-untold-fable", detail: "Define hero, local-author and licensed asset lanes before global production begins." },
  { title: "Canva's September stack turns brand assets into working systems", company: "Canva", section: "Tool Radar", url: "https://www.canva.com/design-school/resources/whats-new-canva-sep26/", detail: "Prototype one campaign hub from source data through publication." },
  { title: "ChatGPT Images 2.5 sharpens the edit loop", company: "OpenAI", section: "Tool Radar", url: "https://help.openai.com/en/articles/6825453-chatgpt-release-notes", detail: "Test locked compositions through controlled material, lighting and copy variations." },
  { title: "It's Nice That maps 72 emerging creative practices", company: "It's Nice That", section: "Moodboard Fuel", url: "https://www.itsnicethat.com/features/ones-to-watch-talent-showcase-launch-2026-290926", detail: "Build a six-person commissioning shortlist and name what each adds to the roster." },
  { title: "Sustainability literacy becomes a core design skill", company: "Design Week", section: "Watchlist", url: "https://www.designweek.co.uk/accidental-greenwashing-chacho-puebla-on-the-launch-of-his-anti-greenwashing-course/", detail: "Require a substantiation note beside every environmental cue and copy claim." },
  { title: "Canva turns a squirrel idea into a full campaign world", company: "Canva", section: "Studio Signals", url: "https://www.canva.com/newsroom/news/brand-campaign-2026/", detail: "Show one idea gaining formats and social behavior rather than listing product features." },
  { title: "Figma Community opens a portfolio format for process", company: "Figma", section: "Moodboard Fuel", url: "https://www.figma.com/release-notes/", detail: "Publish one experiment weekly and compare critique quality with finished case studies." },
  { title: "Figma Motion becomes reusable design-system infrastructure", company: "Figma", section: "Cover Story", url: "https://www.figma.com/release-notes/", detail: "Build and test a shared motion library across UI, social and Lottie." },
  { title: "Canva turns generated images into editable layers", company: "Canva", section: "Cover Story", url: "https://www.canva.com/newsroom/news/magic-layers-ai-assistants/", detail: "Stress-test text, masks, shadows and brand-editing speed." },
  { title: "PENNY treats the comment section as a paid creative layer", company: "LBB", section: "Debate Item", url: "https://lbbonline.com/news/penny-recognises-commenters-as-co-creators-and-rewards-entertaining-comments", detail: "Budget attribution, moderation and reward mechanics into social systems." },
  { title: "Stone Island builds Passport from collectors, vintage cameras and CRT post", company: "LBB", section: "Studio Signals", url: "https://lbbonline.com/news/stone-island-glenn-kitson-passport-collectors-series-selfridges", detail: "Define edit rules early and leave testimony open." },
  { title: "adidas uses one color transition as the whole campaign engine", company: "shots", section: "Studio Signals", url: "https://shots.net/news/view/go-beyond-the-grey-in-new-adidas-campaign", detail: "Define one before-and-after rule that survives every channel and crop." },
  { title: "Gymtrack makes the user's photograph the social template", company: "Product Hunt", section: "Moodboard Fuel", url: "https://www.producthunt.com/products/gymtrack-2", detail: "Design social outputs as layers with room for user imagery." },
  { title: "Silpo packages internet culture at shelf scale", company: "Packaging of the World", section: "Studio Signals", url: "https://packagingoftheworld.com/2026/10/a-playful-packaging-system-for-ukraines-largest-retail-chain.html", detail: "Separate the local joke layer from the load-bearing range rules." }
];

const radarTitles = [
  "GPT-6 Astra raises the bar for designed artifacts",
  "Canva turns four specialist tools into one production system",
  "Figma frames become controlled inputs inside Weave",
  "Google Flow turns the phone camera into a generative input surface",
  "Midjourney adds live style previews before the full render",
  "Canva's September stack turns brand assets into working systems",
  "ChatGPT Images 2.5 sharpens the edit loop"
];

const signalTitles = [
  "Guinness modernizes through the toucan instead of another logo",
  "Google Translate keeps the product quiet and human reaction loud",
  "Canva turns a squirrel idea into a full campaign world",
  "Stone Island builds Passport from collectors, vintage cameras and CRT post",
  "adidas uses one color transition as the whole campaign engine",
  "Silpo packages internet culture at shelf scale"
];

const moodTitles = [
  "Isabel + Helen organize a decade around movement",
  "Casa de Rose lets bottle geometry finish the illustration",
  "Impressions of Japan lets the grid carry observation",
  "Jenna Arts turns awkward micro-actions into editorial character",
  "It's Nice That maps 72 emerging creative practices",
  "Figma Community opens a portfolio format for process",
  "Gymtrack makes the user's photograph the social template",
  "Stone Island builds Passport from collectors, vintage cameras and CRT post"
];

const byTitle = (title) => stories.find((story) => story.title === title);
const escapeHtml = (value) => value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

document.querySelector("#radar-list").innerHTML = radarTitles.map((title, index) => {
  const story = byTitle(title);
  return `<article class="radar-item reveal"><span>0${index + 1}</span><h3>${escapeHtml(story.title)}</h3><p>${escapeHtml(story.detail)}</p><a href="${story.url}" target="_blank" rel="noreferrer">${index < 4 ? "Try" : "Watch"} ↗</a></article>`;
}).join("");

document.querySelector("#signal-list").innerHTML = signalTitles.map((title) => {
  const story = byTitle(title);
  return `<a class="signal-item reveal" href="${story.url}" target="_blank" rel="noreferrer"><h3>${escapeHtml(story.title)}</h3><p>${escapeHtml(story.detail)}</p><span>↗</span></a>`;
}).join("");

document.querySelector("#moodboard-grid").innerHTML = moodTitles.map((title, index) => {
  const story = byTitle(title);
  return `<a class="mood-item reveal" data-index="0${index + 1}" href="${story.url}" target="_blank" rel="noreferrer"><h3>${escapeHtml(story.title)}</h3><p>${escapeHtml(story.detail)}</p></a>`;
}).join("");

document.querySelector("#source-list").innerHTML = stories.map((story, index) => (
  `<a class="source-item reveal" href="${story.url}" target="_blank" rel="noreferrer"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(story.title)}</strong><small>${escapeHtml(story.company)} · ${escapeHtml(story.section)}</small></div></a>`
)).join("");

const progress = document.querySelector(".progress span");
const updateProgress = () => {
  const available = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${available > 0 ? window.scrollY / available : 0})`;
};
window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reducedMotion) {
  document.querySelectorAll(".reveal").forEach((item) => item.classList.add("visible"));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
  document.querySelectorAll(".reveal").forEach((item) => revealObserver.observe(item));
}

const navLinks = [...document.querySelectorAll("#issue-nav a")];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle("active", link.hash === `#${entry.target.id}`));
  });
}, { rootMargin: "-30% 0px -60%", threshold: 0 });
navLinks.forEach((link) => {
  const section = document.querySelector(link.hash);
  if (section) sectionObserver.observe(section);
});

const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector("#issue-nav");
menuButton.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});
navLinks.forEach((link) => link.addEventListener("click", () => {
  nav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
}));

document.querySelector(".print-button").addEventListener("click", () => window.print());
