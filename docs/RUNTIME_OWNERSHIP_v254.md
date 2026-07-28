# Runtime Ownership v254

## Objective

v254 makes scheduled browser work observable and suspendable without changing
the approved image, sound, cursor, 3D assets, choreography, or timing. The v253
runtime remains the visual baseline.

## Ownership contract

`modules/runtime-phase.js` publishes one phase vocabulary:

- `prelaunch`
- `hack-intro`
- `access-terminal`
- `character-profile`
- `dossier`
- `archive-video`
- `map`
- `story`

`modules/runtime-lifecycle.js` is the single authority for controllers that own
continuous or event-driven work. A controller may expose `start`, `pause`,
`resume`, `stop`, and `destroy`. Registration is unique by name and may be
restricted to one or more phases.

The current owners are:

| Owner | Active phases |
| --- | --- |
| `input-mode` | all |
| `performance` | all |
| `visual-quality` | all |
| `kpco-logo` | all |
| `magnetic-ui` | authenticated phases |
| `parallax-depth` | authenticated phases |
| `audio-reactivity` | authenticated phases |
| `lumen-stats` | character profile only |
| `preportal-fluid` | all, internally gated |

## Visibility and recovery

When the document becomes hidden, `app-events` asks the lifecycle to suspend
with reason `document-hidden`. Controllers are paused or stopped and resume
through the same authority when the document becomes visible. KPCO now cancels
its RAF and adaptive timer instead of waking periodically in a hidden tab.

A controller exception is isolated, recorded, emitted as
`kpr-runtime-controller-error`, and exposed in the lifecycle snapshot. One
secondary controller can therefore fail without corrupting ownership state for
the rest of the experience.

For QA, `window.__kprRuntimeLifecycle.snapshot()` reports:

- current phase and suspension reason
- active/started state per controller
- activation/deactivation counts
- last lifecycle method
- bounded controller error history

This surface is diagnostic only and does not drive presentation.

## Automated evidence

Run:

```bash
npm run test:runtime
npm run test:e2e
```

The static gate writes `.artifacts/runtime/runtime-report-v254.json`, validates
required owners and phase names, and inventories JavaScript files containing
RAF, interval, or timeout scheduling. The browser proof asserts lifecycle state
in the character-profile and archive-video phases, including that LUMEN stops
outside its owner phase.

## Rollback

Revert the v254 commit. No CSS, media, GLB, audio, or persistent-state schema
changed, so rollback has no asset or migration dependency.
