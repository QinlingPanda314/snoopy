# Snoopy Picture Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static picture-showcase website with folder-based categories, per-image markdown descriptions, click-to-open modal, and GitHub Pages deployment.

**Architecture:** Plain HTML/CSS/JS frontend. A Node build script scans `images/<category>/` folders, pairs each image with a sibling `.md` file (frontmatter title + Markdown body), and emits a single `index.json`. Frontend fetches `index.json`, renders category grids, opens a modal on click. GitHub Actions builds and deploys to Pages on push to `main`.

**Tech Stack:** Node 20 (build script only, no runtime deps beyond a small frontmatter parser), vanilla HTML/CSS/JS, `marked` via CDN for Markdown rendering, GitHub Actions + Pages.

---

## File Structure

```
snoopy/
├── .github/workflows/deploy.yml   # CI: build + publish to Pages
├── .gitignore
├── README.md
├── package.json                   # declares Node build script
├── scripts/
│   ├── build-index.js             # walks images/, emits index.json
│   ├── parse-frontmatter.js       # tiny YAML frontmatter parser
│   └── build-index.test.js        # unit tests via node:test
├── images/
│   └── sample/                    # sample category with fixtures
│       ├── hello.jpg
│       └── hello.md
├── index.json                     # generated (gitignored)
├── index.html
├── styles.css
└── app.js
```

**Responsibilities:**
- `scripts/parse-frontmatter.js` — pure function `parseFrontmatter(text) → { data, body }`. Tested in isolation.
- `scripts/build-index.js` — walks disk, calls the parser, writes `index.json`. Exposes `buildIndex(rootDir) → indexObject` for testing.
- `app.js` — DOM rendering, event wiring, modal control. No build step.
- `styles.css` — layout, grid, modal.
- `.github/workflows/deploy.yml` — CI pipeline.

---

## Task 1: Repo bootstrap

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `README.md`
- Create: `images/.gitkeep`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "snoopy",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node scripts/build-index.js",
    "test": "node --test scripts/*.test.js"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
index.json
.DS_Store
```

- [ ] **Step 3: Create README.md**

```markdown
# Snoopy

Static picture showcase. Drop images and paired `.md` files into `images/<category>/`, push, and GitHub Actions publishes to Pages.

## Local dev

    npm run build          # generates index.json
    python3 -m http.server # serve at http://localhost:8000

## Tests

    npm test
```

- [ ] **Step 4: Create images/.gitkeep**

Empty file so the folder is tracked.

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore README.md images/.gitkeep
git commit -m "chore: repo bootstrap"
```

---

## Task 2: Frontmatter parser (TDD)

**Files:**
- Create: `scripts/parse-frontmatter.js`
- Test: `scripts/parse-frontmatter.test.js`

- [ ] **Step 1: Write the failing test**

`scripts/parse-frontmatter.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from './parse-frontmatter.js';

test('parses frontmatter and body', () => {
  const input = '---\ntitle: Hello world\n---\nBody text here.';
  const { data, body } = parseFrontmatter(input);
  assert.equal(data.title, 'Hello world');
  assert.equal(body, 'Body text here.');
});

test('returns empty data when no frontmatter', () => {
  const { data, body } = parseFrontmatter('Just body.');
  assert.deepEqual(data, {});
  assert.equal(body, 'Just body.');
});

test('handles empty input', () => {
  const { data, body } = parseFrontmatter('');
  assert.deepEqual(data, {});
  assert.equal(body, '');
});

test('trims whitespace around values', () => {
  const { data } = parseFrontmatter('---\ntitle:   spaced   \n---\n');
  assert.equal(data.title, 'spaced');
});

test('ignores lines without colons in frontmatter', () => {
  const { data, body } = parseFrontmatter('---\ntitle: T\nnocolon\n---\nb');
  assert.equal(data.title, 'T');
  assert.equal(body, 'b');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './parse-frontmatter.js'`.

- [ ] **Step 3: Implement parse-frontmatter.js**

```js
export function parseFrontmatter(text) {
  if (!text) return { data: {}, body: '' };
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: text };
  const [, header, body] = match;
  const data = {};
  for (const line of header.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) data[key] = value;
  }
  return { data, body };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/parse-frontmatter.js scripts/parse-frontmatter.test.js
git commit -m "feat: frontmatter parser"
```

---

## Task 3: Build script (TDD)

**Files:**
- Create: `scripts/build-index.js`
- Test: `scripts/build-index.test.js`

- [ ] **Step 1: Write the failing test**

`scripts/build-index.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildIndex } from './build-index.js';

function setupFixture() {
  const root = mkdtempSync(join(tmpdir(), 'snoopy-'));
  mkdirSync(join(root, 'nature'));
  writeFileSync(join(root, 'nature', 'sunset.jpg'), '');
  writeFileSync(
    join(root, 'nature', 'sunset.md'),
    '---\ntitle: Sunset\n---\nGolden hour.'
  );
  writeFileSync(join(root, 'nature', 'lone.jpg'), '');
  mkdirSync(join(root, 'city'));
  writeFileSync(join(root, 'city', 'bridge.png'), '');
  writeFileSync(join(root, 'city', 'bridge.md'), 'No frontmatter body.');
  return root;
}

test('builds category list sorted alphabetically', () => {
  const root = setupFixture();
  try {
    const index = buildIndex(root);
    assert.deepEqual(index.categories.map(c => c.name), ['city', 'nature']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('pairs image with sibling markdown title and body', () => {
  const root = setupFixture();
  try {
    const index = buildIndex(root);
    const nature = index.categories.find(c => c.name === 'nature');
    const sunset = nature.pictures.find(p => p.src.endsWith('sunset.jpg'));
    assert.equal(sunset.title, 'Sunset');
    assert.equal(sunset.description, 'Golden hour.');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('falls back to filename when md missing', () => {
  const root = setupFixture();
  try {
    const index = buildIndex(root);
    const nature = index.categories.find(c => c.name === 'nature');
    const lone = nature.pictures.find(p => p.src.endsWith('lone.jpg'));
    assert.equal(lone.title, 'lone');
    assert.equal(lone.description, '');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('uses filename as title when md has no frontmatter title', () => {
  const root = setupFixture();
  try {
    const index = buildIndex(root);
    const city = index.categories.find(c => c.name === 'city');
    const bridge = city.pictures[0];
    assert.equal(bridge.title, 'bridge');
    assert.equal(bridge.description, 'No frontmatter body.');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('src path is relative to repo root using forward slashes', () => {
  const root = setupFixture();
  try {
    const index = buildIndex(root, { srcPrefix: 'images' });
    const nature = index.categories.find(c => c.name === 'nature');
    assert.ok(nature.pictures.every(p => p.src.startsWith('images/nature/')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('pictures within a category sorted by filename', () => {
  const root = setupFixture();
  try {
    const index = buildIndex(root);
    const nature = index.categories.find(c => c.name === 'nature');
    const names = nature.pictures.map(p => p.src.split('/').pop());
    assert.deepEqual(names, ['lone.jpg', 'sunset.jpg']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './build-index.js'`.

- [ ] **Step 3: Implement build-index.js**

```js
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
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

// CLI: `node scripts/build-index.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  const index = buildIndex('images', { srcPrefix: 'images' });
  writeFileSync('index.json', JSON.stringify(index, null, 2));
  console.log(
    `Wrote index.json — ${index.categories.length} categories, ` +
      `${index.categories.reduce((n, c) => n + c.pictures.length, 0)} pictures.`
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — all frontmatter + build-index tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-index.js scripts/build-index.test.js
git commit -m "feat: build-index script"
```

---

## Task 4: Sample category fixture

**Files:**
- Create: `images/sample/hello.jpg`
- Create: `images/sample/hello.md`

- [ ] **Step 1: Add a placeholder image**

Any small jpg will do — a 1×1 pixel is fine for wiring. Create with:

```bash
mkdir -p images/sample
printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09\x08\x0a\x0c\x14\x0d\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.'\'' ",#\x1c\x1c(7),01444\x1f\'\''9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd0\xff\xd9' > images/sample/hello.jpg
```

(The exact bytes don't matter for testing — any file the browser accepts works. If the user already has real images, skip this and drop those in instead.)

- [ ] **Step 2: Create the markdown description**

`images/sample/hello.md`:

```markdown
---
title: Hello world
---
This is the first sample picture. Replace with your own images.
```

- [ ] **Step 3: Run the build to confirm the fixture works**

Run: `npm run build`
Expected: `Wrote index.json — 1 categories, 1 pictures.`

- [ ] **Step 4: Commit**

```bash
git add images/sample/hello.jpg images/sample/hello.md
git commit -m "chore: sample category fixture"
```

---

## Task 5: HTML shell

**Files:**
- Create: `index.html`

- [ ] **Step 1: Write index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Snoopy</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header><h1>Snoopy</h1></header>
    <main id="gallery" aria-live="polite">Loading…</main>

    <div id="modal" class="modal" hidden role="dialog" aria-modal="true">
      <div class="modal-content" role="document">
        <button class="modal-close" aria-label="Close">&times;</button>
        <img class="modal-image" alt="" />
        <h2 class="modal-title"></h2>
        <div class="modal-description"></div>
      </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="app.js" type="module"></script>
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: html shell"
```

---

## Task 6: Styles

**Files:**
- Create: `styles.css`

- [ ] **Step 1: Write styles.css**

```css
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #fafafa;
  color: #222;
}
header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #eee;
}
h1 { margin: 0; font-size: 1.5rem; }
main { padding: 2rem; max-width: 1200px; margin: 0 auto; }

.category { margin-bottom: 3rem; }
.category h2 {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  text-transform: capitalize;
}
.grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}
.thumb {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 6px;
  background: #eee;
  cursor: pointer;
  border: none;
  padding: 0;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.2s;
}
.thumb:hover img { transform: scale(1.03); }

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 10;
}
.modal[hidden] { display: none; }
.modal-content {
  background: #fff;
  border-radius: 8px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow: auto;
  padding: 1.5rem;
  position: relative;
}
.modal-close {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  background: transparent;
  border: none;
  font-size: 1.75rem;
  cursor: pointer;
  line-height: 1;
}
.modal-image {
  width: 100%;
  height: auto;
  max-height: 60vh;
  object-fit: contain;
  border-radius: 4px;
  background: #f4f4f4;
}
.modal-title { margin: 1rem 0 0.5rem; }
.modal-description { line-height: 1.5; }
.modal-description p:first-child { margin-top: 0; }
```

- [ ] **Step 2: Commit**

```bash
git add styles.css
git commit -m "feat: styles"
```

---

## Task 7: App logic

**Files:**
- Create: `app.js`

- [ ] **Step 1: Write app.js**

```js
const gallery = document.getElementById('gallery');
const modal = document.getElementById('modal');
const modalImage = modal.querySelector('.modal-image');
const modalTitle = modal.querySelector('.modal-title');
const modalDesc = modal.querySelector('.modal-description');
const modalClose = modal.querySelector('.modal-close');

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function renderMarkdown(md) {
  if (window.marked) return window.marked.parse(md || '');
  return `<p>${escapeHtml(md || '')}</p>`;
}

function openModal(picture) {
  modalImage.src = picture.src;
  modalImage.alt = picture.title;
  modalTitle.textContent = picture.title;
  modalDesc.innerHTML = renderMarkdown(picture.description);
  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
  modalImage.src = '';
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.hidden) closeModal();
});

function renderGallery(index) {
  if (!index.categories.length) {
    gallery.textContent = 'No pictures yet.';
    return;
  }
  gallery.innerHTML = '';
  for (const cat of index.categories) {
    const section = document.createElement('section');
    section.className = 'category';
    section.innerHTML = `<h2>${escapeHtml(cat.name)}</h2>`;
    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const pic of cat.pictures) {
      const btn = document.createElement('button');
      btn.className = 'thumb';
      btn.type = 'button';
      const img = document.createElement('img');
      img.src = pic.src;
      img.alt = pic.title;
      img.loading = 'lazy';
      btn.appendChild(img);
      btn.addEventListener('click', () => openModal(pic));
      grid.appendChild(btn);
    }
    section.appendChild(grid);
    gallery.appendChild(section);
  }
}

fetch('index.json')
  .then(r => {
    if (!r.ok) throw new Error(`index.json ${r.status}`);
    return r.json();
  })
  .then(renderGallery)
  .catch(err => {
    gallery.textContent = `Failed to load gallery: ${err.message}`;
  });
```

- [ ] **Step 2: Smoke-test in a browser**

Run:

```bash
npm run build
python3 -m http.server 8000
```

Open http://localhost:8000. Expected: "sample" category with one thumbnail. Click it → modal shows "Hello world" + description. Esc closes. Click outside closes.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: gallery + modal"
```

---

## Task 8: GitHub Actions deploy to Pages

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: deploy to github pages"
```

- [ ] **Step 3: Manual step — enable Pages in repo settings**

In the GitHub repo: **Settings → Pages → Source → GitHub Actions**. Push `main` and confirm the workflow runs green and the site loads.

---

## Task 9: README update with content instructions

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Expand README with authoring guide**

Append to `README.md`:

```markdown

## Adding pictures

1. Create a folder under `images/` — the folder name becomes the category (e.g., `images/nature/`).
2. Drop images (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`) into it.
3. For each image, add a paired `<basename>.md`:

       ---
       title: Sunset over the lake
       ---
       Taken on a summer evening in 2024.

   Title is optional (defaults to filename). Body is Markdown.

4. `git push` — Actions builds `index.json` and publishes.

## Deploying

Push to `main`. In repo Settings → Pages, set Source to "GitHub Actions" once.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: authoring and deploy instructions"
```

---

## Done

At this point:
- `npm test` passes
- `npm run build` produces a valid `index.json`
- The site works locally with `python3 -m http.server`
- Push to `main` triggers CI, which publishes to GitHub Pages
- Adding a new picture is: drop file into `images/<category>/`, add sibling `.md`, commit, push
