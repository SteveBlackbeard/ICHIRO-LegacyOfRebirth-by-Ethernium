# Continuity v268

## Decision

The governed v267 runtime remains the source of truth.

On 2026-07-30, `origin/main` pointed to presentation-only root commit
`547f746`. That root contained a README and thirteen SVG presentation assets,
but no application runtime, package manifest, tests, server or production
media. It was therefore not a functional successor to v267.

## Integration

- v267 production commit: `7441440`
- presentation root: `547f746`
- lineage merge: `af73991`
- integration branch: `codex/v268-sovereign-runtime-integration`

The two histories were joined without force-pushing or replacing either source.
The complete governed runtime remains intact. The compatible SVG presentation
assets were added under `badges/` and connected only to `README.md`.

## Hardening

- Removed remote Google Fonts imports from every imported SVG.
- Replaced presentation-only emoji and punctuation with portable ASCII labels.
- Verified all README image references resolve locally.
- Kept all imported presentation assets outside the browser runtime.

## Frozen systems

No HTML, CSS, JavaScript, GLB, video, audio, cursor, puzzle, transition or
runtime asset changed in v268.

## Verification

- `npm test`: passed.
- `npm run test:e2e`: passed all eight named browser stages.
- Browser report: no page errors, failed requests, bad responses or asset
  fallbacks.
- Chrome emitted only its known screenshot-time WebGL `ReadPixels` performance
  notices.

## Rollback

Revert the v268 presentation commit. The v267 application remains available at
commit `7441440`, and its runtime does not depend on the `badges/` directory.
