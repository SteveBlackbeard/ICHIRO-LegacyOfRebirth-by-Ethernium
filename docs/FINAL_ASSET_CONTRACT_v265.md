# Final Asset Contract v265

## Purpose

Make final media integration data-driven. Adding a dossier asset must not
require new branching in `archive-ui.js`, new CSS, or a change to the cinematic
systems.

## Runtime contract

`modules/dossier-assets.js` declares one bundle for every dossier:

- `cover`;
- ordered `evidence`;
- `audio`.

The evidence array has the same length and order as the narrative slots in
`modules/archive-data.js`. `archive-ui.js` resolves the bundle when a dossier
opens. Media with an approved `src` is mounted then, not during application
boot. Pending media keeps the current engraved text panel or lightweight SVG
cover.

Static images use lazy decoding. Motion evidence may use WebM or MP4 and starts
muted inside the already approved holographic frame. A final dossier soundscape
uses the existing audio button and begins only after the visitor clicks it.

`modules/publication-assets.js` owns deferred poster, caption and external-link
mark slots. No final source means no request and no visual change.

## Adding one final asset

1. Place the production derivative in the correct runtime directory:
   - covers/evidence: `assets/dossiers/`;
   - soundscapes: `assets/audio/dossiers/`;
   - poster/captions/link marks: `assets/publication/`.
2. Keep the studio master outside the production path or in Git LFS according
   to asset governance.
3. Change the slot from `pendingAsset(...)` to `approvedAsset(...)`, or the
   equivalent publication declaration.
4. Set the full `src`, accessible description, maximum bytes and provenance.
5. Run `npm run test:content` and the canonical `npm test`.
6. Capture the affected dossier and compare it with the Gold composition.
7. Merge only that coherent asset unit.

## Required metadata

Every approved source requires:

- stable ID;
- tracked runtime path;
- non-empty accessible description;
- byte ceiling;
- media type;
- rights/provenance classification;
- unique source path.

The validator rejects missing catalog bundles, slot-count drift, duplicate
sources, untracked files, oversize derivatives and approved assets without
provenance.

## Accessibility and fallback

- Decorative card covers remain `aria-hidden`.
- Evidence uses its authored description.
- Motion evidence is muted and non-essential to puzzle completion.
- Dossier audio never autoplays.
- Caption assets use WebVTT and the local server serves `text/vtt`.
- A missing final asset never blocks the deterministic dossier protocol.

## Rollback

Remove the approved source from its catalog slot and restore the pending
declaration. The previous text/SVG fallback returns without touching layout,
state or puzzle logic.
