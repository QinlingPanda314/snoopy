# Snoopy Picture Showcase — Design

Date: 2026-07-02

## Purpose

A static website that showcases ~148 pictures organized into categories. Clicking a picture opens a modal with the full image, title, and description. Published to GitHub Pages. New pictures added rarely.

## Constraints & Assumptions

- ~148 images, each <200 KB. No thumbnail pipeline needed.
- Content changes rarely — a build step at deploy time is acceptable.
- No login, no admin UI, no search, no server-side code.
- Hosted on GitHub Pages via GitHub Actions.

## Repository Layout

```
snoopy/
├── images/
│   └── <category>/
│       ├── foo.jpg
│       └── foo.md          # paired description
├── scripts/
│   └── build-index.js      # scans images/, emits index.json
├── index.json              # generated artifact (gitignored or committed)
├── index.html
├── styles.css
├── app.js
└── .github/workflows/deploy.yml
```

- **Category = folder name** under `images/`. No config file for categories.
- Each image has a sibling markdown file with the same basename (e.g., `foo.jpg` + `foo.md`).

## Description File Format

Each `<name>.md`:

```markdown
---
title: Sunset over the lake
---
Taken on a summer evening in 2024. The colors were unreal.
```

- `title` in frontmatter is optional; falls back to the filename (without extension).
- Body is the description; rendered as Markdown in the modal.
- If the `.md` file is missing, use filename as title and empty description.

## Build Step

`scripts/build-index.js` (Node, no dependencies beyond a small frontmatter parser and marked, or hand-rolled):

1. Walk `images/*/` directories.
2. For each image file (jpg/jpeg/png/gif/webp), look for sibling `.md`.
3. Parse frontmatter and body.
4. Emit `index.json`:

```json
{
  "categories": [
    {
      "name": "nature",
      "pictures": [
        {
          "src": "images/nature/foo.jpg",
          "title": "Sunset over the lake",
          "description": "Taken on a summer evening in 2024..."
        }
      ]
    }
  ]
}
```

Categories are sorted alphabetically; pictures within a category sorted by filename. (Can add explicit ordering later if needed.)

The description field stores raw Markdown; the frontend renders it.

## Frontend

Plain HTML/CSS/JS. No framework, no bundler.

- **`index.html`** — page shell with a container div.
- **`app.js`** — on load: `fetch('index.json')`, render one section per category (heading + responsive CSS grid of thumbnails). Click a thumbnail → open modal with full image, title, rendered description. Close on click-outside, Esc, or close button. Use a tiny Markdown renderer (e.g., `marked` via CDN, or inline the minimal subset needed).
- **`styles.css`** — CSS grid for the gallery, modal overlay, responsive breakpoints, lazy loading via `<img loading="lazy">`.

No routing, no state library. One page, one modal.

## Deployment

GitHub Actions workflow `.github/workflows/deploy.yml`:

1. Trigger on push to `main`.
2. Checkout, install Node.
3. Run `node scripts/build-index.js` to produce `index.json`.
4. Publish the repo root (with generated `index.json`) to GitHub Pages using `actions/deploy-pages`.

`index.json` may be gitignored since it's regenerated on every deploy.

## Out of Scope (YAGNI)

- Search, tags, filters beyond category
- EXIF extraction
- Thumbnail generation / image optimization
- Multi-category membership
- Admin UI for editing descriptions
- Analytics
- Custom domain (can add later via GH Pages settings)

## Future Extensions (not building now)

- If gallery load feels slow, add a thumbnail generation step in the build script.
- If categories grow, add explicit ordering via a `categories.json`.
- If descriptions need richer formatting, keep Markdown but expand renderer features.
