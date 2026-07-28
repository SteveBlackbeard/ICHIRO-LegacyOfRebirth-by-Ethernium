# Local Observability v259

## Objective

Make field failures diagnosable without surveillance, analytics services,
identifiers, cursor capture, coordinates, narrative text or background network
transmission.

## Runtime envelope

`modules/observability.js` keeps at most 96 events in memory and aggregates:

- runtime phase and lifecycle errors;
- asset load failures using same-origin paths only;
- WebGL context loss and restoration;
- long-task count and total duration;
- resource count, duration and transfer bytes by initiator type;
- current adaptive quality state.

It adds no animation loop, interval, local storage entry, cookie, request,
beacon, socket or external dependency.

`window.__kprDiagnostics.snapshot()` returns a privacy-bounded diagnostic
object. `window.__kprDiagnostics.exportReport()` downloads that object only
after an explicit local call.

## Soak contract

`npm run test:soak` repeats the full Chromium golden journey at least twice and
records cold/warm wall time, stage count, runtime checks and browser errors.
The job runs weekly and on manual workflow dispatch, not on every code edit.

## Evidence

- `.artifacts/observability/observability-contract-v259.json`
- `.artifacts/soak/soak-report-v259.json`

## Frozen systems

No visual, audio, cursor, WebGL rendering, content, timing or asset-selection
behavior is changed by this wave.
