# Browser Proof v252

## Purpose

Prove the approved v250 runtime in a real browser without adding test hooks,
changing choreography, or weakening the visual experience.

## Golden path

`tools/e2e-proof.js` exercises:

1. activation boot and the `ACTIVATE` to `INITIALIZE HACK` state
2. hack simulation and access-terminal reveal
3. authentication and the recovered-intelligence profile
4. PAMP cursor ownership on the right-hand Media Archive
5. an available dossier and its case viewer
6. archive panel fold, recovered video/lore, and New Eden map
7. map-node intelligence and the first portal-crossing frame

The runner also checks reduced-motion boot, landscape-mobile presentation, and
the portrait orientation guard.

## Quality gates

- no uncaught page exception
- no console error
- no failed same-origin request
- no HTTP response at status 400 or above
- PAMP remains visible and owns the native cursor on desktop
- every required stage intersects the viewport
- every named screenshot is non-empty

Warnings are recorded in the JSON report. Set
`KPR_E2E_STRICT_WARNINGS=1` to promote them to failures.

## Usage

```bash
npm ci
npm run test:e2e
```

Optional environment variables:

- `KPR_E2E_BASE_URL`: test an already-running server
- `KPR_E2E_SERVER_ROOT`: start `server.js` from a full asset worktree
- `KPR_E2E_ASSET_ROOT`: serve branch code with missing sparse assets from a
  complete local worktree
- `KPR_E2E_BROWSER_PATH`: explicit Chrome or Edge executable
- `KPR_E2E_PORT`: local server port, default `4173`
- `KPR_E2E_HEADLESS=0`: show the browser
- `KPR_E2E_STRICT_WARNINGS=1`: fail on browser warnings

Evidence is written to `.artifacts/e2e` and uploaded by GitHub Actions for
fourteen days.

## Non-regression boundary

The proof runner is external to the application. It does not expose privileged
runtime methods, bypass dossier progression, alter local storage, replace
assets, or disable production visual systems.
