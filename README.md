# Deep Sky Atlas

[![CI](https://github.com/salvolm84/atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/salvolm84/atlas/actions/workflows/ci.yml)

An English-language deep-sky atlas and astrophotography planner with **248 catalogue entries**, Seestar field-of-view overlays and a circular horizon filter. It defaults to **Modena, Italy** and can observe from any location you give it.

Choose a night, select your telescope and mark the part of the sky you can see. The atlas ranks targets using darkness, altitude, available observing time, Moon conditions and apparent size.

## Run it without installing anything

1. Open this repository’s **Releases** page and download `atlas-v1.2.0-ready-to-run.zip` (about 3.4 MB).
2. Extract the **entire** archive.
3. Open `atlas-v1.2.0/index.html` in a modern desktop browser.

The release embeds its JavaScript, CSS and working catalogue. **No Node.js, package installation, account, API key or web server is needed to use it.** Keep the accompanying folders for source code, credits and downloadable catalogue files.

The release also contains `morfologia.html`, the galaxy morphology guide, and `source/`, the editable project used to build it.

| Works without internet | Needs internet |
| --- | --- |
| Catalogue search and technical data | DSS2 astronomical survey photographs |
| Calendar, altitude and Moon calculations | External photographs in the morphology guide |
| Cardinal directions and horizon filtering | SIMBAD, NASA, ZWO and other source links |
| Monthly seasonality and FOV geometry | Downloading dependencies for development |

Mobile operating systems may preview downloaded HTML instead of executing it. For mobile use, open the hosted app or serve the extracted folder with a static web server. The desktop release is a website, not a signed native application or an installer.

## What is included

- All **110 Messier** and **109 Caldwell** catalogue designations, plus selected NGC, IC, Sharpless and Barnard objects. Catalogue overlaps are consolidated; Caldwell 14 retains its two components. The result is 248 entries, including clusters and a few other objects for catalogue completeness.
- Distance, apparent magnitude and band, angular dimensions, J2000 coordinates, morphology and estimated average surface brightness where available. Unknown values remain explicitly unavailable.
- **Seestar S30 Pro** and **Seestar S50 Pro** native-frame FOV simulation over DSS2 survey images, with geometric rotation and map zoom.
- Night recommendations, observing windows and altitude curves for a selected date.
- Best-month chart based on dark-time altitude and the selected horizon sector.
- **N / NE / E / SE / S / SO / O / NO**, azimuth and altitude by local time.
- A circular visible-horizon selector with draggable endpoints, sliders and cardinal presets. Ranges can cross north, such as 315° → 45°.
- A separate guide to galaxy morphology with photographic examples and capture notes.

## Using the planner

1. **Choose the night’s starting date.** Times after midnight belong to the following day. All displayed times use `Europe/Rome`, including daylight saving time.
2. **Choose the main camera** of the S30 Pro or S50 Pro.
3. **Set minimum altitude:** 20°, 30° or 40°.
4. **Select your visible horizon.** Azimuth increases clockwise from geographic north: N 0°, E 90°, S 180°, O 270°. Drag the circle’s endpoints or use the sliders. “Tutto” restores 360°.
5. Browse **Questa notte** for ranked suggestions or **Tutto l’atlante** for catalogue order. An active horizon sector filters both lists.
6. Open an object’s details to inspect its useful windows, direction by time, framing and seasonal chart.

The horizon filter counts samples only when the Sun is below −18°, the target is above the selected altitude and its azimuth is inside the sector. Suggestions require at least **30 minutes total** under these conditions; separate windows are shown individually. The listed maximum and direction refer to the useful samples when a useful window exists. Selecting 360° removes the cardinal restriction.

## Develop and modify

Requirements: **Node.js 22.13 or newer**, **pnpm 11.25.0**, Git, and internet for the initial dependency installation. Python 3 is needed only to package a ZIP or regenerate the catalogue.

```sh
git clone https://github.com/salvolm84/atlas.git
cd atlas
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

Open **http://localhost:5173**. Leave the terminal running; stop with `Ctrl+C`. Edit files in VS Code or your preferred editor. A clean checkout uses the portable development profile; no Sites credentials are required for local development.

### Useful commands

```sh
pnpm format               # apply Prettier
pnpm format:check         # verify formatting without writing
pnpm lint                 # ESLint
pnpm exec tsc --noEmit    # TypeScript validation
pnpm test:astronomy       # catalogue, dates, geometry and horizon regression checks
pnpm test:ui              # location input, horizon dial keyboard and ARIA
pnpm build:portable       # generate directly openable HTML in release-runtime/
python3 scripts/package-release.py  # create versioned ZIP and SHA-256 checksums
```

GitHub Actions runs all of the above except packaging, on Node 22.13.0 and 24, and additionally regenerates `public/data/catalog.json` from the bundled Stellarium TSV to prove the catalogue is still derivable from its declared source. See `.github/workflows/ci.yml`.

`components/ui` holds only the eight shadcn components the atlas renders. Add more with `pnpm dlx shadcn@latest add <name>`; `components.json` keeps the registry configuration.

The existing `pnpm build` / `pnpm start` scripts target the original hosted Worker application. **Use `build:portable` for the standalone release.**

### Where to make changes

| File | Purpose |
| --- | --- |
| `app/atlas.tsx` | Application shell: header, night controls, catalogue list, method section |
| `app/object-details.tsx` | Selected object panel: facts, night window and seasonality charts |
| `app/fov-view.tsx` | Seestar field-of-view simulator over the survey image |
| `app/choice.tsx` | Shared labelled `Select` used by the controls |
| `app/site-picker.tsx` | Observing-location picker: geolocation and manual coordinates |
| `app/horizon.tsx` | Circular horizon selector and direction-by-time table |
| `lib/sky.ts` | Astronomy, the `Site` type, telescope specifications and scoring |
| `lib/framing.ts` | Frame-fit geometry, independent of React |
| `components/error-boundary.tsx` | Keeps a render failure from blanking the offline page |
| `app/globals.css` | Shared visual styles and responsive layouts |
| `app/morfologia/page.tsx` | Galaxy morphology guide |
| `public/data/catalog.json` | Curated, translated catalogue entries |
| `scripts/build-catalog.py` | Rebuild catalogue from the bundled Stellarium source |
| `portable/main.tsx` | Browser-only application entry point |
| `scripts/build-portable.mjs` | Bundle inline HTML and preserve third-party notices |
| `scripts/package-release.py` | Archive runtime plus corresponding editable source |
| `scripts/verify-sky.cjs` | Astronomical and horizon regression checks |

Click the location in the header to change the observing site: use the browser's current position, or type a latitude, longitude, elevation and time zone. Modena is the default and the atlas returns to it on every reload — **no selection is persisted**, by design.

A `Site` carries the coordinates and an IANA time zone, and travels through `makeNight`, `targetNight`, `seasonal`, `transitAltitude` and `neverRises` in `lib/sky.ts`. Nights are cached per site and date, so the same date at two locations cannot collide. Adding a preset means adding a `Site`; nothing else is latitude-specific.

### Rebuild the catalogue

```sh
python3 scripts/build-catalog.py public/data/stellarium-catalog-source.tsv public/data/catalog.json
pnpm test:astronomy
pnpm build:portable
```

Review provenance and licensing before adding another data source. The generation script asserts complete Messier and Caldwell coverage.

## Astronomy and interpretation

- Default observer: **44.6471° N, 10.9252° E, 34 m**, Modena; time zone `Europe/Rome`. Any other location can be entered at runtime, and all times follow that site's time zone.
- Astronomy Engine precesses J2000 coordinates to the observing date. Sun and Moon use topocentric coordinates; horizon altitudes are geometric.
- The night is sampled every **15 minutes**. Reported window boundaries are approximate to that cadence and may differ from a dedicated planner’s interpolated times.
- Darkness means **Sun below −18°**. Lunar illumination is evaluated at local midnight. The ranking also considers Moon presence and angular separation during useful samples.
- Score 0–100 is a heuristic: 50% useful duration, 35% mean altitude factor, 15% integrated magnitude, followed by Moon and small-object penalties. It is **not** an SNR estimate or a guarantee of a successful photograph.
- Seasonality samples the 15th of each month. “Best” months have at least 80% of the maximum monthly useful duration, with the same altitude/sector constraints and no lunar penalty.
- Integrated magnitude is not surface brightness. Average surface brightness is an estimate from magnitude and an elliptical catalogue area; it is not intrinsic luminosity.
- Buildings, trees, humidity, seeing, atmospheric extinction and local light pollution are not modelled. The horizon sector is a simple user-defined azimuth mask, not an obstacle map.
- Cloud cover is fetched from [Open-Meteo](https://open-meteo.com/) and displayed beside the night chart. It is **not** part of the 0–100 score, which stays a purely astronomical, offline, reproducible figure. The forecast reaches roughly sixteen days ahead and needs the internet; outside that it is simply absent. Coordinates are rounded to about a kilometre before being sent.

### Telescope geometry

| Main camera | Aperture | Focal length | Sensor | Native pixels | Portrait FOV, approximately |
| --- | --- | --- | --- | --- | --- |
| Seestar S30 Pro | 30 mm | 160 mm | Sony IMX585 | 2160 × 3840, 2.9 μm | 2.24° × 3.99° |
| Seestar S50 Pro | 50 mm | 260 mm | OmniVision OS08B10 | 2160 × 3840, 2.9 μm | 1.38° × 2.45° |

FOV is calculated as `2 × atan(sensor dimension / (2 × focal length))`. The overlay represents the native single frame, without mosaic or crop. Rotation is geometric, not a telescope command; alt-az field rotation is not animated. Yellow ellipses are catalogue dimensions, not exact boundaries of nebulosity. Survey images do not predict Seestar detail, colour or noise.

## Sources and credits

- [Stellarium DSO catalogue](https://github.com/Stellarium/stellarium/blob/master/nebulae/default/catalog.txt), bundled snapshot labelled DSO 3.23; see `public/data/NOTICE.txt`, original TSV, generation script and `COPYING-Stellarium.txt`.
- NASA/Hubble distances supplement [M65](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-65/) and [C68](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-caldwell-catalog/caldwell-68/).
- [Astronomy Engine](https://github.com/cosinekitty/astronomy) supplies astronomical calculations.
- Cloud forecasts come from [Open-Meteo](https://open-meteo.com/), used without an API key. Their data is licensed CC BY 4.0.
- DSS2/STScI sky imagery is requested through [CDS HiPS2FITS](https://alasky.cds.unistra.fr/hips-image-services/hips2fits).
- Instrument references: ZWO [S30 Pro](https://www.seestar.com/products/seestar-s30-pro) and [S50 Pro](https://www.seestar.com/products/seestar-s50-pro-smart-telescope).
- The morphology guide credits and links each photograph in its interface. Photographs are loaded from their providers, not included in the ZIP.

The Stellarium-derived catalogue is distributed under **GPL-2.0-or-later**, with its corresponding data source and transformation script. Third-party software retains its own licences. Portable builds include `THIRD-PARTY-NOTICES.txt` and `third-party-licenses/`. This repository does not assign a new blanket licence to the original application code or to third-party images.

## Versioning and releases

The current release is **v1.2.0**. Release contents:

- `atlas-v<version>-ready-to-run.zip`: inline HTML application, data, notices, quick-start instructions and complete corresponding source.
- `SHA256SUMS.txt`: SHA-256 checksum for the ZIP.
- GitHub’s automatically generated source archives for the tagged revision.

Inside the archive, `data/` carries `catalog.json`, the provenance notice, the Stellarium licence and the generation script. The 11.7 MB source TSV lives once, under `source/public/data/`, where it is the corresponding source for the GPL catalogue; it is not read at runtime, since `catalog.json` is compiled into the bundle.

To cut a release: update `version` in `package.json`, add `docs/RELEASE-v<version>.md`, commit, then tag that exact commit `v<version>` and push the tag. The `release` job in CI verifies the tag matches `package.json`, runs `build:portable` and `package-release.py`, and publishes the ZIP and checksums using the release notes file. Do not publish secrets, `node_modules`, local environment files or machine-specific runtime state.
