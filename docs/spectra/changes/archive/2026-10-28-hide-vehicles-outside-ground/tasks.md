## 1. Model swap and vehicle hiding

- [x] 1.1 Factory model loads with visible status from factory0.glb: load factory0.glb in place of factory.glb.
  - Precondition: `spxa list` no longer shows `add-factory-scene-gradient-background`, because it was archived first (design.md Risks). If it is still active, stop and report.
  - Change `MODEL_URL` in src/FactoryScene.js to `${process.env.PUBLIC_URL}/models/factory0.glb`, and delete public/models/factory.glb.

  Verify: the URL assertion in "shows loading text until the model loads" changes to `/\/models\/factory0\.glb$/`, fails before the code change and passes after. `CI=true npm test` passes, and `grep -rn "factory\.glb" src public` prints nothing.
- [x] 1.2 [after: 1.1] Vehicles are hidden outside the ground: hide vehicles by origin against the Ground box each frame.
  - Export `updateVehicleVisibility(vehicles, groundBox)` from src/FactoryScene.js.
  - After load, compute `groundBox` from the `Ground` node, and collect direct children of the scene matching `/^(Car[A-Z]+\d+|Truck\d+)$/`.
  - Call the helper right after `mixer.update` in the frame loop.
  - When `Ground` is missing, hide nothing and `console.warn` once with a message containing `Ground`.

  Verify: these tests fail before the code change and pass after:
  - "updateVehicleVisibility follows the ground extent" (every row of the spec example table);
  - "hides vehicles whose origin is off the ground after load" (`CarE0` at (0, 0, 52.5) visible, `CarW0` at (88, 0, 47.5) hidden, `Smoke0_0` at (200, 0, 0) untouched);
  - "re-evaluates visibility every frame" (captured `requestAnimationFrame` callback; `CarE0` moved to x 81 is hidden after one frame);
  - "warns once and hides nothing without a Ground node".
- [x] 1.3 [after: 1.2] Development-only debug handle for browser checks: when `process.env.NODE_ENV !== 'production'`, set `window.__FACTORY_SCENE__ = { vehicles, groundBox }` after load and delete it in teardown. Verify: test "exposes the dev debug handle and removes it on unmount" passes. After `npm run build`, `grep -c __FACTORY_SCENE__ build/static/js/*.js` reports 0 for every file.

## 2. Final check

- [x] 2.1 [after: 1.3] Run the acceptance pass from design.md's Implementation Contract:
  - `CI=true npm test` and `npm run build` succeed;
  - in headless Chromium at 1280×800, sample `window.__FACTORY_SCENE__` every 100 ms for 10.5 s;
  - 11 vehicles are found;
  - no sample shows a vehicle visible with its origin outside the ground box, and none shows one hidden by the check while inside;
  - report the count of samples where an on-ground vehicle has world scale below 0.01 (the model's own keys);
  - take a screenshot for visual review.

  Record every result in `docs/spectra/changes/hide-vehicles-outside-ground/verification.md`.
