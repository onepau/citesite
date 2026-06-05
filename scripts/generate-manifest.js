#!/usr/bin/env node
import { readdir, readFile, writeFile } from "fs/promises";
import { join, basename } from "path";
import { fileURLToPath } from "url";
import { marked } from "marked";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BLOG_DIR = join(ROOT, "content/blog");
const OUT = join(ROOT, "public/blog-manifest.json");

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

const files = (await readdir(BLOG_DIR)).filter((f) => f.endsWith(".md"));

const posts = await Promise.all(
  files.map(async (file) => {
    const slug = basename(file, ".md");
    const raw = await readFile(join(BLOG_DIR, file), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    return {
      slug,
      title: meta.title || slug,
      date: meta.date || "",
      category: meta.category || "",
      excerpt: meta.excerpt || "",
      readTime: meta.readTime || "",
      featured: meta.featured === "true",
      html: marked.parse(body),
    };
  }),
);

posts.sort((a, b) => new Date(b.date) - new Date(a.date));

await writeFile(OUT, JSON.stringify(posts));
console.log(`blog-manifest.json → ${posts.length} posts`);
