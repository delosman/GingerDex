# GingerDex Project Notes

## Architecture
- **Site**: Static client-side site hosted on GitHub Pages + VIVERSE
- **Repo**: https://github.com/delosman/GingerDex.git (branch: master)
- **Data pipeline**: `C:\ContentBot\StreamerBot_Redeems\Scripts\generate_gingerdex_data.py` generates `data.json` from `user_collections.json` and card asset databases
- **Key files**: `index.html`, `app.js`, `style.css`, `data.json` (all in `C:\ContentBot\GingerDex\`)
- **User collections**: `C:\ContentBot\StreamerBot_Redeems\user_collections.json`

## Card Regions
- Original (50 cards, #1-50)
- Umbrareach (25 cards, dark themed)
- Skyfrost Vale (25 cards, ice/flying/psychic themed)

## Features Added (2026-02-23)
1. **Catch Feed Ticker** — scrolling horizontal ticker at top showing latest 15 catches, pauses on hover, click to open card modal
2. **Achievement Badges** — 11 badges on trainer profiles (First Catch, Collector, Veteran, Master, Completionist, 3 region completes, Rare Hunter, Shadow Collector, Frost Walker). Unearned badges shown grayed out with tooltips.
3. **Card Comparison Tool** — "Compare" button in card modal. First click selects Card A (toast confirms), second click opens side-by-side comparison panel with stat highlighting (green=winner, red=loser)
4. **Pack Opening Animation** — "Open Pack" nav button, full-screen overlay, weighted random 3-card pull using pullRate, 3D flip animations, rarity glow, screen flash for high-rarity pulls

## Known Bug Fixes
- **Cards #6 (Fire Crotch) and #11 (Daywalker) showing uncaught**: Both names exist in Original AND Umbrareach regions. The `name_to_key` dict in `build_catch_stats()` was overwriting Original mappings with Umbrareach ones. Fixed by using `setdefault()` and sorting by regionOrder so Original cards take priority.

## Removed Test Users (2026-02-23)
EldritchBaguette, salamyou, DatOrangeBottle, DarK_MaddeN, trickychicky147 — removed from user_collections.json and their catch images deleted.

## Deployment
- `git push` to master triggers GitHub Pages deployment
- After changing user_collections.json, run `python generate_gingerdex_data.py` to regenerate data.json before committing
