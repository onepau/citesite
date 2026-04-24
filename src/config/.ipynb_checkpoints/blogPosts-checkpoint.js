/* ═══════════════════════════════════════════════════════════════════
   BLOG POSTS — Seed data / fallback
   ───────────────────────────────────────────────────────────────────
   In production, this is replaced by Markdown files in content/blog/
   managed through Decap CMS at /admin.
   ═══════════════════════════════════════════════════════════════════ */

export const BLOG_POSTS = [
  {
    id: 1,
    slug: "what-is-geo",
    title: "What Is Generative Engine Optimisation (GEO)?",
    excerpt:
      "GEO is the practice of optimising your content to be cited by AI-powered search engines and large language models. Here's what you need to know.",
    category: "GEO Fundamentals",
    date: "2026-04-20",
    readTime: "8 min",
    featured: true,
  },
  {
    id: 2,
    slug: "llms-txt-guide",
    title: "The Complete Guide to llms.txt",
    excerpt:
      "How to create and maintain an llms.txt file that helps AI systems understand and correctly cite your website content.",
    category: "Technical Guide",
    date: "2026-04-15",
    readTime: "6 min",
    featured: false,
  },
  {
    id: 3,
    slug: "json-ld-eeat",
    title: "JSON-LD Structured Data for E-E-A-T Signals",
    excerpt:
      "A practical walkthrough of building a comprehensive JSON-LD @graph that communicates expertise, authority, and trust to AI systems.",
    category: "Structured Data",
    date: "2026-04-10",
    readTime: "10 min",
    featured: true,
  },
  {
    id: 4,
    slug: "seo-vs-geo",
    title: "SEO vs GEO: What's Changed and What Hasn't",
    excerpt:
      "Traditional SEO isn't dead — but the rules are evolving. Understanding where SEO ends and GEO begins is crucial for modern visibility.",
    category: "Strategy",
    date: "2026-04-05",
    readTime: "7 min",
    featured: false,
  },
];