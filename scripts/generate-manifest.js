#!/usr/bin/env node
import { readdir, readFile, writeFile } from "fs/promises";
import { join, basename } from "path";
import { fileURLToPath } from "url";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const SITE = "https://citesite.net";

const SANITIZE_OPTIONS = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, "img"],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    a: ["href", "name", "target", "rel"],
    code: ["class"],
    pre: ["class"],
    span: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BLOG_DIR = join(ROOT, "content/blog");
const PUBLIC_DIR = join(ROOT, "public");
const MANIFEST_OUT = join(PUBLIC_DIR, "blog-manifest.json");
const SITEMAP_OUT = join(PUBLIC_DIR, "sitemap.xml");

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const lines = match[1].split(/\r?\n/);
  const meta = {};
  let key = null;
  let val = "";

  for (const line of lines) {
    const m = line.match(/^([\w-]+)\s*:\s*(.*)/);
    if (m) {
      if (key) meta[key] = val.trim().replace(/^["']|["']$/g, "");
      key = m[1];
      val = m[2];
    } else if (key && /^\s+\S/.test(line)) {
      val += " " + line.trim();
    }
  }
  if (key) meta[key] = val.trim().replace(/^["']|["']$/g, "");

  return { meta, body: match[2] };
}

/* ───────────────────────────────────────────────────────────────────
   Image dimensions — read width/height from PNG / JPEG headers so
   <img> tags carry explicit dimensions and reserve layout space (CLS).
   ─────────────────────────────────────────────────────────────────── */

function pngDimensions(buf) {
  // 8-byte signature, then IHDR: width at 16, height at 20 (big-endian)
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpegDimensions(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let off = 2;
  while (off + 9 < buf.length) {
    if (buf[off] !== 0xff) return null;
    const marker = buf[off + 1];
    // SOF0–SOF15 (skip DHT 0xC4, JPG 0xC8, DAC 0xCC) carry dimensions
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    ) {
      return {
        height: buf.readUInt16BE(off + 5),
        width: buf.readUInt16BE(off + 7),
      };
    }
    off += 2 + buf.readUInt16BE(off + 2);
  }
  return null;
}

async function imageDimensions(srcPath) {
  try {
    const buf = await readFile(join(PUBLIC_DIR, srcPath));
    return pngDimensions(buf) || jpegDimensions(buf);
  } catch {
    return null;
  }
}

// Add width/height (from the file on disk) plus lazy-loading attributes
// to every site-local <img> in the rendered post HTML. The first image is
// left eager — it is usually the LCP element, and lazy-loading it delays LCP.
async function annotateImages(html) {
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  for (const [index, tag] of imgTags.entries()) {
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
    let annotated = tag;
    if (src?.startsWith("/") && !/\bwidth=/.test(tag)) {
      const dims = await imageDimensions(src);
      if (dims) {
        annotated = annotated.replace(
          /^<img\b/,
          `<img width="${dims.width}" height="${dims.height}"`,
        );
      }
    }
    if (!/\bloading=/.test(annotated)) {
      annotated = annotated.replace(
        /^<img\b/,
        index === 0
          ? '<img decoding="async" fetchpriority="high"'
          : '<img loading="lazy" decoding="async"',
      );
    }
    if (annotated !== tag) html = html.replace(tag, annotated);
  }
  return html;
}

/* ───────────────────────────────────────────────────────────────────
   Extract post-specific JSON-LD schema and strip editorial sections.
   Handles content files that include "## Schema markup", "## SEO metadata",
   and "## Image suggestions" sections added by content tools.
   ─────────────────────────────────────────────────────────────────── */

function extractSchemaAndCleanBody(body) {
  // Extract JSON-LD from "## Schema markup" code fence before stripping
  let schema = null;
  const schemaMatch = body.match(
    /## Schema markup\s*\n+```json\s*\n([\s\S]*?)```/,
  );
  if (schemaMatch) {
    try {
      schema = JSON.parse(schemaMatch[1]);
    } catch {
      // Malformed JSON — skip
    }
  }

  // Strip editorial tail sections that must not appear in rendered HTML
  const editorialIdx = body.search(/\n---\s*\n## SEO metadata/);
  const trimmed = editorialIdx > -1 ? body.slice(0, editorialIdx) : body;

  // Resolve content-tool link markers to plain text / nothing
  const cleaned = trimmed
    // [INTERNAL LINK: /path "anchor text"] → anchor text
    .replace(/\[INTERNAL LINK:\s*[^\s\]]+\s+"([^"]+)"\]/g, "$1")
    // [EXTERNAL LINK: description] → remove silently
    .replace(/\s*\[EXTERNAL LINK:[^\]]*\]/g, "");

  return { schema, cleanBody: cleaned };
}

/* ───────────────────────────────────────────────────────────────────
   Build manifest
   ─────────────────────────────────────────────────────────────────── */

const files = (await readdir(BLOG_DIR)).filter((f) => f.endsWith(".md"));

const posts = await Promise.all(
  files.map(async (file) => {
    const slug = basename(file, ".md");
    const raw = await readFile(join(BLOG_DIR, file), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const { schema, cleanBody } = extractSchemaAndCleanBody(body);
    return {
      slug,
      title: meta.title || slug,
      date: meta.date || "",
      category: meta.category || "",
      excerpt: meta.excerpt || "",
      readTime: meta.readTime || "",
      featured: meta.featured === "true",
      schema: schema || null,
      html: await annotateImages(
        sanitizeHtml(marked.parse(cleanBody), SANITIZE_OPTIONS),
      ),
    };
  }),
);

posts.sort((a, b) => new Date(b.date) - new Date(a.date));

await writeFile(MANIFEST_OUT, JSON.stringify(posts));
console.log(`blog-manifest.json → ${posts.length} posts`);

/* ───────────────────────────────────────────────────────────────────
   Build sitemap.xml — robots.txt declares it, and the SPA fallback
   would otherwise serve HTML with a 200 at /sitemap.xml.
   ─────────────────────────────────────────────────────────────────── */

const xmlEscape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const urls = [
  { loc: `${SITE}/` },
  { loc: `${SITE}/about` },
  { loc: `${SITE}/faq` },
  ...posts.map((p) => ({
    loc: `${SITE}/?post=${p.slug}`,
    lastmod: p.date ? p.date.slice(0, 10) : null,
  })),
];

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(({ loc, lastmod }) =>
    [
      "  <url>",
      `    <loc>${xmlEscape(loc)}</loc>`,
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n"),
  ),
  "</urlset>",
  "",
].join("\n");

await writeFile(SITEMAP_OUT, sitemap);
console.log(`sitemap.xml → ${urls.length} URLs`);
