# Frugal Asset Pipeline v266

## Objective

Increase authored media quality without moving cost into initial load or
continuous render work.

## Intake budgets

| Asset class | New production ceiling |
| --- | ---: |
| Dossier cover | 180 KiB |
| Static evidence | 700 KiB |
| Motion evidence | 2.5 MiB |
| Dossier soundscape | 1.5 MiB |
| Active new dossier target | 4 MiB |

Existing Gold derivatives above these targets are explicitly marked
`legacyApproved`. They are not silently recompressed during content intake.
They may be replaced only through a visual A/B proof.

## Format policy

- Covers: AVIF or WebP; PNG/JPEG only when visually justified.
- Evidence: AVIF/WebP for stills; PNG only for essential alpha or line art.
- Motion: short WebM/MP4 loops instead of GIF.
- Soundscape: MP3 or OGG with controlled loudness and no hidden silence.
- Captions: UTF-8 WebVTT.
- SVG: trusted project-authored vectors only.

Masters retain editing quality. Runtime derivatives contain only the resolution
visible in the interface. Evidence is displayed at a maximum of 280 CSS pixels,
so oversized 4K raster delivery is normally wasteful rather than higher
quality.

## Loading policy

- Covers may load with the archive shell.
- Evidence paths are assigned only when their dossier opens.
- Audio uses `preload="none"` and loads after explicit interaction.
- Pending slots make no network request.
- Closing a dossier stops and releases its active soundscape.
- No asset adds a permanent animation loop to the page.

## Automated evidence

`tools/final-asset-check.mjs` emits:

`.artifacts/assets/final-asset-readiness-v264.json`

The report includes approved sizes and hashes, pending briefs, per-media counts,
legacy exceptions, validation failures and strict-completion state. CI uploads
the report for every pull request.

## Final gate

Before the content-complete release:

```bash
npm run test:content:final
npm test
npm run test:e2e
npm run test:e2e:matrix
```

The strict gate must report zero pending slots. Browser proof must report zero
page errors, failed requests and HTTP failures.
