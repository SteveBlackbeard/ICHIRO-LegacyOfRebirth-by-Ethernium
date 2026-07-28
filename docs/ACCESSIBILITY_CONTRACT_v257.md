# Accessibility Contract v257

## Objective

Make the approved ICHIRO interaction path operable by keyboard and assistive
technology without changing its visual composition, timing, assets, audio,
cursor, sword, portal, or archive choreography.

## Runtime contract

- `modules/focus-manager.js` is the sole owner of modal focus containment.
- Opening the case viewer or dossier-details dialog moves focus inside it.
- `Tab` and `Shift+Tab` remain inside the active dialog.
- `Escape` requests closure through the dialog owner.
- Closing restores focus to the connected trigger when it still exists.
- Lore tabs expose `tablist`, `tab`, and `tabpanel` relationships.
- Arrow keys, `Home`, and `End` move between lore tabs.
- The archive screen exposes a screen-reader-only navigation instruction.

## Static gate

`npm run test:a11y` verifies:

- document language and dialog semantics;
- focus-manager wiring in both overlay systems;
- visible keyboard focus styling;
- lore tab ownership and keyboard navigation;
- accessible names for all buttons;
- alternatives for all images;
- absence of positive `tabindex`.

The machine-readable report is written to:

`.artifacts/accessibility/accessibility-contract-v257.json`

## Browser proof

The v257 golden path additionally proves that:

- the case viewer initially focuses its close control;
- reverse tabbing remains inside the dialog;
- the authored dossier typewriter may complete before protocol controls appear;
- `Escape` closes the viewer and returns focus to its dossier card;
- lore tabs respond to arrow-key navigation and expose the correct panel label.

## Frozen systems

This wave does not alter approved CSS composition, WebGL scenes, GLB hierarchy,
video/audio strategy, PAMP cursor behavior, particles, dossier content, or
transition timing.

## Rollback

Remove the v257 focus-manager wiring and restore the v256 cache identifiers.
No asset rollback is required.
