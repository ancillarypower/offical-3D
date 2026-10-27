## Problem

The Home page's factory scene is framed for landscape desktop screens only:

- **Clipped on portrait screens.** On a portrait phone the model is expected to be cut off at the left and right edges. This is computed, not yet observed: at 375×611 the horizontal half field of view is about 14° against the 22.5° vertical half used for framing, so the fit distance would need to be about 1.55× larger (computed). Task 1.1 confirms it in a browser before the fix.
- **No refit on resize.** Rotating a phone or resizing a window updates the aspect ratio but never re-fits the camera.
- **Uncapped pixel ratio.** The renderer uses the device's full pixel ratio, which is 3 on many phones. That draws 9× the pixels of ratio 1 for a scene of about 65,000 triangles with 102 animations.
- **Hidden canvas bottom on mobile browsers.** The Home height uses `100vh`, which mobile browsers measure as if their toolbars were collapsed. The canvas bottom can therefore sit behind the browser toolbar, or the page can scroll.

## Root Cause

- **Framing:** `FactoryScene` computes the camera distance as `radius / sin(verticalFov / 2)`. This fits the model's bounding sphere vertically only, as recorded in design decision "Frame with the bounding sphere and OrbitControls" of the archived `replace-home-sphere-with-factory-model` change. The window `resize` handler only updates `camera.aspect`.
- **Resolution:** `FactoryScene` calls `renderer.setPixelRatio(window.devicePixelRatio)` with no upper bound.
- **Height:** `src/App.css` sizes `.HomePage` as `calc(100vh - var(--nav-height))`, and `.AppLayout-main` has `min-height: calc(100vh - var(--nav-height))`.

## Proposed Solution

- **Framing:** fit the bounding sphere into whichever field of view is narrower, vertical or horizontal for the current aspect ratio. Re-fit on every resize, keeping the user's current viewing direction and relative zoom, and keep the zoom limits relative to the new fit distance.
- **Resolution:** render at `min(devicePixelRatio, 2)`.
- **Height:** size `.HomePage` and `.AppLayout-main` with `100dvh`, keeping a `100vh` declaration before it as a fallback for browsers without `dvh`.

## Non-Goals

Recorded in design.md (Goals / Non-Goals).

## Success Criteria

- At 375×667 and 1280×800, the whole model is inside the canvas after load: the leftmost and rightmost pixel columns of the canvas show only background, with no model pixels touching the side edges.
- After resizing from 1280×800 to 375×667 (and back), the whole model is still inside the canvas.
- The renderer pixel ratio is `min(devicePixelRatio, 2)`: 2 on a ratio-3 device and 1 on a ratio-1 device.
- The Home canvas fills the visible area below the nav bar on mobile browsers without page scroll; `100vh` remains as fallback.
- `CI=true npm test` and `npm run build` pass.

## Impact

- Affected specs: `factory-scene` (requirement "Camera frames the model and auto-orbits with user control" modified; requirement "Render resolution is capped" added), `home-navigation` (requirement "Home page shows the factory scene" modified to define the visible viewport height).
- Affected code:
  - Modified: src/FactoryScene.js, src/FactoryScene.test.js, src/App.css
  - New: none
  - Removed: none
