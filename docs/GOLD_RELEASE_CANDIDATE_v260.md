# Gold Release Candidate v260

## Status

`1.0.0-rc.1` is technically prepared for cumulative review into `main`.
It is not the final production tag until GitHub CI and human review pass on the
merged commit.

## Promotion path

1. Push `codex/v260-gold-rc`.
2. Open one cumulative PR into `main`.
3. Require canonical validation, Chromium proof and weekly-soak readiness.
4. Review the visual evidence and release manifest fingerprint.
5. Merge without rewriting the reviewed tree.
6. Run the canonical gate on the merge commit.
7. Tag that merge commit `v1.0.0`.

## Release evidence

- repository integrity and production-readiness reports;
- asset, runtime, visual, dossier, accessibility and delivery contracts;
- local-observability contract;
- eight-stage browser proof;
- two-cycle cold/warm soak report;
- deterministic SHA-256 release fingerprint.

## Frozen experience

No visual, timing, audio, cursor, sword, dossier, model hierarchy or approved
asset-selection change is part of the Gold preparation.

## Rollback

The production rollback point before this series is:

`69935ecca6c4c75dad5812b90e541cfe2676ed23`

Rollback requires deploying that exact tree and confirming its generated
fingerprint. No database or data migration is involved.
