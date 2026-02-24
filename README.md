# GingerDex

A Twitch-integrated collectible card game (TCG) tracker and gallery. Viewers catch GingerMon cards through stream redeems, and GingerDex displays every card, trainer collection, and leaderboard in a live web app.

## Live Sites

- **GitHub Pages**: [delosman.github.io/GingerDex](https://delosman.github.io/GingerDex)
- **VIVERSE**: Deployed via VIVERSE publishing

## Features

- **Card Gallery** -- Browse all 200 cards across 5 regions, with filtering by region, type, and rarity
- **Trainer Profiles** -- View any trainer's collection, completion percentage, and achievement badges
- **Leaderboard** -- Ranked trainers by unique cards caught
- **Card Comparison** -- Side-by-side stat comparison between any two cards
- **Pack Opening** -- Weighted random 3-card pack simulator with flip animations and rarity glow effects
- **Catch Feed** -- Scrolling ticker of the latest catches from the stream
- **Achievement Badges** -- 15 badges including region completions, milestone catches, and rarity hunters

## Regions

| Region | Cards | Theme |
|--------|-------|-------|
| Original | 50 | The founding set -- classic GingerMon |
| Umbrareach | 25 | Dark-type horror region |
| Skyfrost Vale | 25 | Ice, flying, and psychic |
| Rusthallow | 50 | Dragon, steel, fighting, and ghost |
| Copperspore Marsh | 50 | Bug, grass, and poison swampland |

## How It Works

1. `generate_gingerdex_data.py` reads card databases and `user_collections.json` to produce `data.json`
2. The static site (`index.html`, `app.js`, `style.css`) loads `data.json` client-side
3. Card assets (PNG/MP4) are synced to the `cards/` folder
4. Push to `master` triggers GitHub Pages deployment

## Tech Stack

- Vanilla HTML/CSS/JS (no frameworks)
- Python data pipeline
- GitHub Pages hosting
