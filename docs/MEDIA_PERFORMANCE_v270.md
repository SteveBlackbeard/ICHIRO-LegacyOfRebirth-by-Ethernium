# Media and render performance v270

## Scope

This wave restores the animated KPCO marks, Lumen textures, and the recovered-video panel while reducing decode, readback, draw-call, and off-phase animation cost. It keeps the approved composition, interaction flow, original source assets in Git history, and runtime fallbacks.

## Reproduced baseline

Measured in the in-app Chromium runtime at 1280x720, DPR 1, on the same machine and route:

| Phase | Before | After | Primary correction |
| --- | ---: | ---: | --- |
| Prelaunch | ~130 FPS | ~151 FPS | lifecycle/cache correctness |
| Access terminal | ~52 FPS | ~56 FPS | compositor-native alpha logo |
| Character profile | ~21 FPS, then 8-15 FPS once Lumen loaded | ~35-36 FPS | texture recovery, 2 draw calls, phase-scoped paint |
| Archive video | ~18 FPS | ~32 FPS | 1080p/60 delivery asset and hidden-video gating |

These are local samples, not universal guarantees. Frame rate depends on the display, browser compositor, GPU, thermal state, and viewport. The front page can exceed 120 FPS on the reference machine; the full archive deliberately retains heavier cinematic layers.

## Asset pipeline

- `lumen-original.glb`: geometry and material wiring are unchanged. Three embedded 4096px PNG maps were resized to 2048px with normal-vector renormalization by `tools/optimize-lumen-glb.py`. Decoded texture pressure drops from about 192 MiB to about 48 MiB.
- `yatagarasu-blueprint-studio.glb`: derived from the tracked quantized blueprint with glTF Transform 4.2.1 (`weld`, then `simplify --ratio 0.035 --error 0.015 --lock-border false`). The runtime merges the authored source meshes into one wireframe and one depth mask, reducing 2,937 draw calls to 2.
- `kpco-logo-transparent.webm`: VP9 alpha, 360x364, 30 FPS, full 8.37-second loop. MP4 remains the fallback. The alpha version is placed directly by the compositor; the canvas chroma-key path remains only for fallback browsers.
- `designation-silent-sentinel-budget.mp4`: 1920x1080, 60 FPS, H.264 High, AAC. The 4K source master remains available in the repository.

Changed media URLs carry `kpr-media-270`/`271` cache keys so an existing browser cache cannot retain the broken assets after deployment.

## Runtime controls

- Archive video priming stops after the first decoded frame and restarts only in `archive-video`.
- Video color-reactivity, lava motion, map portal motion, paint-bound gradients, and hidden phase animations are lifecycle-scoped.
- Lumen reuses one raycaster and samples hover at a bounded cadence.
- Repeated inner panels retain borders, gradients, and shadows without stacking individual backdrop-filter surfaces.
- `?debug=perf&panel=off` keeps the sampler active without rendering the diagnostic overlay.
- `?archive3d=off` is a diagnostic isolation switch only; production defaults to the full 3D scene.

## Verification and rollback

Run the focused contract with Node 22.12 or newer:

```text
npm run test:media-performance
```

The canonical `npm test` includes this contract. It verifies alpha metadata, media budgets, Lumen texture dimensions, studio triangle budget, consolidated rendering, cache-safe sources, and lifecycle gates.

For rollback, revert the release commit as one unit. Asset-specific recovery is also possible from its parent commit, but code and media should normally be reverted together because their cache keys and runtime paths are coupled.
