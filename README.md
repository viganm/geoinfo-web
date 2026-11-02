# GeoInfo — website

The site is designed as a printed topographic sheet of Prishtina. Its contours, rivers, forests, roads and buildings come from real data: SRTM terrain and OpenStreetMap. Albanian is the default language, with an English switch.

## Run

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # static site in dist/
```

`dist/` is plain static files, so it can be hosted anywhere: Netlify, Vercel, cPanel or S3.

## What's on the page

| Section | Where | What moves |
|---|---|---|
| Hero sheet | `src/map/sheet.ts` | The map plates print into register one by one. A total station shoots a live traverse while the readout resolves digit by digit. The cursor reticle shows live KOSOVAREF01 E/N/H, and clicking measures distances. |
| Values | `src/main.ts` | A traverse line draws through the three control points as you scroll. |
| Services legend | `src/sections/legend.ts`, `src/map/cadastre.ts` | A sticky inset map flies between 8 animated survey drawings, one per service group. The property, construction, legal and subdivision drawings are fitted to real OSM footprints: one building, its parcel bounded halfway to the neighbours, and the neighbouring parcels around it. |
| Process | `src/sections/process.ts` | A pinned horizontal traverse with five stations (desktop). |
| Traffic + PTV | `src/sections/sim.ts`, `simcore.ts` | A canvas microsimulation on the real roads around Rrethi i Madh, with a "current" and an "optimised" scenario. |
| Architecture | `src/sections/axo.ts` | An isometric drawing that builds from parcel to building line to volume as you scroll. |
| Contact | `src/sections/contact.ts` | An order sheet that validates, then opens a prefilled email. |

Copy lives in `index.html` (Albanian) and `src/i18n.ts` (English). Keys match the `data-i18n` attributes.

## Before going live: confirm or replace

There are no invented statistics, projects, testimonials or team members on the site. The items below are illustrative or still need your confirmation:

- **Illustrative drawings.** Parcel "P-01", parcel areas, the dimensions in the legend scenes, the architecture drawing (H = 16 m, P+4) and the process bearings/distances are drawn examples. They are captioned as illustrative on the page.
- **Traffic simulation.** It is a simplified model, not a PTV Vissim run, and it is captioned "Simulim ilustrues". Its numbers come from the toy model.
- **"Saktësi centimetrike"** (centimetre accuracy) in the hero. Please confirm GeoInfo is comfortable with this claim.
- **PTV wording.** "Distributori zyrtar i PTV Group për Kosovën" and the text "licenca, demonstrime dhe pyetje". Adjust if the dealership covers training or support. Only PTV Visum and PTV Vissim are listed.
- **Partners.** PTV Group, Leica Geosystems (Hexagon AB), DWH Handel, Qeveria e Kosovës, Komuna e Prishtinës, Albi Commerce and Nartel EX-IN. They are set as text, styled as map labels. Add official logos only with each partner's permission. The short descriptions and places (Karlsruhe, Heerbrugg, Tiranë/Prishtinë, Veternik) come from the partners' own websites.
- **Architecture services.** The descriptions are generic, because the old site did not describe this service line.
- **Missing facts.** Office address, founding year, team, project references and certifications aren't on the site yet. Add them when available.
- **Contact form.** With no backend, it opens the visitor's email app. To post to a form service, add `data-endpoint="https://formspree.io/f/…"` (or a similar endpoint) to `<form id="orderForm">`.

## Logo

`public/logo.svg` is the old raster logo rebuilt as vector: outlined Archivo letters fitted to the original letter boxes, the contrast ring, and an orthographic globe from Natural Earth land data. `public/favicon.svg` is the globe alone. `scripts/logo.mjs` regenerates both. It needs `fontkit`, `d3-geo`, `topojson-client`, `world-atlas` and the Archivo variable TTFs from the Google Fonts repository.

The accent colour is the logo's globe blue (`--accent` in `src/styles.css`). The indigo lettering is `--brand-ink`.

## Data and credits (keep in the footer)

- Terrain: SRTM (NASA/USGS), via AWS Terrain Tiles (`terrarium`, z12).
- Roads, buildings, water, forest and place names: © OpenStreetMap contributors, ODbL.

## Regenerating the map data

The scripts in `scripts/` rebuild `src/data/map-data.json` (the hero and inset map) and `src/data/traffic-net.json` (the simulation network):

1. Download terrarium tiles z12, x 2287–2290, y 1509–1511 into a folder, named `t_<x>_<y>.png`.
2. `node scripts/dem.mjs <tiles-dir> <work>/dem-grid.json`
3. Save Overpass exports as `<work>/osm/roads.json` (city centre: roads, streams and buildings) and `<work>/osm/wide.json` (major roads, rail, rivers, water, forest and places for the whole sheet).
4. `node scripts/buildmap.mjs <work> src/data`, then `node scripts/traffic.mjs <work> src/data/traffic-net.json`.
