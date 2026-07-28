# Mega Ultra Master Plan v259-v260

## Purpose

Finish the production foundation without changing the approved cinematic
experience. Every version remains an independent commit. The final pull request
is cumulative because v251-v260 form one linear series above production v250.

## v259 - Private field observability

- bounded in-memory health envelope;
- phase, quality, runtime error, asset failure and WebGL context evidence;
- aggregate resource and long-task metrics;
- explicit JSON export with no automatic network transmission;
- cold/warm repeated-browser soak evidence;
- scheduled CI soak without adding a permanent render loop.

## v260 RC - Gold preparation

- release-candidate contract and immutable release metadata;
- changelog and technology/rights disclosure;
- deterministic checksum agreement with secure-delivery evidence;
- browser, accessibility, performance and security matrix;
- exact rollback commit and promotion procedure;
- cumulative production PR ready for CI and human review.

## Merge strategy

1. Keep every wave as a separate commit.
2. Open one cumulative PR from the final v260 RC branch into `main`.
3. Require canonical CI, browser proof and review.
4. Merge once; tag the merge commit as v1.0.0 only after CI is green.
5. Preserve all wave branches as forensic rollback points until release close.

## Frozen systems

Portal visuals, timing, audio, cursor, sword, dossiers, GLB hierarchy, shaders
and approved asset selection remain frozen throughout v259-v260.
