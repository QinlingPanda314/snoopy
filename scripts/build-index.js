import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, parse } from 'node:path';
import { parseFrontmatter } from './parse-frontmatter.js';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

export function buildIndex(rootDir, opts = {}) {
  const srcPrefix = opts.srcPrefix ?? rootDir;
  const categories = [];
  for (const entry of readdirSync(rootDir).sort()) {
    if (entry.startsWith('.')) continue;
    const catDir = join(rootDir, entry);
    if (!statSync(catDir).isDirectory()) continue;
    const pictures = [];
    for (const file of readdirSync(catDir).sort()) {
      const { name, ext } = parse(file);
      if (!IMAGE_EXTS.has(ext.toLowerCase())) continue;
      const mdPath = join(catDir, `${name}.md`);
      let title = name;
      let description = '';
      try {
        const raw = readFileSync(mdPath, 'utf8');
        const { data, body } = parseFrontmatter(raw);
        if (data.title) title = data.title;
        description = body.trim();
      } catch {
        // no sibling .md — fine
      }
      pictures.push({
        src: `${srcPrefix}/${entry}/${file}`,
        title,
        description,
      });
    }
    if (pictures.length) categories.push({ name: entry, pictures });
  }
  return { categories };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const index = buildIndex('images', { srcPrefix: 'images' });
  writeFileSync('index.json', JSON.stringify(index, null, 2));
  console.log(
    `Wrote index.json — ${index.categories.length} categories, ` +
      `${index.categories.reduce((n, c) => n + c.pictures.length, 0)} pictures.`
  );
}
