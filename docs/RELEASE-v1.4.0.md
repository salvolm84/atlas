# Deep Sky Atlas v1.4.0

Accuracy and responsiveness. Window times are now the real crossings rather than multiples of the sampling cadence, and the heavy astronomy no longer blocks the interface.

## Download and run

Download **atlas-v1.4.0-ready-to-run.zip** (about 3.5 MB), extract it, and open **atlas-v1.4.0/index.html** in a modern desktop browser. No installation, Node.js, account, API key or server is required.

Verify the archive against the attached `SHA256SUMS.txt` if you like.

## Window times are no longer rounded

The night is sampled every 15 minutes, and until now a window's start and end were simply the first and last sample inside it. Every time you saw was therefore rounded to the cadence — something previous releases disclosed rather than fixed.

Each boundary is now found by bisecting against the same usability test, so the times shown are the real crossings. M42 on 15 January from Modena:

| | |
| --- | --- |
| before | 18:45 → 23:45, 5.00 h |
| now | 18:44:03 → 23:38:54, 4.91 h |

Useful hours are summed from those refined windows, so the total and the times you see can no longer disagree. Scores shift very slightly as a result, which is the point: 5.00 h was an artefact of the grid, not a measurement.

The altitude curve and the reported peak altitude and direction are still the 15-minute samples, and the interface now says so precisely instead of implying everything is interpolated.

## A more responsive interface

First render used to do about 63 ms of astronomy on the main thread — the 248-object sweep, the twelve-month seasonality chart and the fourteen-night outlook — and repeat it on every change of date, location, altitude threshold or horizon sector. That work now runs in a worker, taking roughly 49 ms off the main thread.

The catalogue stays where it is: the worker receives only the six fields the astronomy actually reads. Filtering, searching and sorting are unchanged and still happen instantly against the full catalogue.

Where a browser refuses to start a worker — which can happen for a page opened straight from a file — the atlas computes on the main thread exactly as before. Both paths run the same code, so the numbers cannot differ between them.

## Smaller and tidier

The 11.2 MB Stellarium source TSV no longer sits in the served asset directory. It is source, not a public asset, and nothing reads it at runtime because the catalogue is compiled into the bundle. For anyone hosting the atlas, the deployed payload drops from 12.6 MB to 1.4 MB.

It still ships in this archive exactly once, under `source/catalog-source/`, alongside `build-catalog.py` and the Stellarium licence, as the corresponding source for the GPL catalogue. Three unused Next template images were removed too.

## Also in this release

- The hosted atlas can be installed to a home screen and works offline after the first visit, via a web app manifest and a conservative service worker. This affects only the hosted version; a page opened from a file cannot register a worker, so the archive neither ships nor registers one.
- Three Italian strings that survived the v1.2.0 translation are fixed: the method-panel heading, the night panel's threshold label and the catalogue footnote. The night panel also stopped hardcoding "Modena · Europe/Rome" and now follows the selected location.

## Limitations

- No telescope control, mosaic simulation or saved preferences. No settings persist; the atlas reopens at Modena.
- The catalogue and all astronomical calculations work offline; survey images, the morphology gallery and the cloud forecast need internet.
- The cloud forecast reaches about sixteen days and is never part of the score.
- Local obstructions, atmospheric extinction and light pollution are not modelled. The horizon sector is an azimuth mask, not an obstacle map.
- Downloaded HTML execution on mobile depends on the operating system and browser; for phones, use the hosted app.
