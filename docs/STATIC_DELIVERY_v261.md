# Static Delivery v261

## Objective

Publish the approved Gold runtime from a deterministic static distribution
without shipping studio masters, local tooling, QA evidence, or unresolved Git
LFS pointers.

This phase does not change HTML composition, CSS presentation, JavaScript
behavior, Three.js scenes, audio timing, assets, cursor behavior, or authored
transitions.

## Distribution contract

`npm run build:static` creates `.artifacts/site` from tracked runtime sources.
The builder:

- copies the seven runtime entry files
- copies tracked `modules/` and `styles/`
- resolves statically referenced runtime assets
- includes every phase-governed production asset
- excludes all `sourceMasters` declared by asset governance
- rejects unresolved Git LFS pointers
- enforces a 350 MiB deployment ceiling
- writes a SHA-256 `release-manifest.json`
- adds `.nojekyll` for literal static delivery

`npm run test:static` rebuilds the distribution and verifies required files,
forbidden directories, source-master exclusion, byte budget, manifest identity,
and LFS resolution.

`npm run test:e2e:static` then runs the complete Chromium golden path against
the packaged directory itself. This proves that JavaScript modules, media,
fonts, 3D models, dossiers and transitions were actually included.

## Deployment

The `deploy-pages` GitHub Actions job runs only for a push to `main` or a manual
workflow dispatch. It waits for both the canonical validation job and the
Chromium golden-path proof, then repeats that proof against the packaged site
before publishing the static artifact.

Pull requests build and test the distribution but never deploy it.

## Deliberate exclusions

Query-string A/B profiles that request source masters remain studio-only. The
public static artifact serves the approved production derivatives and default
adaptive runtime. The tagged repository retains the source-master pointers for
preservation and controlled QA.

## Rollback

The v1.0.0 Gold tag remains immutable. A failed v261 deployment can be removed
or rolled back without changing that tag or the approved runtime source.
