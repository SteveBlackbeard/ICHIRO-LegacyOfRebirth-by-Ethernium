# Final Asset Production Master Plan v267

## Objective

Complete the authored-media layer without changing the approved Gold runtime.
The portal, cursor, WebGL scenes, Energy Blade, portal optics, interaction
timings and dossier protocols remain frozen.

The source of truth is `main` at merge `1e48131`, which includes the governed
v264-v266 asset contracts. The reversible production branch is
`codex/v267-asset-production-wave-1`.

## Master and derivative policy

A master is the highest-quality source used to create delivery files. Masters
may be lossless images, uncompressed audio, high-bitrate video or original 3D
models. They do not load in the browser.

Production derivatives are the compact files referenced by the portal:

- AVIF/WebP for authored stills;
- WebM/MP4 for motion evidence;
- OGG/MP3 for dossier soundscapes;
- WebVTT for captions.

Project-owned masters stay outside the runtime tree or in Git LFS. Only
measured production derivatives belong under `assets/`.

## Audit result

The current GitHub runtime is more advanced than the historical Documents
workspace. The local workspace remains a source library, not the merge target.
Candidate masters were inspected from `Downloads/Images`, `03_Multimedia` and
the historical portal assets.

Strong reusable candidates exist for:

- Keigami personnel material;
- LUMEN imagery;
- New Eden and Yatagarasu route material;
- Final Assault alignment;
- Prisma City and public-rumor fragments.

No existing candidate should be falsely approved for:

- the Child Training hand-wrap and ration-tablet evidence;
- Kira's recorder with white flowers;
- Aira's surgical reconstruction;
- several intimate public-rumor fragments.

Those slots require purpose-authored art.

## Production waves

### Wave A: deterministic owned media

1. Generate eleven loop-safe procedural dossier soundscapes.
2. Generate the three forensic motion records.
3. Extract an archive-video poster from the approved 4K/60 derivative.
4. Add project-owned publication link marks.
5. Validate byte budgets, hashes and source provenance.

### Wave B: derivatives from existing masters

1. Produce cohesive archive-grade covers and evidence from approved local art.
2. Preserve subject identity and narrative meaning.
3. Apply one shared crop, grade, border and texture grammar.
4. Keep source masters outside runtime paths.

### Wave C: purpose-authored narrative art

1. Produce only the scenes unsupported by existing masters.
2. Review each scene visually before catalog approval.
3. Integrate one coherent dossier at a time.

### Wave D: accessibility and release

1. Author and synchronize English WebVTT captions.
2. Run `npm run test:content:final`.
3. Run the canonical test suite and browser/device matrix.
4. Merge only with zero missing final slots and no visual regression.

## Acceptance gates

- No pending slot is presented as final without a real authored source.
- New covers stay below 180 KiB.
- Static evidence stays below 700 KiB.
- Motion evidence stays below 2.5 MiB.
- Soundscapes stay below 1.5 MiB.
- Every source has a stable path, accessible description, provenance and hash.
- A missing asset preserves the current deterministic fallback.

## Current result

Wave A, Wave B and the visual portion of Wave C are complete:

- 11 soundscapes;
- 3 motion records;
- 8 covers;
- 20 static evidence records;
- 1 archive-video poster;
- 3 publication link marks.

The 28 new still derivatives total approximately 1.53 MiB. The verified English
WebVTT transcript closes the final authored-media slot. See
`FINAL_ASSET_LEDGER_v267.md` and `CONTINUITY_v267.md`.
