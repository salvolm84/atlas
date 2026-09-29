# Deep Sky Atlas v1.2.0

The atlas is no longer tied to one place or one language. It plans from any location you give it, and the whole interface is in English.

## Download and run

Download **atlas-v1.2.0-ready-to-run.zip** (about 3.4 MB), extract it, and open **atlas-v1.2.0/index.html** in a modern desktop browser. No installation, Node.js, account, API key or server is required.

The archive includes the editable source, the catalogue source and software notices. Verify it with the attached `SHA256SUMS.txt` if you like.

## Choose your observing location

Click the location in the header. You can:

- **Use your browser's current position.** Geolocation reports coordinates but never a time zone, so the atlas takes your device's own, which is almost always right when you are standing at those coordinates. You can change it.
- **Type a latitude, longitude, elevation and time zone.** The time-zone list covers every zone your browser knows.

Every displayed time follows the selected site's zone, including its daylight-saving changes. Altitudes, useful windows, scores, the direction table and the best-months chart all recompute for the new place.

**Nothing is saved.** Reloading returns to Modena. That is deliberate, not an oversight.

Two honest limits. Browsers normally refuse location access for pages opened straight from a file, which is exactly how this release runs — if the button does not work, type the coordinates and the atlas is unaffected. And the location is not yet part of the URL, so a plan cannot be shared as a link.

## English throughout

Every string, including the catalogue. The 248 objects keep their standard English names — Crab, Whirlpool, Coalsack — and their type labels are translated from the same generator that builds the catalogue from the Stellarium source, so the data stays reproducible rather than hand-edited.

Compass points change with the language: west now reads **W** and south-west **SW**, where v1.1.0 used the Italian **O** and **SO**. Worth knowing if you had memorised a sector.

Times and numbers use British formatting, which keeps the 24-hour clock an observing planner wants.

## The horizon dial takes the keyboard

The dial used to need a mouse. Its two handles are now focusable: arrow keys move one by 5°, Page Up and Page Down jump a whole compass point. Screen readers announce each handle by name and read its bearing aloud ("NW, 315 degrees"), and the decorative geometry is no longer read out before you reach the controls.

The handles set the sector's **start and end**; the sliders below set its **start and width**. Two ways to describe the same sector, whichever you think in.

## Fixes

- The field simulator set a 30-second timeout to give up on a survey image and never cancelled it when the image arrived, so it fired after every successful load and re-rendered the panel half a minute later.
- A sector crossing north is now handled by one shared piece of logic for both dragging and the keyboard, rather than the drag path owning its own copy.

## Upgrading from v1.1.0

Nothing to migrate: no settings are stored. The only change that might surprise you is the compass letters.

## Limitations

- No weather forecast, telescope control, mosaic simulation or saved preferences.
- Astronomical calculations and the catalogue work offline; survey and morphology photographs need internet.
- Times are sampled every 15 minutes. Scores are heuristic and do not predict image quality.
- Local obstructions, atmospheric extinction and light pollution are not modelled. The horizon sector is a simple azimuth mask, not an obstacle map.
- Downloaded HTML execution on mobile depends on the operating system and browser; this release primarily targets desktop browsers.
