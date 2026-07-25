# Performance Notes

## Current Optimizations
- Canvas device pixel ratio is capped to reduce GPU cost.
- KPCO chroma-key processing is throttled instead of running at full video resolution every frame.
- Cursor-driven parallax writes are synchronized with requestAnimationFrame.
- Canvas loops pause when the page is hidden.
- PAMP cursor is now CSS-native. The earlier fixed overlay is disabled to avoid RAF lag, right-side flicker, and cursor duplication over heavy panels/canvas surfaces.
- Normal and hover cursor variables intentionally resolve to the same PNG. Avoid swapping cursor images on hover over dense panels; image swaps can flicker during fast movement.
- Activation and particle canvas loops stop when their phase is no longer visible.
- Archive WebGL renders on demand instead of continuous idle 60 FPS.
- `YATAGARASU BASE LOW.glb` is used for the runtime blueprint and is still deferred after archive entry, reducing model weight from roughly 508 MB to roughly 275 MB.
- Archive video native controls are removed to prevent browser cursor/control-layer conflicts.
- Heavy video/lore panel backdrop blur was reduced while keeping the black-glass look.
- Archive video audio now has an explicit media-hold/release path so ambient audio counters do not get stuck.
- Archive video sound now uses Web Audio decoded from the same MP4 while the visual `<video>` stays muted. This avoids repeated browser desmute/autoplay failures and keeps the sound start tied to the video-window reveal.

## Main Bottlenecks
- MP4 chroma key requires per-frame pixel processing.
- Multiple canvas layers can become expensive on high-DPI displays.
- Large blur, glow, and drop-shadow effects can be costly if overused.
- `YATAGARASU BASE LOW.glb` is still large for runtime and should eventually be converted into a web-budget derivative from the same approved model.
- `designation-silent-sentinel.mp4` is large; production should use compressed MP4/WebM variants with the same visual timing.
- Native media controls, scrollbars, and inactive full-screen layers can reveal OS cursor or intercept pointer events if reintroduced.

## Recommended AAA Path
- Export KPCO logo as WebM with alpha or transparent image sequence.
- Keep particle systems pooled and capped.
- Use CSS transforms for cinematic transitions; avoid layout changes during animation.
- Prefer one global grid overlay and avoid nested grid backgrounds in panels.
- Build optimized GLB variants as A/B files, not overwrites. Preserve hierarchy, pivot, material names, and approved camera composition before switching runtime references.
- Set asset budgets: target sub-20 MB interactive GLBs where possible, compressed video derivatives, and no continuous render loops unless an object is visibly moving.
- For web runtime prefer GLB/GLTF over FBX. Use FBX as an authoring interchange only, then export a validated GLB with preserved pivots/materials.
- Energy Blade optimization v74 reduced `blade low.glb` from ~2.804 MB on disk to:
  - ~1.529 MB with decal preserved and texture reduced.
  - ~1.274 MB with decal preserved plus normal/UV quantization.
  - ~1.071 MB with the decal plane removed plus normal/UV quantization.
- Quantization intentionally skips positions to preserve silhouette/pivots; only normals and UVs are quantized through `KHR_mesh_quantization`.
- Do not make `blade-low-clean-no-decal-quant.glb` default until visual QA confirms the removed Copilot decal is not needed in the approved sword composition.
- `sword=clean-decal` now intentionally loads raw `blade-low-source.glb` for visual QA because the optimized low variants can alter perceived assembly/draw order. Keep optimized files as lab candidates until they pass side-by-side inspection.
- Keep `depthTest = true` on real sword GLB materials. Disabling depth testing can make separate primitives/materials render over each other and look like loose/disassembled pieces.

## Synergistic AAA Optimization Methodology (Sinergia Disciplinaria)
How we achieve high-fidelity "AAA" portals with minimal resources:
1. **Hybrid AI & Symbolic Programming**: We use connectionist models (neural networks) for patterns, design layouts, and creative generation, but we govern them with strict symbolic program solvers (our automated static baseline rules, AST linters, and verification checks). This guarantees 100% correctness and zero runtime overhead.
2. **Biological/Biomimetic Efficiency**: We design systems like metabolic systems. We do not run 60 FPS loop cycles continuously; we use reactive event-driven render cycles, lazy evaluation, and only update canvas buffers when changes (mouse moves or transitions) are active. Inactive layers are hidden and completely paused.
3. **Reverse Engineering & Hacking**: We dissect rendering engine behavior (such as Chromium rendering pipelines) to prevent GPU-to-CPU blocking readbacks. We hack around constraints by replacing heavy calculations with optimized mathematical LERPs and caching selector lookups.
4. **Declarative Modularization (Low Code / High Code)**: We use declarative structural styling for layouts (CSS Grid/Flexbox) for rapid changes, and low-level performant algorithms (raw WebGL, custom quantizations) for critical performance paths.
5. **Defensive Cybersecurity Practices**: We sanitize input streams and strictly isolate state transitions. State machines prevent resource leaks and avoid competing loops during phase transitions.

