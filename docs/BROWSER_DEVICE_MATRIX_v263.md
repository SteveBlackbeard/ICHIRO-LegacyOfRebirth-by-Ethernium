# Browser And Device Matrix v263

## Objective

Extend the approved Gold proof without changing the runtime. The automated
matrix validates the complete archive journey in installed Chrome and Edge,
then repeats the presentation contracts for reduced motion, mobile landscape,
mobile portrait and a high-density touch viewport.

## Automated Coverage

- Linux Chrome: complete Gold journey in the existing `browser-proof` job.
- Windows Chrome: complete Gold journey through `test:e2e:matrix`.
- Windows Edge: complete Gold journey through `test:e2e:matrix`.
- Desktop viewport: 1440 x 900 at DPR 1.
- Reduced motion: 1366 x 768 with `prefers-reduced-motion: reduce`.
- Mobile landscape: 844 x 390 with touch input.
- Mobile portrait guard: 390 x 844 with touch input.
- High-density touch: 1024 x 768 at DPR 2, including a real touch activation,
  custom-cursor suppression and horizontal-overflow contract.

Every browser run records screenshots, console messages, page errors, failed
requests, HTTP failures, lifecycle state and interaction contracts. Deployment
is blocked unless Linux Chrome and the Windows Chrome/Edge matrix pass.

## Local Qualification

The initial Windows qualification completed on 2026-07-29:

- Chrome 150.0.7871.187: 8 stages and 16 contracts passed.
- Edge 150.0.4078.105: 8 stages and 16 contracts passed.
- Both DPR 2 touch profiles reported one touch point and zero horizontal
  overflow.
- Both runs reported zero page errors, failed requests and HTTP failures.
- Chrome and Edge profile screenshots retained the approved Gold composition.

## Honest Engine Boundary

Chrome and Edge are separate production browsers but share the Chromium
engine. Firefox support is parameterized in `tools/e2e-proof.js`, yet it is not
promoted to a required gate until a compatible Firefox binary can be installed
reproducibly. A local stable Firefox download was attempted and did not
complete, so no unsupported success claim is recorded.

WebKit requires a separate Playwright runtime and browser payload. It remains a
future opt-in gate rather than adding a large dependency to the Gold runtime
without evidence.

## Physical Device Protocol

Emulation does not prove hardware performance. The following checks remain
manual release evidence:

1. Windows integrated GPU at 60 Hz.
2. Windows discrete GPU at 60 Hz and 120 Hz.
3. Android Chrome in portrait and landscape.
4. iOS Safari in portrait and landscape.
5. Audio unlock, touch progression and orientation changes on physical mobile
   hardware.

Physical results must record device, OS, browser version, refresh rate,
observed frame stability, audio status and any visual divergence from Gold.

## Commands

```powershell
npm run test:e2e
npm run test:e2e:matrix
```

Optional Firefox experimentation:

```powershell
$env:KPR_E2E_BROWSER_ENGINE = "firefox"
$env:KPR_E2E_BROWSER_PATH = (Get-Command firefox).Source
npm run test:e2e
```
