## Context

`FactoryScene` (src/FactoryScene.js) renders public/models/factory.glb on Home. After load it:

- computes the model's bounding sphere and places a 45° vertical-FOV `PerspectiveCamera` at `radius / sin(22.5°)` from the centre, which fits the sphere vertically only;
- configures `OrbitControls` with `minDistance = radius` and `maxDistance = 3 × distance`;
- calls `renderer.setPixelRatio(window.devicePixelRatio)`;
- listens to `window` `resize` and only updates `camera.aspect` and the renderer size.

`src/App.css` sizes `.HomePage` as `calc(100vh - var(--nav-height))`, and `.AppLayout-main` has `min-height: calc(100vh - var(--nav-height))`.

In Jest, the mount's `clientWidth/clientHeight` are 0, so the camera aspect falls back to 1. The existing test "frames the model and configures orbit controls" asserts the vertical-only distance at that aspect.

Computed, not yet measured: at 375×611 the horizontal half-FOV is about 14.3° against 22.5° vertical. Fitting the sphere would need a distance about 1.55× the current one, so the model is expected to be clipped left and right on portrait phones. Task 1.1 confirms this in a browser before the fix.

## Goals / Non-Goals

**Goals:**

- The whole model is in view at any canvas aspect ratio, on load and after resize.
- Resizing keeps the user's viewing direction and relative zoom.
- Pixel ratio capped at 2.
- Home fills the visible viewport on mobile browsers without page scroll.

**Non-Goals:**

- A mobile-specific visual design: a different camera angle, layout or UI on phones. That waits for the mobile design.
- Lowering geometry or animation work on small screens, and model compression.
- Changing `.LoginPage` and other non-Home pages' `vh` usage.
- Changing auto-orbit speed, damping, pan or the camera's initial direction `(1, 0.6, 1)`.

## Decisions

### Fit the bounding sphere to the narrower field of view

**Supersedes**: replace-home-sphere-with-factory-model / Frame with the bounding sphere and OrbitControls

That decision fitted the sphere into the vertical FOV only, which clips the model whenever the canvas is narrower than it is tall. It made sense for the 1280×744 landscape case it was checked against.

A pure exported helper `fitDistance(radius, verticalFovDeg, aspect)` in src/FactoryScene.js handles every aspect ratio:

- it returns `radius / sin(min(v, h))`, where `v = verticalFov / 2` and `h = atan(tan(v) × aspect)`;
- the camera starts at `centre + normalize(1, 0.6, 1) × fitDistance(...)`;
- `near = fit / 100` and `far = fit × 10`.

All other `OrbitControls` settings are unchanged. Alternative: fixed per-breakpoint distances — rejected because they would break between breakpoints and would duplicate the CSS breakpoint logic.

### Re-fit on container resize, keeping direction and relative zoom

The `window` `resize` listener is replaced by a `ResizeObserver` on the mount element. The canvas size follows the container, which can change without a window resize event, for example when `dvh` tracks a mobile toolbar.

On each observed size change:

1. Update the renderer size and pixel ratio, and `camera.aspect`.
2. Compute the new fit distance.
3. Scale the camera's offset from `controls.target` by `newFit / oldFit`, so the viewing direction and the zoom relative to "fit" are preserved.
4. Set `minDistance = radius` and `maxDistance = 3 × newFit`, then clamp.
5. Update `near/far` and call `controls.update()`.

Alternative: reset to the default fit distance on resize — rejected because it throws away the user's zoom on every phone rotation.

The observer is disconnected in teardown. jsdom has no `ResizeObserver`, so `src/FactoryScene.test.js` provides a fake class whose callback the test triggers.

### Cap the pixel ratio at 2

`renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` runs on creation and on every resize, because the ratio changes when a window moves between monitors. On a ratio-3 phone this draws 4× instead of 9× the ratio-1 pixel count (computed from ratio²). Ratio 2 is the usual three.js cap; the difference from 3 is hard to see at phone viewing distance. Alternative: cap at 1.5 — rejected because the softening shows on desktop retina screens.

### Size Home with dvh and a vh fallback

`.HomePage { height: calc(100vh - var(--nav-height)); height: calc(100dvh - var(--nav-height)); }`. The same two-declaration pattern applies to `.AppLayout-main` `min-height`. Browsers without `dvh` ignore the second declaration and keep `vh`. `.AppLayout-main` must change too: if it kept `100vh` while Home used `100dvh`, the wrapper would stay taller than the visible area and the page would scroll. Alternative: a JS `visualViewport` listener writing a CSS variable — rejected because `dvh` does this natively.

## Implementation Contract

**Behavior:**

- After load and after any container resize, the whole model is inside the canvas at any aspect ratio, from portrait phone to wide desktop.
- Resizing keeps the viewing direction and relative zoom.
- The renderer pixel ratio is `min(devicePixelRatio, 2)`.
- On mobile browsers Home fills the visible area below the nav bar with no page scroll.

**Interface / data shape:**

- `export function fitDistance(radius, verticalFovDeg, aspect)` in src/FactoryScene.js returns a number, the camera distance from the model centre.
- `FactoryScene`'s default export and its props (none) are unchanged.
- CSS: `.HomePage` `height` and `.AppLayout-main` `min-height` each declare `100vh` first, then `100dvh`.

**Failure modes:**

- An aspect of `0` or `NaN` (a 0×0 container, as in jsdom before layout) falls back to aspect 1, as today.
- A resize while the container is 0×0 (for example a hidden tab) is skipped.

**Acceptance criteria:**

- `CI=true npm test` passes, including:
  - "fitDistance fits the narrower field of view": rows of the spec example table — 600×600 → 2.613, 1200×600 → 2.613, 300×600 → 4.931, to 3 decimals;
  - "frames a portrait canvas so the whole model fits": the mount is sized 375×611 before load, and the camera distance equals `fitDistance(radius, 45, 375/611)`;
  - "re-fits after resize keeping direction and zoom ratio": 1280×744 to 375×611 via the fake `ResizeObserver`. The direction is unchanged, the distance scales by the fit ratio, and `maxDistance = 3 × new fit`;
  - "caps pixel ratio at 2": `devicePixelRatio` 3 → `setPixelRatio(2)`, and 1 → `setPixelRatio(1)`;
  - "disposes renderer, controls and canvas on unmount" also asserts that the observer is disconnected;
  - the existing "frames the model and configures orbit controls" still passes unchanged at aspect 1.
- `npm run build` succeeds.
- Browser check (`npm start`, headless Chromium):
  - at 375×667 and 1280×800, the leftmost and rightmost pixel columns of the canvas are background colour only;
  - the same holds after resizing 1280×800 → 375×667;
  - before the fix (task 1.1) the 375×667 check fails, which confirms the bug.
- Manual check on a real phone (headless Chromium cannot show a collapsing toolbar):
  - with the address bar expanded, the canvas bottom is at the bottom of the screen and the page does not scroll;
  - note the observed frame rate.

**Scope boundaries:**

- In scope: camera fit math, the resize handling switch to `ResizeObserver`, the pixel-ratio cap, `.HomePage`/`.AppLayout-main` heights, and tests.
- Out of scope: mobile visual design, model optimisation, other pages' heights, camera presets.

## Risks / Trade-offs

- [Fitting the bounding sphere is conservative: on wide screens the model can look small, as observed in the previous change's screenshots] → unchanged by this change. A tighter fit would use the model's projected box instead; leave it for the mobile/visual design change.
- [Phone frame rate is still unmeasured] → the real-phone check records it. If it is poor, a follow-up change can lower the cap or simplify the scene.
- [`ResizeObserver` callbacks can fire often during a drag-resize] → each callback only sets sizes and does a few vector operations; the next animation frame renders, so no extra render runs per callback.
