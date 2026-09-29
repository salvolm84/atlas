# Deep Sky Atlas v1.3.0

The atlas now tells you whether the sky will be clear, as well as whether your target is up.

## Download and run

Download **atlas-v1.3.0-ready-to-run.zip** (about 3.4 MB), extract it, and open **atlas-v1.3.0/index.html** in a modern desktop browser. No installation, Node.js, account, API key or server is required.

Verify the archive against the attached `SHA256SUMS.txt` if you like.

## Cloud forecast

Two new things, both fed by [Open-Meteo](https://open-meteo.com/):

**On the night chart.** A grey cloud band is drawn across the altitude and Moon curves, with a line summarising mean cover across your target's useful window — "Forecast mostly clear during the useful window: 14% mean cloud cover".

**For the coming nights.** A strip of the next fourteen nights, each showing the usable hours for the selected target and the mean forecast cloud across exactly those hours. The heading counts the promising ones. Click a night to plan it.

That second one is the useful one. Taking M31 tonight from Modena as an example: the galaxy is up for between one and three hours every single night of the fortnight, and only three of those nights are forecast clear. That is not a question the atlas could answer before, and it is not one you want to answer by opening fourteen dates one at a time.

A night counts as promising only when it has at least an hour usable **and** is forecast under 30% cloud. Neither half qualifies on its own.

## What the forecast is not

It is not folded into the 0–100 score, and that is deliberate.

Everything else the atlas computes is local, offline, and identical for everyone who opens it — the same night gives the same numbers on any machine, forever. A forecast expires, reaches about sixteen days, needs the internet, and would make two people looking at the same night disagree. So cloud cover is reported *beside* the astronomy and never merged into it. Usable hours and cloud are always two separate figures, and choosing between them stays yours.

It is a third-party prediction, not a measurement of your sky.

## When it is not there

- **Beyond the forecast range.** The planner spans 2000–2100; forecasts reach roughly sixteen days either side of today. Outside that, the atlas tells you which dates *are* covered rather than just failing.
- **Offline, or opened from a file.** Browsers sometimes refuse network requests for pages opened straight from a file. If so, the panel says the forecast is unavailable and that the atlas works without it. No astronomy depends on it and nothing waits for it.
- **Gaps stay gaps.** Where the forecast has no sample near a point in time, the band breaks rather than stretching a neighbouring hour across it.

## Privacy and credit

Coordinates are rounded to two decimal places, about a kilometre, before leaving your browser. The forecast grid is coarser than that, so nothing is lost, and the precise position the location button can supply is not handed on. Only that rounded position and the dates are sent; there is no API key and no account.

Open-Meteo data is licensed CC BY 4.0. Credit is in `data/NOTICE.txt`, the README and the method panel.

## Also in this release

- Published releases now carry the English product name. v1.1.0 keeps its original title, which was accurate at the time.

## Limitations

- No telescope control, mosaic simulation or saved preferences. No settings persist; the atlas reopens at Modena.
- The catalogue and all astronomical calculations work offline; survey images, the morphology gallery and the cloud forecast need internet.
- Times are sampled every 15 minutes. Scores are heuristic and do not predict image quality.
- Local obstructions, atmospheric extinction and light pollution are not modelled. The horizon sector is an azimuth mask, not an obstacle map.
- Downloaded HTML execution on mobile depends on the operating system and browser; this release primarily targets desktop browsers.
