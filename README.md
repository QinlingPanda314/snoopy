# Snoopy

Static picture showcase. Drop images and paired `.md` files into `images/<category>/`, push, and GitHub Actions publishes to Pages.

## Local dev

    npm run build          # generates index.json
    python3 -m http.server # serve at http://localhost:8000

## Tests

    npm test

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
