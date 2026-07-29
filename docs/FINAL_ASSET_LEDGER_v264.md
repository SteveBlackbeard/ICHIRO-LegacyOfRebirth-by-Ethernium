# Final Asset Ledger v264

## Objective

Freeze the approved Gold runtime and expose every remaining authored-media slot
without inventing replacement art. The source of truth is:

- `modules/dossier-assets.js` for dossier covers, evidence and soundscapes;
- `modules/publication-assets.js` for video support and external-link marks;
- `.artifacts/assets/final-asset-readiness-v264.json` for the generated audit.

The baseline for this work is `fcf46fadbbc639e4541f84adba90afb59b44558e`.

## Frozen systems

The asset-completion waves do not redesign or retime:

- activation and archive WebGL scenes;
- Energy Blade or Yatagarasu model hierarchy;
- portal optics;
- PAMP cursor;
- particles and cinematic transitions;
- authentication layout;
- dossier protocols and unlock graph;
- approved audio choreography.

An asset PR may touch one of these systems only when a reproducible P0/P1
defect proves the asset cannot be integrated through the declared contract.

## Dossier inventory

| Dossier | Cover | Evidence | Soundscape | Remaining authored slots |
| --- | --- | ---: | --- | ---: |
| 00 Manifest | approved | 1 approved | pending | 1 |
| 01 Saikon | approved | 2 approved | pending | 1 |
| 02 Nemeth | approved | 1 approved, 1 pending motion | pending | 2 |
| 03 Keigami | fallback SVG | 2 pending | pending | 4 |
| 04 Child Training | fallback SVG | 2 pending | pending | 4 |
| 05 LUMEN | fallback SVG | 2 pending | pending | 4 |
| 06 Yatagarasu | fallback SVG | 2 pending | pending | 4 |
| 07 Kira | fallback SVG | 2 pending | pending | 4 |
| 08 Aira | fallback SVG | 2 pending | pending | 4 |
| 09 Final Assault | fallback SVG | 2 pending | pending | 4 |
| 10 Public Rumors | fallback SVG | 8 pending | pending | 10 |

The eight SVG covers are valid low-cost runtime fallbacks, not final authored
covers. Narrative words such as `LOCKED`, `REDACTED` and `DATA MISSING` remain
intentional when they describe archive state.

## Publication inventory

| Slot | Current state |
| --- | --- |
| Favicon | approved KPR symbol |
| Social share image | approved activation seal |
| Archive-video poster | pending |
| Archive-video English captions | pending |
| Shine Time / X mark | pending |
| Pinterest mark | pending |
| New Eden mark | pending |

## Measured completion state

- 11 dossier contracts.
- 7 approved dossier media assets.
- 2 approved publication assets.
- 47 pending authored slots:
  - 8 covers;
  - 23 evidence or motion slots;
  - 11 soundscapes;
  - 1 poster;
  - 1 caption file;
  - 3 external-link marks.

The normal readiness gate accepts declared pending slots and records them. The
release-completion gate rejects any remaining pending slot:

```bash
npm run test:content
npm run test:content:final
```

## Asset intake order

1. Dossier 03 through 05.
2. Dossier 06 through 08.
3. Dossier 09.
4. Dossier 10.
5. Dossier soundscapes.
6. Captions, poster and external-link marks.

One dossier per pull request is preferred. Every change remains independently
reversible to the Gold baseline.
