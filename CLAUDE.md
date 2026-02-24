# GingerDex Project Notes

## Architecture
- **Site**: Static client-side site hosted on GitHub Pages + VIVERSE
- **Repo**: https://github.com/delosman/GingerDex.git (branch: master)
- **Data pipeline**: `C:\ContentBot\StreamerBot_Redeems\Scripts\generate_gingerdex_data.py` generates `data.json` from `user_collections.json` and card asset databases
- **Key files**: `index.html`, `app.js`, `style.css`, `data.json` (all in `C:\ContentBot\GingerDex\`)
- **User collections**: `C:\ContentBot\StreamerBot_Redeems\user_collections.json`

## Card Regions (200 cards total)
- Original (50 cards, #1-50)
- Umbrareach (25 cards, dark themed)
- Skyfrost Vale (25 cards, ice/flying/psychic themed)
- Rusthallow (50 cards, dragon/steel/fighting/ghost themed)
- Copperspore Marsh (50 cards, bug/grass/poison themed)

## Features Added (2026-02-23)
1. **Catch Feed Ticker** — scrolling horizontal ticker at top showing latest 15 catches, pauses on hover, click to open card modal
2. **Achievement Badges** — 35 badges on trainer profiles. Categories: milestones (First Catch through Completionist), region completes (5), region explorers (4 + Globetrotter), rarity (6 including Mythic Find, Chaos Touched, 1st Edition, EX Collector, Rarity Rainbow), type mastery (8 including Pyromaniac, Dragon Tamer, Type Master, Dual Wielder), fun/special (Halfway There, Powerhouse 300+ HP, Walking Nuke 250+ dmg move). Unearned badges shown grayed out with tooltips.
3. **Card Comparison Tool** — "Compare" button in card modal. First click selects Card A (toast confirms), second click opens side-by-side comparison panel with stat highlighting (green=winner, red=loser)
4. **Pack Opening Animation** — "Open Pack" nav button, full-screen overlay, weighted random 3-card pull using pullRate, 3D flip animations, rarity glow, screen flash for high-rarity pulls

## Regions Added (2026-02-24)
- **Rusthallow** (50 cards) — dragon/steel/fighting/ghost themed. Uses MP4/ + PNG/ subfolders for assets.
- **Copperspore Marsh** (50 cards) — bug/grass/poison swampland themed. Uses MP4/ + PNG/ subfolders for assets.
- 50-card regions use `REGION_RARITY_MAP_50`: common 1-15, uncommon 16-25, holo 26-35, evolutionex 36-45, legendary 46-50
- `get_region_rarity()` now accepts `region_size` parameter to select correct rarity map
- `build_card_catalog()` checks `MP4/` subfolder for video files
- `sync_card_assets()` copies `MP4/` subfolders

## Known Bug Fixes
- **Cards #6 (Fire Crotch) and #11 (Daywalker) showing uncaught**: Both names exist in Original AND Umbrareach regions. The `name_to_key` dict in `build_catch_stats()` was overwriting Original mappings with Umbrareach ones. Fixed by using `setdefault()` and sorting by regionOrder so Original cards take priority.

## Removed Test Users (2026-02-23)
EldritchBaguette, salamyou, DatOrangeBottle, DarK_MaddeN, trickychicky147 — removed from user_collections.json and their catch images deleted.

## Deployment
- `git push` to master triggers GitHub Pages deployment
- After changing user_collections.json, run `python generate_gingerdex_data.py` to regenerate data.json before committing
- VIVERSE publish: `viverse-cli app publish C:\ContentBot\GingerDex --app-id wk6ehbtjqm`
- Both deployments are automated in `pokemon_catch.py` `update_gingerdex()` function
