# Asset Governance v253

## Purpose

Protect the approved visual experience while making asset weight, ownership,
and delivery measurable. v253 changes no runtime composition and replaces no
asset. It turns the current production path into a CI contract.

## Three asset classes

1. **Studio masters** retain source quality and live in Git LFS.
2. **Production derivatives** are normal Git blobs so static hosting receives
   real media bytes without an LFS dependency.
3. **Runtime phase assets** are loaded by the existing smart preload director
   only when their experience phase approaches.

The machine-readable contract is
`config/asset-budgets.v253.json`. The checker is
`tools/asset-governance-check.js`.

## Measured default path

| Phase | Measured | Budget |
| --- | ---: | ---: |
| Prelaunch | 1.45 MiB | 2.00 MiB |
| Hack | 12.90 MiB | 14.00 MiB |
| Access | 1.48 MiB | 2.00 MiB |
| Archive | 99.20 MiB | 105.00 MiB |
| Video and lore | 62.54 MiB | 68.00 MiB |
| Portal crossing | 61.99 MiB | 64.00 MiB |

These are phase budgets, not an instruction to preload their sum at boot.

## Governed production derivatives

| Asset | Measured | Ceiling |
| --- | ---: | ---: |
| Portal transition | 61.99 MiB | 64.00 MiB |
| Archive video | 55.94 MiB | 60.00 MiB |
| Yatagarasu blueprint | 67.26 MiB | 70.00 MiB |
| Energy Blade | 2.74 MiB | 3.00 MiB |
| Transparent KPCO logo | 0.11 MiB | 0.25 MiB |

CI fails if one of these files becomes untracked, moves into LFS, or exceeds
its ceiling. CI also fails if a declared master leaves LFS.

## Asset graph

The checker scans tracked HTML, CSS, root JavaScript, and runtime modules. It
records:

- tracked and statically referenced asset counts
- source owners for runtime references
- logical and repository storage sizes
- default phase membership
- production versus source-master policy
- approved aliases and inventory warnings

The JSON report is generated at
`.artifacts/assets/asset-report-v253.json` and retained by GitHub Actions for
fourteen days.

## Duplicate master note

`portal-transition.mp4` and `grok-transition.mp4` are byte-identical legacy
source aliases. Git LFS stores their shared content once remotely. Neither is
the default production transition, so this is documented rather than changed
inside v253.

## Safe interpretation

An asset reported as “not statically referenced” is a review candidate, not a
deletion candidate. Narrative libraries, optional variants, dynamically
selected media, and future dossiers can be valid without a literal runtime
reference. Removal requires a separate manifest-backed change and browser
proof.

## Commands

```bash
npm run test:assets
npm test
```

For a sparse local checkout, point the checker at the complete approved asset
tree:

```powershell
$env:KPR_ASSET_ROOT = "C:\path\to\complete\portal"
npm.cmd run test:assets
```

## Rollback

Revert the v253 commit. No runtime file, visual asset, preload timing, or URL
selection changes are required.
