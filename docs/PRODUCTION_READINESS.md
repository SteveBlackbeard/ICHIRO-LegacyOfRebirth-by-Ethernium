# Production readiness

ICHIRO's current cinematic presentation is the protected production baseline.
Production hardening may improve validation, packaging, portability and recovery
without changing approved DOM, CSS, shaders, media timing or assets.

## Portable tool contract

- The runtime resolves all assets relative to the served site.
- Build and validation tools resolve the repository from their own location.
- Optional studio masters are supplied with `--masters` or `KPR_ASSET_ROOT`;
  they are not expected at an author's filesystem path.
- Optional fonts are supplied with `KPR_MONO_FONT` or discovered from the host.
- Browser tests accept explicit `KPR_*_BROWSER_PATH` variables and otherwise
  discover installed browsers from platform environment roots.
- Generated evidence belongs under `.artifacts/` and is not product source.

## Release gates

```text
npm ci
npm audit --omit=dev --audit-level=high
npm test
npm run test:e2e
npm run test:e2e:matrix
npm run test:e2e:static
```

GitHub Pages deploys only after canonical, browser and device-matrix jobs pass.
Release metadata, static package contents and deployed smoke evidence must refer
to the same commit.

## Honest boundary

Automated browser tests prove the declared journeys on CI browsers. Physical
GPU cadence, mobile audio unlock and 120 Hz behavior remain physical-device
release evidence. No tool may convert that limitation into an unverified claim.
