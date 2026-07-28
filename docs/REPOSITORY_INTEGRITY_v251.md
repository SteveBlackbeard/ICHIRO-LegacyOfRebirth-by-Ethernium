# Repository Integrity v251

## Purpose

Turn the public repository into a reproducible production source of truth
without altering the approved v250 visual runtime.

## Implemented contract

`tools/repository-integrity-check.js` validates:

- every tracked public text file decodes as UTF-8
- no high-confidence mojibake or replacement characters are present
- workspace-only folders, logs, backups, and environment files are not tracked
- static runtime asset references resolve to tracked files
- production derivatives and public governance files exist
- GitHub Actions never calls a missing npm script
- the canonical `npm test` gate includes every current contract
- source-master LFS boundaries remain declared
- primary application and stylesheet cache labels do not trail the public
  runtime version declared by `PUBLICATION_MANIFEST.md`

Unreferenced assets are reported as warnings for the v253 asset-pipeline pass;
they are not deleted or failed automatically because some are intentionally
retained source material.

## Defect corrected

The v250 commit changed `app.js` but `index.html` still requested it with a v249
cache label. The runtime code itself was correct, but a browser or CDN could
reuse the older entrypoint. v251 aligns the cache label with the v250 baseline
and permanently checks this relationship.

## Non-regression boundary

- No shader, canvas, WebGL, particle, cursor, audio, dossier, or transition
  behavior changes.
- No asset is replaced, moved, compressed, or deleted.
- The original portal and VEIL layers remain untouched.
- The validator reads the Git index, so CI can verify asset references without
  loading source-master binary contents into memory.

## Validation

Run:

```bash
npm run test:integrity
npm test
```

The standalone command is suitable for fast repository checks. `npm test`
remains the canonical release authority and runs this integrity contract first.
