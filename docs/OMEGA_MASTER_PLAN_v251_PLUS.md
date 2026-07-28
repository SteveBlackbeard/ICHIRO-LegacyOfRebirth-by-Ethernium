# KPR Omega Master Plan v251+

## Mission

Finish ICHIRO - Legacy of Rebirth as a production-grade cinematic web
experience without losing the identity, choreography, portal physics, audio
language, cursor behavior, dossier structure, or approved visual assets of the
v250 baseline.

This is a release program, not a visual wish list. Every phase has an owner
boundary, measurable output, regression gate, rollback point, and definition of
done.

## Current baseline

- Product baseline: GitHub `main` at v250.
- Visual baseline: original Eden portal plus spectral preportal aperture.
- Runtime baseline: one VEIL loop, phase-owned WebGL, adaptive secondary
  density, native primary DPR, cached settled work, and coherent warp motion.
- Local workspace role: research, source masters, evidence, backups, and deep
  QA history.
- Public repository role: canonical production source, reproducible checks,
  release history, and deployable assets.

The local v245 runtime must never overwrite GitHub v250. Useful local QA,
documentation, and tooling may be promoted selectively through reviewed pull
requests.

## Non-regression covenant

The following remain frozen unless a task explicitly names them:

1. Activation and authentication choreography.
2. Original portal canvas and portal GPU layer.
3. Approved sword placement, pivot, texture, and reveal timing.
4. PAMP cursor identity and pointer hotspot.
5. Archive panel geometry and scroll progression.
6. Audio cue timing and external Web Audio strategy.
7. Character artwork, map composition, and narrative order.
8. Mandatory panoramic composition on mobile landscape.

Every change must be isolated, reversible, cache-versioned, and compared
against a named baseline.

## Product quality targets

### Runtime

- Zero uncaught errors during the complete authored journey.
- No duplicate animation, pointer, resize, audio, or visibility listeners.
- No simulation outside the phase that owns it.
- High tier: stable perceived 60 FPS, with 120 Hz cadence where the display and
  measured workload permit it.
- Adaptive tier: no sustained frame pacing below 30 FPS.
- No main-thread task above 100 ms during an interactive scene.
- No visible late layout correction after first presentation.

### Loading

- Initial shell and activation controls arrive before phase-heavy media.
- 3D, video, lore, and portal assets are requested by predicted phase, not all
  at boot.
- Production derivatives are the default; source masters never enter runtime.
- Every heavy asset has a declared owner phase, fallback, size, dimensions,
  codec, and visual comparison record.

### Interaction

- Pointer, mouse wheel, keyboard, touch, and reduced-motion paths are explicit.
- The custom cursor never exposes or flickers with the native cursor.
- All controls have one stable activation region and visible focus treatment.
- Audio starts only after a valid user gesture and then follows the authored
  phase contract.

### Presentation

- No malformed text, clipped copy, overlapping controls, broken alpha,
  temporary placeholder, or stale cache label in a production release.
- Visual hierarchy remains readable at supported desktop and landscape-mobile
  viewports.
- Spectral effects support the content; they do not flatten contrast or obscure
  primary art.

## Source-of-truth architecture

### Public repository

The GitHub `main` branch becomes the only production source of truth.

- Protected `main`.
- Pull requests required for runtime changes.
- One release tag for each approved baseline.
- One canonical `npm test` quality gate.
- No direct asset replacement without an A/B artifact and rollback path.

### Local workspace

The local workspace remains the studio vault:

- source masters
- historical backups
- render references
- browser evidence
- performance captures
- experimental branches and discarded variants

Nothing moves from the vault into production merely because it is newer. It
must pass the promotion contract.

## Phase 0 - Freeze and governance

### Deliverables

- Tag the current v250 baseline.
- Merge the v250 CI quality-gate repair.
- Record checksums for runtime HTML, CSS, JavaScript, GLB, video, and audio.
- Add branch protection and required status checks.
- Create `CHANGELOG.md`, `ARCHITECTURE.md`, and a compact public QA matrix.

### Exit gate

- A clean clone can install, test, start, and reproduce v250.
- No production work depends on an untracked local file.
- Rollback to v250 is documented and tested.

## Phase 1 - Repository integrity

### Deliverables

- Add a UTF-8 validation gate for public text files.
- Inventory all assets by runtime reference graph.
- Move unreferenced frame sequences and obsolete variants out of the production
  tree without deleting studio originals.
- Confirm `.gitignore`, `.gitattributes`, LFS boundaries, MIME types, and cache
  policy.
- Remove unused dependencies only after code-search and clean-install proof.
- Separate repository checkout size from runtime transfer size.

### Exit gate

- Every production asset is referenced, intentionally preserved, or documented.
- No machine-specific path, secret, session state, or malformed text ships.
- Clean installation and validation are deterministic.

## Phase 2 - Continuous verification

### Deliverables

- Canonical `npm test` gate:
  - production readiness
  - VEIL contract
  - entry contract
  - transmission contract
  - cinematic cohesion contract
- Browser E2E for activation, hack, access, authentication, archive, dossiers,
  video/lore, map, portal, and warp.
- Console, network, missing-asset, and unhandled-rejection assertions.
- Deterministic screenshots at approved desktop and landscape-mobile viewports.
- Reduced-motion and keyboard-only paths.

### Exit gate

- Pull requests cannot merge with a failed contract.
- The complete golden path runs in Chromium, Firefox, and WebKit.
- Visual snapshots have named tolerances and human approval for intentional
  differences.

## Phase 3 - Asset pipeline

### Deliverables

- Replace per-frame KPCO chroma key with transparent WebM where supported and a
  tested fallback elsewhere.
- Remove the unused KPCO PNG sequence from the production payload.
- Produce audited GLB derivatives with preserved hierarchy, pivots, materials,
  color space, alpha mode, and bounding boxes.
- Produce AV1/WebM and H.264 video derivatives with poster frames and range
  streaming.
- Generate a machine-readable asset manifest.
- Add automatic size, duration, dimensions, codec, and missing-reference gates.

### Suggested production budgets

| Asset class | Default target | Hard review threshold |
| --- | ---: | ---: |
| Initial HTML + CSS + JS | 1.5 MB compressed | 2.5 MB |
| Activation media | 3 MB before gesture | 5 MB |
| Individual texture | 2 MB | 4 MB |
| Individual production GLB | 45 MB | 75 MB |
| Individual production video | 70 MB | 100 MB |
| Audio cue | 1.5 MB | 4 MB |

Source masters are excluded from runtime budgets.

### Exit gate

- No source master is requested by the application.
- Visual A/B evidence confirms no meaningful approved-detail loss.
- Asset loading is phase-predicted and abortable.

## Phase 4 - Runtime frugality

### Deliverables

- Build a phase ownership table for every RAF loop, timer, observer, WebGL
  context, canvas, audio node, and pointer stream.
- Suspend hidden and off-phase work.
- Coalesce pointer and resize work.
- Reuse typed arrays, geometry, materials, gradients, and render targets.
- Add GPU context-loss recovery and memory-pressure fallback for every WebGL
  scene.
- Use quality hysteresis so tiers do not oscillate during short frame spikes.
- Measure CPU time, GPU time where available, memory, long tasks, and dropped
  frames by phase.

### Exit gate

- Exactly one owner exists for every hot loop.
- No detached observer, listener, audio node, or WebGL resource remains after
  leaving a phase.
- Adaptive quality preserves choreography and primary silhouettes.

## Phase 5 - Visual cohesion

### Deliverables

- Establish one optical grammar for glass, spectral edges, holography, warning
  red, telemetry cyan, anomalous violet, and iridescent titles.
- Audit portal, transmission, access, archive, dossiers, video/lore, map, and
  warp as one continuous sequence.
- Remove effects that duplicate depth instead of creating it.
- Match glow radius, grain, scanlines, chromatic separation, and motion easing
  to perceptual scale.
- Preserve readable blacks and avoid veiling primary character and map art.

### Exit gate

- Every effect has a narrative or depth function.
- No screen reads as unrelated stacked layers.
- The experience remains recognizable with optional secondary optics disabled.

## Phase 6 - Dossiers and advanced interaction

### Deliverables

- Replace placeholders with authored evidence, lore, audio, images, and
  recoverable metadata.
- Give every dossier one original interaction based on its story:
  - spatial reconstruction
  - signal triangulation
  - temporal ordering
  - acoustic matching
  - constrained cipher inference
  - artifact inspection
- Avoid generic sliders, memory cards, CAPTCHA-like tests, and arbitrary
  password guessing.
- Add clear affordances, reversible attempts, progressive hints, and persistent
  recovery state.
- Keep puzzle logic deterministic and testable.

### Exit gate

- Every interaction teaches or reveals narrative information.
- No puzzle can soft-lock progression.
- Keyboard and touch alternatives exist.
- State restoration survives refresh and version migration.

## Phase 7 - Accessibility and device contract

### Deliverables

- Semantic landmark, heading, dialog, form, and status review.
- Focus management for every modal and phase transition.
- Captions or transcript for narrative video and meaningful audio.
- Contrast verification for glass and iridescent text.
- Reduced-motion alternatives for portal, warp, shake, scanline, and flash.
- Touch targets and safe-area handling for landscape mobile.
- Device-orientation compass only after explicit permission.

### Exit gate

- WCAG 2.2 AA for meaningful controls and content, with documented exceptions
  for the authored panoramic orientation requirement.
- No keyboard trap.
- No information exists only in color, motion, or sound.

## Phase 8 - Security, privacy, and delivery

### Deliverables

- Content Security Policy compatible with modules, media, canvas, and WebGL.
- Strict MIME, range requests, compression, and safe path resolution.
- Cache immutable only for content-hashed assets.
- Dependency audit and update policy.
- Private vulnerability reporting.
- No analytics, telemetry, or device sensor collection without disclosure and
  consent.
- Automated deployment to stable HTTPS preview and production URLs.

### Exit gate

- Security headers pass automated inspection.
- No secret, local path, session data, or private document ships.
- A release can be reproduced from a tag without the studio machine.

## Phase 9 - Observability and field QA

### Deliverables

- Privacy-preserving runtime health signals for phase, quality tier, context
  loss, asset failure, and fatal error.
- Synthetic cold and warm loading runs.
- Device matrix covering integrated GPU, discrete GPU, 60 Hz, 120/144 Hz, and
  supported landscape mobile.
- Long-session and repeated-navigation soak tests.
- Audio unlock, tab visibility, suspend/resume, and interruption tests.

### Exit gate

- Known failures are diagnosable without the studio machine.
- Performance regressions are detected before release.

## Phase 10 - Release and award presentation

### Deliverables

- Stable public URL and fallback landing state.
- A 30-60 second judge path that reaches the strongest interaction quickly.
- Full authored path remains available without reducing narrative depth.
- Optimized social preview, poster frame, metadata, favicon, and share card.
- Case study covering concept, interaction design, WebGL architecture,
  frugality, accessibility, and measured results.
- Credits, rights, asset provenance, and technology disclosure.

### Exit gate

- Fresh visitors understand how to begin without explanatory body copy.
- The strongest visual beat appears within a realistic judging session.
- Release tag, changelog, deployment, checks, and rollback agree.

## Phase 11 - Final stabilization

### Deliverables

- Two-week visual freeze.
- Only P0/P1 defects may change runtime during the freeze.
- Full browser, device, accessibility, performance, audio, and content pass.
- Final asset checksum and dead-code report.
- Final backup of production tag and studio vault.

### Exit gate

All conditions in the final definition of done are true.

## Release waves

1. **v251 - Integrity:** CI gate, baseline tag, UTF-8 gate, source of truth.
2. **v252 - Proof:** E2E, browser matrix, screenshots, console/network gates.
3. **v253 - Assets:** transparent KPCO, asset graph, production derivatives.
4. **v254 - Runtime:** phase ownership, memory cleanup, adaptive hysteresis.
5. **v255 - Cohesion:** optical grammar and transition polish.
6. **v256 - Dossiers:** authored evidence and advanced interactions.
7. **v257 - Access:** accessibility, touch, keyboard, captions.
8. **v258 - Delivery:** CSP, hashed caching, HTTPS deployment.
9. **v259 - Field:** observability, soak testing, device matrix.
10. **v260 - Gold:** visual freeze, release candidate, award package.

Version numbers describe release waves, not permission to batch unrelated
changes. Each pull request remains small and independently reversible.

### Delivery status

- **v251 complete:** repository integrity and production-readiness gates are
  connected to CI.
- **v252 complete:** the Chromium golden path captures eight named stages,
  verifies desktop/reduced-motion/mobile contracts, and publishes its evidence
  as a CI artifact. See [Browser Proof v252](E2E_PROOF_v252.md).
- **v253 complete:** source masters, production derivatives, runtime references,
  and phase budgets are governed by CI. See
  [Asset Governance v253](ASSET_GOVERNANCE_v253.md).
- **v254 complete:** phase-owned controllers, hidden-tab suspension, KPCO loop
  cleanup, lifecycle telemetry, and a scheduled-work inventory are governed by
  CI. See [Runtime Ownership v254](RUNTIME_OWNERSHIP_v254.md).
- **v255 complete:** semantic optical tokens, stylesheet order, primary
  silhouettes and CSS complexity ceilings are governed by CI without changing
  the approved render.
- **v256 complete:** all eleven evidence protocols use shared deterministic
  validators; CI proves positive and negative cases plus unlock reachability.
  See [Dossier Contracts v256](DOSSIER_CONTRACTS_v256.md).
- **Next:** v257 closes keyboard, focus, dialog and tab semantics.

## Promotion contract

For every change:

1. Name the exact user-visible or operational objective.
2. Record the baseline and affected phase.
3. Identify files and systems that must remain frozen.
4. Implement the smallest coherent change.
5. Run relevant static, runtime, browser, performance, and accessibility gates.
6. Compare evidence against the baseline.
7. Document rollback.
8. Merge only after the canonical gate is green.

## Risk register

| Risk | Consequence | Control |
| --- | --- | --- |
| Local and GitHub divergence | Lost improvements or regressions | GitHub `main` is production truth |
| Heavy eager assets | Delayed first interaction | Phase-directed preload and budgets |
| Multiple visual loops | Frame pacing collapse | One owner per phase and loop inventory |
| CSS override accumulation | Unpredictable composition | Layer order, tokens, removable passes |
| Cursor/native pointer conflict | Broken interaction identity | One cursor authority and E2E coverage |
| Audio autoplay assumptions | Silent or inconsistent scenes | Gesture unlock and phase contract |
| GLB hierarchy edits | Broken sword or blueprint | Immutable source, derivative pipeline |
| Encoding drift | Broken public copy | UTF-8 gate |
| Stale immutable cache | Old assets after release | Content hashes |
| Visual-only QA | Hidden functional failure | Browser, console, network, and state gates |

## Definition of done

ICHIRO - Legacy of Rebirth is finished when:

- `main` is reproducible from a clean clone.
- The canonical CI gate is green.
- The full golden journey passes supported browsers and devices.
- No P0 or P1 defect remains.
- No console error, missing asset, malformed text, placeholder, or broken
  interaction remains in production.
- Runtime budgets pass on high and adaptive tiers.
- Heavy assets load only for their owner phases.
- Keyboard, touch, reduced-motion, captions, and focus contracts pass.
- Security, cache, privacy, deployment, and rollback contracts pass.
- Dossiers contain authored evidence and meaningful deterministic interaction.
- The public URL, release tag, changelog, case study, and production checksum
  describe the same build.
- Studio vault and production repository have documented, non-overlapping
  responsibilities.

## Immediate next three pull requests

1. Merge `codex/v250-ci-quality-gate`.
2. Add repository integrity, UTF-8, asset-reference, and clean-clone gates.
3. Add the first complete browser E2E golden-path workflow.

No new visual feature should precede these three integrity steps.
