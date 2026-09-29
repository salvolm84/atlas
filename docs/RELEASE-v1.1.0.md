# Atlante Deep Sky v1.1.0

A maintenance release. No new observing features; the planner computes exactly what v1.0.0 computed. The download is 42% smaller, the interface is more responsive while dragging the horizon, and a render error no longer blanks the page.

## Download and run

Download **atlas-v1.1.0-ready-to-run.zip** (about 3.4 MB), extract it, and open **atlas-v1.1.0/index.html** in a modern desktop browser. No installation, Node.js, account, API key or server is required to run the release.

The archive includes the editable source, the catalogue source and software notices. Use the repository README for development instructions. Verify the archive with the attached `SHA256SUMS.txt` if desired.

## Smaller download

The 11.7 MB Stellarium source TSV was being copied into the archive twice. It is never read at runtime, since `catalog.json` is compiled into the bundle, and it compressed to 2.4 MB of the download.

| | v1.0.0 | v1.1.0 |
| --- | --- | --- |
| ZIP | 5.93 MB | **3.39 MB** |
| Stylesheet in the page | 170 KB | **70 KB** |

The complete corresponding source for the GPL-2.0-or-later catalogue still ships, once, under `source/public/data/`, alongside `build-catalog.py` and `COPYING-Stellarium.txt`. `data/` keeps `catalog.json`, the provenance notice, the licence and the generation script.

The stylesheet shrank because the project carried 53 interface components it never rendered, and Tailwind was generating utility rules for all of them.

## Fixes

- **Dragging the visible-horizon dial no longer recomputes the whole sky on every pointer event.** The dial re-emitted an identical sector on every movement, so a single drag across 90° triggered 120 full recomputations of 248 objects instead of 19. The twelve-month seasonality chart also now settles after the ranked list rather than blocking it.
- **A rendering error no longer leaves a blank page.** The release opens from `file://`, where there is no console a reader would think to open. The object panel and the field-of-view simulator now fail independently, with a readable message and a retry, and the catalogue list stays usable.
- **An object at exactly 0° transit altitude is now described consistently.** The catalogue row said "Fuori finestra" while the detail panel beside it said "Non sorge mai da Modena". Both now derive from the same check.
- **Selecting an object, then filtering it out of the list, no longer briefly shows a panel for an object the list has already removed.** The choice is also remembered, so relaxing a filter brings the object back rather than jumping to the first row.

## Project changes

Not visible in the application, but relevant to anyone building from source:

- Continuous integration on Node 22.13.0 and 24: formatting, lint, types, the astronomy and horizon regression suite, and both builds. A separate job regenerates `catalog.json` from the bundled TSV and fails on any difference, which guards the catalogue's provenance.
- Prettier, with the vendored shadcn registry files and the platform scripts deliberately excluded.
- `app/atlas.tsx` was 22 KB on 163 lines; it is now four focused modules, and frame-fit geometry moved to `lib/framing.ts` where the test suite can reach it.
- Runtime dependencies reduced from 25 to 12, and the installed package count from 632 to 609. The unused D1 and Drizzle database template was removed.

## Limitations

Unchanged from v1.0.0:

- Interface in Italian; fixed observing location Modena.
- Astronomical calculations and catalogue work offline; survey and morphology photographs require internet.
- No weather forecast, telescope control, mosaic simulation or saved preferences.
- Times are sampled every 15 minutes. Scores are heuristic and do not predict image quality.
- Downloaded HTML execution on mobile depends on the operating system and browser; the release primarily targets desktop browsers.
