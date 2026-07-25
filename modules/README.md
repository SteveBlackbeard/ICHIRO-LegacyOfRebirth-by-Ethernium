# Runtime Modules Staging Area

This folder contains the incremental runtime modules extracted from `app.js`.

## Why It Exists

The approved v90 baseline must not be disturbed by a large refactor. Modules are introduced one by one, with no visual or interaction changes, after each boundary is documented and verified.

## Extraction Order

1. `dom.js`
   - DOM selector map only.
   - Lowest risk because it does not own behavior.
   - Connected in v91.

2. `state.js`
   - Local storage and archive progress helpers.
   - Must preserve `legacy-rebirth-archive-progress`.
   - Connected in v92.

3. `archive-data.js`
   - Static dossier data and initial unlocked IDs.
   - Connected in v92.

4. `helpers.js`
   - Pure utility helpers with no DOM/audio/state ownership.
   - Connected in v92.

5. `lore.js`
   - Lore loading, document-title cleanup, archive lore segment rendering, video/lore tabs.
   - Connected in v92.

6. `audio.js`
   - Ambient, cue pools, activation audio arm, archive video Web Audio.
   - High risk; extract after tests are ready.
   - Connected in v97.

7. `cursor.js`
   - PAMP cursor, bubbles, hover detection.
   - Highest risk; only extract after the current cursor stable state is captured in browser checks.
   - Connected in v98 for PAMP cursor and bubbles.

8. `activation-flow.js`
   - ACTIVATE, INITIALIZE HACK, hack simulation, access reveal.
   - Connected in v95.

9. `archive-ui.js`
   - Character profile, Media Archive, fold progress, video/lore UI.
   - Connected in v96.

10. `particles.js`
   - Canvas particles and layer gating.
   - Connected in v94.
   - Adds phase-aware frame pacing in v163 while preserving the approved rain look.

11. `kpco-logo.js`
   - KPCO canvas chroma-key/logo rendering.
   - Connected in v93.
   - Adds phase-aware chroma cadence in v163 while preserving the approved logo look.

12. `profile-hotzones.js`
   - Character alpha-map hit testing, rear frame/button hot zones, hover hysteresis, and profile parallax.
   - Connected in v99.

13. `hud-telemetry.js`
   - Header coordinates, simulated/real compass heading, speed, trace counter, and HUD hover bubbles.
   - Connected in v100.

14. `hack-terminal.js`
   - Hack simulation intrusion text, column rain generation, palette, and per-column timing variables.
   - Connected in v101.

15. `narrative.js`
   - Narrative playback timer, Play/Stop button labels, and sequential archive file opening.
   - Connected in v102.

16. `app-events.js`
   - Runtime event wiring for pointer, keyboard, media, wheel, touch, visibility, resize, login parallax, HUD/profile bubbles, and control clicks.
   - Connected in v103.

17. `performance.js`
   - A/B parameter ownership for `yatagarasu`, `video`, and `perf`.
   - Keeps baseline defaults unchanged while exposing test-only optimization lanes.
   - Connected in v106.

18. `preload-director.js`
   - Smart staged preloading for prelaunch, hack, access, archive, and video/lore.
   - Keeps approved visuals unchanged while warming the next phase.
   - Connected in v126.

19. `visual-quality.js`
   - Phase-aware visual budget state for baseline/adaptive modes.
   - Publishes `kprVisual*` data attributes for QA/debug without changing baseline visuals.
   - Connected in v129.

20. `performance-debug.js`
   - Optional debug HUD behind query flags.
   - Used for measurement only; never part of the default cinematic presentation.
   - Includes live FPS sampling in v146 behind `?debug=perf`.
   - Connected in v122+ debug passes.

21. `input-mode.js`
   - Detects pointer/touch mode, supports the QA-only `?touch=1` flag, toggles `kpr-touch-mode`, and swaps touch copy such as `SWIPE UP`.
   - Connected in v149.

22. `portal-energy.js`
   - Deterministic shared aperture, energy, pointer, impulse, phase and quality state.
   - Baseline mode is inert; observation is enabled only with `?portal=coherent`.
   - Adds no canvas, renderer, interval or animation loop.
   - Connected in v219.

23. `dossier-protocols.js`
   - Deterministic evidence-protocol engine for dossiers `00` through `10`.
   - Owns the cryptographic, signal, causal, forensic, routing, rotor, triangulation and Bayesian interactions.
   - Contains no generative service, network dependency, random solution or permanent render loop.
   - Unlocks remain owned by `archive-ui.js` and occur only after a verified solution.
   - Connected in v227 after removing the duplicate generic minigame implementation.
   - v228 adds evidence-derived clocks, spectrum peaks, graph geometry, source provenance and solvable rotor constraints; answers are never random or arbitrary.

24. `intercepted-transmission.js`
   - Renders the authenticated idle transmission event.
   - Uses measured inactivity and defers while reading, editing, watching media or using story surfaces.
   - Connected to the v227 idle contract.

25. `archive-progression.js`
   - Sole owner of opened, solved, unlocked and narrative-lead transitions.
   - Story choices may identify leads but cannot grant dossier access.
   - Connected in v229 and enforced by `tools/archive-progression-check.js`.

26. `idle-director.js`
   - Owns inactivity measurement, activity listeners, visibility suspension and teardown.
   - Contains no transmission rendering, story copy or audio.
   - Connected in v229; `intercepted-transmission.js` remains presentation-only.

27. `runtime-phase.js`
   - Sole DOM-to-runtime-phase interpreter and publisher.
   - Coalesces DOM mutations into one phase update and exposes subscription without a render loop.
   - Connected in v230.

28. `runtime-lifecycle.js`
   - Registry for subsystem start, stop, pause, resume and teardown ownership.
   - Reconciles registered systems against the shared phase director and page visibility.
   - Connected in v230.

## Coherent Portal Extension

- v222 keeps `portal-energy.js` renderer-neutral and adds a stable `read()` hot path.
- `portal-gpu.js` and the portal section of `app-events.js` consume the same field only when `?portal=coherent` is present.
- Baseline mode remains the default and preserves the approved runtime.
- Contract: `tools/interdimensional-portal-check.js`.

## Module Rule

When a module is first introduced, it should only move existing code. No new design, no new timing, no asset changes.

## Style Contract

- `styles/tokens.css` is the sole root-token authority from v231.
- `styles.css` retains the approved component cascade.
- Phase state originates in `runtime-phase.js`; CSS must not invent a second JavaScript phase model.
- Component-family CSS extraction requires an isolated cache contract and visual comparison.
