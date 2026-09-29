# Atlante Deep Sky · Modena

An Italian-language deep-sky atlas and astrophotography planner for **Modena, Italy**, with **248 catalogue entries**, Seestar field-of-view overlays and a circular horizon filter.

Choose a night, select your telescope and mark the part of the sky you can see. The atlas ranks targets using darkness, altitude, available observing time, Moon conditions and apparent size.

## Run it without installing anything

1. Open this repository’s **Releases** page and download `atlas-v1.0.0-ready-to-run.zip`.
2. Extract the **entire** archive.
3. Open `atlas-v1.0.0/index.html` in a modern desktop browser.

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
pnpm test:astronomy        # catalogue, dates, geometry and horizon regression checks
pnpm exec tsc --noEmit    # TypeScript validation
pnpm build:portable       # generate directly openable HTML in release-runtime/
python3 scripts/package-release.py  # create versioned ZIP and SHA-256 checksums
```

The existing `pnpm build` / `pnpm start` scripts target the original hosted Worker application. **Use `build:portable` for the standalone release.**

### Where to make changes

| File | Purpose |
| --- | --- |
| `app/atlas.tsx` | Atlas interface, filters, object details and FOV overlay |
| `app/horizon.tsx` | Circular horizon selector and direction-by-time table |
| `lib/sky.ts` | Astronomy, Modena observer, telescope specifications and scoring |
| `app/globals.css` | Shared visual styles and responsive layouts |
| `app/morfologia/page.tsx` | Galaxy morphology guide |
| `public/data/catalog.json` | Curated, translated catalogue entries |
| `scripts/build-catalog.py` | Rebuild catalogue from the bundled Stellarium source |
| `portable/main.tsx` | Browser-only application entry point |
| `scripts/build-portable.mjs` | Bundle inline HTML and preserve third-party notices |
| `scripts/package-release.py` | Archive runtime plus corresponding editable source |
| `scripts/verify-sky.cjs` | Astronomical and horizon regression checks |

Changing the observing location requires updating the observer **and** the Modena-specific labels and latitude-based visibility checks. This version has no location selector. UI selections are not persisted between sessions.

### Rebuild the catalogue

```sh
python3 scripts/build-catalog.py public/data/stellarium-catalog-source.tsv public/data/catalog.json
pnpm test:astronomy
pnpm build:portable
```

Review provenance and licensing before adding another data source. The generation script asserts complete Messier and Caldwell coverage.

## Astronomy and interpretation

- Observer: **44.6471° N, 10.9252° E, 34 m**, Modena; time zone `Europe/Rome`.
- Astronomy Engine precesses J2000 coordinates to the observing date. Sun and Moon use topocentric coordinates; horizon altitudes are geometric.
- The night is sampled every **15 minutes**. Reported window boundaries are approximate to that cadence and may differ from a dedicated planner’s interpolated times.
- Darkness means **Sun below −18°**. Lunar illumination is evaluated at local midnight. The ranking also considers Moon presence and angular separation during useful samples.
- Score 0–100 is a heuristic: 50% useful duration, 35% mean altitude factor, 15% integrated magnitude, followed by Moon and small-object penalties. It is **not** an SNR estimate or a guarantee of a successful photograph.
- Seasonality samples the 15th of each month. “Best” months have at least 80% of the maximum monthly useful duration, with the same altitude/sector constraints and no lunar penalty.
- Integrated magnitude is not surface brightness. Average surface brightness is an estimate from magnitude and an elliptical catalogue area; it is not intrinsic luminosity.
- Buildings, trees, clouds, humidity, seeing, atmospheric extinction and local light pollution are not modelled. The horizon sector is a simple user-defined azimuth mask, not an obstacle map.

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
- DSS2/STScI sky imagery is requested through [CDS HiPS2FITS](https://alasky.cds.unistra.fr/hips-image-services/hips2fits).
- Instrument references: ZWO [S30 Pro](https://www.seestar.com/products/seestar-s30-pro) and [S50 Pro](https://www.seestar.com/products/seestar-s50-pro-smart-telescope).
- The morphology guide credits and links each photograph in its interface. Photographs are loaded from their providers, not included in the ZIP.

The Stellarium-derived catalogue is distributed under **GPL-2.0-or-later**, with its corresponding data source and transformation script. Third-party software retains its own licences. Portable builds include `THIRD-PARTY-NOTICES.txt` and `third-party-licenses/`. This repository does not assign a new blanket licence to the original application code or to third-party images.

## Versioning and releases

The initial release is **v1.0.0**. Release contents:

- `atlas-v1.0.0-ready-to-run.zip`: inline HTML application, data, notices, quick-start instructions and complete corresponding source.
- `SHA256SUMS.txt`: SHA-256 checksum for the ZIP.
- GitHub’s automatically generated source archives for the tagged revision.

For future releases: update `package.json` and release notes, commit the changes, run validation and `build:portable`, then package. Tag that exact commit and attach the generated ZIP and checksums. Do not publish secrets, `node_modules`, local environment files or machine-specific runtime state.
