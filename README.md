# sankaraniyer03.github.io

Live site is in `site/`. GitHub Pages builds that folder and publishes `site/dist`.

```
site/                 Vite + React app (this is the portfolio)
  src/                pages, components, copy
  public/             images, videos, decks, models served as-is
  scripts/media.mjs   builds public/ from the source libraries below
Portfolio Projects/   original project files (not committed, ~1.4GB)
images/personal/      original photos used by the media pipeline
archived/             old site, unused code, media scratch
.github/workflows/    Pages deploy
```

```bash
cd site
npm install
npm run dev
```
