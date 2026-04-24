/* ═══════════════════════════════════════════════════════════════════
   AUDIT ENGINE CONFIGURATION
   ───────────────────────────────────────────────────────────────────
   This is the single source of truth for all audit criteria.

   TO UPDATE:
   - Add/remove/reorder items in AUDIT_DIMENSIONS
   - Adjust weights (must sum to 1.0)
   - Change tier to 'free' or 'paid' to control visibility
   - Update scoring bands, checks, and recommendation templates

   WEIGHT VALIDATION:
   const total = AUDIT_DIMENSIONS.reduce((s, d) => s + d.weight, 0);
   console.assert(Math.abs(total - 1.0) < 0.001, `Weights: ${total}`);
   ═══════════════════════════════════════════════════════════════════ */

export const AUDIT_DIMENSIONS = [
  {
    id: "crawlability",
    dimension: "A",
    name: "Crawlability & Retrievability",
    shortName: "Crawlability",
    weight: 0.20,
    tier: "free",
    icon: "Globe",
    description:
      "SSR vs CSR, robots.txt directives (including AI-bot rules for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot), sitemap, canonical, response codes, llms.txt, HTTPS, mobile rendering.",
    scoringBands: [
      { min: 0, max: 30, label: "Critical", desc: "AI bots see empty or broken content" },
      { min: 31, max: 60, label: "Needs Work", desc: "Crawlable with friction" },
      { min: 61, max: 85, label: "Good", desc: "Cleanly crawlable" },
      { min: 86, max: 100, label: "Excellent", desc: "Cleanly crawlable with explicit AI-bot allowances and llms.txt support" },
    ],
    checks: [
      { id: "ssr-csr", name: "Server-side rendering", description: "Page returns substantive HTML to non-JS crawlers", maxPoints: 20, tier: "free" },
      { id: "robots-ai", name: "AI bot directives", description: "robots.txt rules for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot", maxPoints: 20, tier: "paid" },
      { id: "sitemap", name: "XML Sitemap", description: "Valid sitemap.xml present and referenced in robots.txt", maxPoints: 15, tier: "free" },
      { id: "canonical", name: "Canonical tag", description: "Self-referencing canonical URL present", maxPoints: 10, tier: "free" },
      { id: "llms-txt", name: "llms.txt support", description: "Presence of /llms.txt and/or /llms-full.txt", maxPoints: 15, tier: "paid" },
      { id: "https", name: "HTTPS", description: "Served over HTTPS with valid certificate", maxPoints: 10, tier: "free" },
      { id: "mobile", name: "Mobile rendering", description: "Mobile viewport meta tag and responsive rendering", maxPoints: 10, tier: "free" },
    ],
    recommendations: [
      "Implement server-side rendering (SSR) or static site generation (SSG) to ensure AI crawlers receive full HTML content.",
      "Add explicit AI-bot allow rules to robots.txt for GPTBot, ClaudeBot, PerplexityBot.",
      "Create and maintain an /llms.txt file describing your site's purpose, key content areas, and preferred citation format.",
    ],
  },
  {
    id: "content-structure",
    dimension: "B",
    name: "Content Structure & Passage Retrievability",
    shortName: "Content Structure",
    weight: 0.20,
    tier: "free",
    icon: "FileText",
    description:
      "Semantic HTML, heading hierarchy, self-contained paragraphs, definitional opening sentence, lists, tables, Q&A blocks, chunk-level answerability for passage retrieval.",
    scoringBands: [
      { min: 0, max: 30, label: "Critical", desc: "Wall of text, no structure" },
      { min: 31, max: 60, label: "Needs Work", desc: "Some structure but weak chunk answerability" },
      { min: 61, max: 85, label: "Good", desc: "Well-structured, answer-ready" },
      { min: 86, max: 100, label: "Excellent", desc: "Purpose-built for passage retrieval" },
    ],
    checks: [
      { id: "semantic-html", name: "Semantic HTML", description: "Uses article, section, nav, aside, header, footer correctly", maxPoints: 15, tier: "free" },
      { id: "heading-hierarchy", name: "Heading hierarchy", description: "Logical H1-H6 nesting without skips", maxPoints: 15, tier: "free" },
      { id: "self-contained", name: "Self-contained paragraphs", description: "Paragraphs are independently meaningful without surrounding context", maxPoints: 20, tier: "paid" },
      { id: "definitional", name: "Definitional opening", description: "Key sections begin with a clear, citable definition sentence", maxPoints: 20, tier: "paid" },
      { id: "qa-blocks", name: "Q&A / FAQ blocks", description: "Presence of question-and-answer formatted content", maxPoints: 15, tier: "paid" },
      { id: "lists-tables", name: "Lists & tables", description: "Structured data presented in scannable list or table format", maxPoints: 15, tier: "free" },
    ],
    recommendations: [
      "Begin each major section with a definitional sentence that directly answers 'What is [topic]?'",
      "Break long paragraphs into self-contained chunks that can be extracted as standalone passages.",
      "Add FAQ sections using Q&A format with corresponding FAQPage schema markup.",
    ],
  },
  {
    id: "structured-data",
    dimension: "C",
    name: "Structured Data & Machine-Readable Signals",
    shortName: "Structured Data",
    weight: 0.15,
    tier: "paid",
    icon: "BarChart3",
    description:
      "JSON-LD @type(s) and relevance, required and recommended properties, @graph for multiple types, Schema.org validity, author, publisher, datePublished, dateModified, sameAs, mentions, Open Graph, Twitter Card.",
    scoringBands: [
      { min: 0, max: 30, label: "Critical", desc: "None or broken" },
      { min: 31, max: 60, label: "Needs Work", desc: "Present but incomplete" },
      { min: 61, max: 85, label: "Good", desc: "Valid and appropriate" },
      { min: 86, max: 100, label: "Excellent", desc: "Comprehensive multi-type graph with full E-E-A-T signalling" },
    ],
    checks: [
      { id: "jsonld-present", name: "JSON-LD present", description: "At least one valid JSON-LD block in page source", maxPoints: 15, tier: "free" },
      { id: "jsonld-types", name: "Appropriate @types", description: "Schema types match content type (Article, Product, FAQPage, etc.)", maxPoints: 20, tier: "paid" },
      { id: "jsonld-graph", name: "@graph structure", description: "Multiple related types linked via @graph", maxPoints: 15, tier: "paid" },
      { id: "eeat-props", name: "E-E-A-T properties", description: "author, publisher, datePublished, dateModified, sameAs present", maxPoints: 20, tier: "paid" },
      { id: "og-tags", name: "Open Graph tags", description: "Complete OG metadata for social sharing", maxPoints: 15, tier: "free" },
      { id: "twitter-card", name: "Twitter/X Card", description: "Twitter card meta tags present", maxPoints: 15, tier: "free" },
    ],
    recommendations: [
      "Implement JSON-LD @graph combining Article/WebPage, Person (author), and Organization (publisher) types.",
      "Add datePublished and dateModified to signal content freshness to AI systems.",
      "Include sameAs links pointing to authoritative profiles (LinkedIn, official bios, ORCID).",
    ],
  },
  {
    id: "eeat",
    dimension: "D",
    name: "E-E-A-T & Citability Signals",
    shortName: "E-E-A-T",
    weight: 0.15,
    tier: "paid",
    icon: "Shield",
    description:
      "Named author with bio and credentials, Person and Organization schema, outbound citations to primary sources, original data, about/contact pages, sameAs links, reviews and press mentions.",
    scoringBands: [
      { min: 0, max: 30, label: "Critical", desc: "Anonymous, no sourcing" },
      { min: 31, max: 60, label: "Needs Work", desc: "Some attribution" },
      { min: 61, max: 85, label: "Good", desc: "Clear authorship and sourcing" },
      { min: 86, max: 100, label: "Excellent", desc: "Fully verifiable expertise with linked credentials" },
    ],
    checks: [
      { id: "named-author", name: "Named author", description: "Content attributed to a named individual with visible bio", maxPoints: 20, tier: "paid" },
      { id: "author-schema", name: "Author schema", description: "Person schema with credentials, sameAs, and expertise signals", maxPoints: 20, tier: "paid" },
      { id: "outbound-citations", name: "Outbound citations", description: "Links to primary sources, studies, or authoritative references", maxPoints: 20, tier: "paid" },
      { id: "original-data", name: "Original data/experience", description: "Evidence of primary research or first-hand experience", maxPoints: 20, tier: "paid" },
      { id: "about-contact", name: "About & Contact pages", description: "Discoverable about and contact pages linked from content", maxPoints: 20, tier: "paid" },
    ],
    recommendations: [
      "Add a visible author bio with credentials, headshot, and links to authoritative profiles.",
      "Cite primary sources (studies, reports, official documentation) rather than secondary aggregators.",
      "Create a comprehensive About page with Organization schema, including founding date, team, and press mentions.",
    ],
  },
  {
    id: "content-quality",
    dimension: "E",
    name: "Content Quality & Topical Completeness",
    shortName: "Content Quality",
    weight: 0.15,
    tier: "paid",
    icon: "Star",
    description:
      "Depth relative to query intent, coverage of adjacent entities and follow-up questions, originality vs. commodity content, freshness, evidence of primary research.",
    scoringBands: [
      { min: 0, max: 30, label: "Critical", desc: "Thin or duplicative" },
      { min: 31, max: 60, label: "Needs Work", desc: "Adequate but generic" },
      { min: 61, max: 85, label: "Good", desc: "Comprehensive and substantive" },
      { min: 86, max: 100, label: "Excellent", desc: "Original, authoritative, definitional for the query" },
    ],
    checks: [
      { id: "depth", name: "Content depth", description: "Sufficient depth relative to likely query intent", maxPoints: 25, tier: "paid" },
      { id: "adjacent-entities", name: "Adjacent entity coverage", description: "Covers related topics and likely follow-up questions", maxPoints: 20, tier: "paid" },
      { id: "originality", name: "Originality", description: "Original perspective, data, or insight vs. commodity content", maxPoints: 25, tier: "paid" },
      { id: "freshness", name: "Freshness signals", description: "Evidence of recent updates and content maintenance", maxPoints: 15, tier: "paid" },
      { id: "primary-research", name: "Primary research", description: "First-hand data, case studies, or experiential evidence", maxPoints: 15, tier: "paid" },
    ],
    recommendations: [
      "Address the top 3-5 follow-up questions a reader would naturally ask after consuming your content.",
      "Add original data points, case studies, or first-hand observations that cannot be found elsewhere.",
      "Display visible last-updated dates and maintain a regular content refresh cadence.",
    ],
  },
  {
    id: "technical-seo",
    dimension: "F",
    name: "On-Page Technical SEO",
    shortName: "Technical SEO",
    weight: 0.15,
    tier: "free",
    icon: "Zap",
    description:
      "Title tag, meta description, H1, image alt text, internal linking, URL structure, Core Web Vitals signals, mobile viewport tag.",
    scoringBands: [
      { min: 0, max: 30, label: "Critical", desc: "Multiple fundamentals missing" },
      { min: 31, max: 60, label: "Needs Work", desc: "Basics covered but weak" },
      { min: 61, max: 85, label: "Good", desc: "Well-executed" },
      { min: 86, max: 100, label: "Excellent", desc: "Polished across all fundamentals" },
    ],
    checks: [
      { id: "title-tag", name: "Title tag", description: "Unique, descriptive title under 60 characters", maxPoints: 15, tier: "free" },
      { id: "meta-desc", name: "Meta description", description: "Compelling meta description under 160 characters", maxPoints: 15, tier: "free" },
      { id: "h1", name: "H1 tag", description: "Single, descriptive H1 matching page intent", maxPoints: 10, tier: "free" },
      { id: "img-alt", name: "Image alt text", description: "All content images have descriptive alt attributes", maxPoints: 15, tier: "free" },
      { id: "internal-links", name: "Internal linking", description: "Contextual internal links to related content", maxPoints: 15, tier: "paid" },
      { id: "url-structure", name: "URL structure", description: "Clean, descriptive, hyphenated URL slug", maxPoints: 15, tier: "free" },
      { id: "cwv", name: "Core Web Vitals", description: "Visible performance signals (no render-blocking, lazy loading, etc.)", maxPoints: 15, tier: "paid" },
    ],
    recommendations: [
      "Craft title tags that include the primary keyword within the first 30 characters.",
      "Add descriptive alt text to all images — describe content, not just 'image of...'.",
      "Implement lazy loading for below-fold images and defer non-critical JavaScript.",
    ],
  },
];