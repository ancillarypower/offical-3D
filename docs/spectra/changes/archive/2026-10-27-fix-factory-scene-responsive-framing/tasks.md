## 1. Confirm the bug

- [x] 1.1 Confirm portrait clipping before any code change. With `npm start` and headless Chromium at 375×667, load `/` and wait for the factory canvas. Then sample the leftmost and rightmost pixel columns of the canvas; model pixels are expected to touch at least one side edge. Repeat at 1280×800, where both edges are expected to be background only. Verify: record both results (pass/fail per edge and viewport) in the apply report. If 375×667 does not clip, stop and report, because the premise of tasks 2.1–2.2 would be refuted.

## 2. Responsive camera and resolution

- [x] 2.1 [after: 1.1] Camera frames the model and auto-orbits with user control at any aspect ratio: fit the bounding sphere to the narrower field of view. Add the exported pure helper `fitDistance(radius, verticalFovDeg, aspect)` in src/FactoryScene.js (`radius / sin(min(v, atan(tan(v) × aspect)))`, falling back to aspect 1 for 0/NaN) and use it for the initial camera distance, `near/far` and `maxDistance`. Verify: tests "fitDistance fits the narrower field of view" (600×600 → 2.613, 1200×600 → 2.613, 300×600 → 4.931) and "frames a portrait canvas so the whole model fits" (mount sized 375×611 before load) pass, and the existing "frames the model and configures orbit controls" passes unchanged.
- [x] 2.2 [after: 2.1] Re-fit on container resize, keeping direction and relative zoom: replace the `window` `resize` listener with a `ResizeObserver` on the mount element. It updates the renderer size and `camera.aspect`, scales the camera offset from `controls.target` by `newFit / oldFit`, sets `maxDistance = 3 × newFit`, updates `near/far`, skips 0×0 sizes, and is disconnected in teardown. Add a fake `ResizeObserver` class to src/FactoryScene.test.js. Verify: test "re-fits after resize keeping direction and zoom ratio" (1280×744 → 375×611) passes, and "disposes renderer, controls and canvas on unmount" additionally asserts that the observer was disconnected.
- [x] 2.3 [after: 2.2] Render resolution is capped: cap the pixel ratio at 2 with `Math.min(window.devicePixelRatio, 2)`, both on renderer creation and in the resize callback. Verify: test "caps pixel ratio at 2" (devicePixelRatio 3 → 2, 1 → 1, recorded by the fake renderer's `setPixelRatio`) passes.

## 3. Home height

- [x] 3.1 [after: 1.1] Home page shows the factory scene filling the visible viewport: size Home with dvh and a vh fallback. In src/App.css, `.HomePage` `height` and `.AppLayout-main` `min-height` each declare `calc(100vh - var(--nav-height))` followed by `calc(100dvh - var(--nav-height))`. Verify: a content review shows both pairs in that order, `CI=true npm test` passes, and in headless Chromium at 375×667 the page has no vertical scroll (`scrollHeight === innerHeight`).

## 4. Final check

- [x] 4.1 [after: 2.3, 3.1] Run the acceptance pass from design.md's Implementation Contract:
  - `CI=true npm test` and `npm run build` succeed;
  - in headless Chromium, the canvas edge columns are background only at 375×667 and at 1280×800, and again after resizing 1280×800 → 375×667;
  - on a real phone, with the address bar expanded, the canvas bottom sits at the screen bottom and the page does not scroll; note the observed frame rate.

  Record every result in a `verification.md` inside the change folder, so it is archived with the change. If no real phone is available, mark that item "not run" there.
