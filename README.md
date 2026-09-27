# Constellation Journal ✨

A daily journal styled like an antique celestial atlas. Write a short
entry, pick a mood, and that day becomes a star. Journal on consecutive
days and they connect into your own constellation for the month — which
gets a generated name, like *"The Quiet Harbor"* or *"The Restless Ember."*

No build step, no dependencies, no backend — just `index.html`,
`styles.css`, and `script.js`, with everything saved to `localStorage`.

## Features

- Deep-indigo star chart per month; every day is a faint background dot,
  journaled days become bright, mood-colored stars
- Star size grows slightly with how much you wrote that day
- Consecutive journaled days are connected with a gold constellation line
- **5 moods** (radiant, warm, calm, stormy, quiet), each with its own
  star color
- A constellation name generator — deterministic per month, based on the
  dominant mood and number of stars, so it stays stable until the mix
  of entries changes
- Click any star to reopen and edit that day's entry; delete it if you
  want the star to fade
- Month navigation to look back at (or write into) past months

## How star positions work

Each day's position on the chart is generated from a hash of its date
string, so a given day always lands in the same spot on the chart —
no layout data needs to be stored, only the entries themselves.

## Running it

Open `index.html` in a browser.

To serve it locally instead:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Putting it on GitHub

```bash
git init
git add .
git commit -m "Constellation Journal: a daily journal styled as a star chart"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

### Hosting it for free with GitHub Pages

1. Push the repo (above).
2. On GitHub: **Settings → Pages → Source → Deploy from a branch**, pick
   `main` and `/ (root)`.
3. Live at `https://<your-username>.github.io/<repo-name>/` shortly after.

## File structure

```
constellation-journal/
├── index.html    # markup
├── styles.css    # celestial-atlas theme
├── script.js     # star layout, entry storage, constellation naming
└── README.md
```

## Ideas to extend it

- A "year sky" view zoomed out, with each month as its own cluster
- Export a month's constellation as an SVG or PNG keepsake
- Word count streaks, or a gentle reminder if a week has no stars
- Let users rename their constellation instead of only generating one
