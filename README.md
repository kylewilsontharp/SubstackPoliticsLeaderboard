# Substack Politics & News Leaderboard — Chaotic Era

A sortable leaderboard of the **top 100 Substack publications** in **U.S. Politics**
and **News**, branded for [Chaotic Era](https://chaoticera.news) (Kyle Tharp's
newsletter on politics, media, and online influence).

The page shows, for each publication: **Author**, **Publication name**,
**Publication URL**, **Paid subscribers (estimated)**, and **Free subscribers**.
Click any column header to sort; use the tabs to switch between U.S. Politics and
News, and the search box to filter.

## How it works

```
scripts/fetch-leaderboard.mjs   # pulls live rankings from Substack's public API → data/*.json
data/us-politics.json           # top 100 U.S. Politics publications
data/news.json                  # top 100 News publications
index.html / styles.css / app.js  # static, sortable front-end (no build step)
.github/workflows/refresh-data.yml  # daily refresh of the data files
```

The front-end is plain static HTML/CSS/JS — it just reads the two JSON files,
so it can be hosted anywhere (GitHub Pages, Netlify, Vercel, etc.).

## Running it

```bash
# 1. Fetch live data (needs outbound access to substack.com)
npm run fetch
#   or a single category:  node scripts/fetch-leaderboard.mjs us-politics

# 2. Preview locally
npm run serve   # → http://localhost:8000
```

> **Note:** The Claude Code web sandbox blocks outbound calls to `substack.com`,
> so the repo ships with clearly-labelled **sample data** and a GitHub Action that
> performs the real fetch on a daily schedule (or on-demand via *Run workflow*).
> Until the fetch runs, the page shows a "sample data" banner.

## Data sources & important caveats

Rankings come from Substack's **public, undocumented** category leaderboard API
(`/api/v1/category/public/<id>/all`). Two columns need explanation:

- **Paid subscribers — *estimate only.*** Substack does **not** publish exact
  paid-subscriber counts. The only public signal is the **Bestseller badge tier**,
  which maps to paid-subscriber milestones
  ([Substack docs](https://support.substack.com/hc/en-us/articles/10661509585428)):

  | Badge tier | Color  | Estimated paid subscribers |
  | ---------- | ------ | -------------------------- |
  | 1          | white  | 100+                       |
  | 2          | orange | 1,000+                     |
  | 3          | purple | 10,000+                    |

  Values shown are **lower bounds**, presented as estimates — not exact figures.

- **Free subscribers** are the **approximate** free/total subscriber counts
  Substack itself reports on the leaderboard (the API field is literally a
  "rough" number).

## Customizing the branding

All brand tokens (colors, fonts) live at the top of `styles.css` under `:root`.
The palette evokes Chaotic Era's high-contrast editorial look; drop in the exact
hex values / logo from chaoticera.news to match pixel-for-pixel.

## Changing categories

Edit the `CATEGORIES` array in `scripts/fetch-leaderboard.mjs`. Category IDs are
resolved by name at runtime from `/api/v1/categories`, so you only need the
display name (e.g. `"World Politics"`), not a hard-coded numeric ID. Then add a
matching tab in `index.html` and an entry in the `CATEGORIES` map in `app.js`.
