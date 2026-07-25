# Extraction Notes

## First Safe Cut: DOM Map

The safest first extraction is a DOM selector module because the current `app.js` has a large block of selectors around lines 922-987.

Status: connected in v91. `app.js` now imports `modules/dom.js` and keeps the same local constant names to avoid behavior changes.

The module should export a single object:

```js
export const els = {
  activationScreen: document.querySelector("#activation-screen"),
  activationButton: document.querySelector("#activation-button"),
  loginScreen: document.querySelector("#login-screen"),
  archiveScreen: document.querySelector("#archive-screen"),
  // ...
};
```

`app.js` imports `els` and aliases existing constants from it:

```js
import { els } from "./modules/dom.js";
const activationScreen = els.activationScreen;
```

This keeps the rest of the file unchanged and makes rollback easy.

## Second Safe Cut: Pure Helpers

Move pure helpers only after DOM map is stable:

- `randomHex`
- local storage helpers

Status: connected in v92 through `modules/helpers.js` and `modules/state.js`.

Do not move audio/cursor/video first.

## Third Safe Cut: Lore

Status: connected in v92 through `modules/lore.js`.

The module owns lore text fetching, document-title cleanup, tab/segment rendering, and image slot insertion. `app.js` keeps a wrapper named `renderArchiveLoreSegments()` so archive scroll flow does not change.

## High-Risk Cuts To Delay

- Cursor hover detection and PAMP overlay/native cursor state.
- Archive video audio Web Audio pipeline.
- Archive fold progress and scroll timing.
- Sword render/pivot logic in `archive-3d.js`.
- Activation audio arming and wheel cue behavior.

## Visual QA Required After Each Cut

- Initial activation screen loads without white jump.
- ACTIVATE -> INITIALIZE HACK still arms audio.
- Hack simulation still starts.
- Access terminal still appears.
- Authentication still opens archive.
- Cursor remains PAMP over right-side Media Archive.
- Archive wheel still folds panels and shows sword/video/lore.
