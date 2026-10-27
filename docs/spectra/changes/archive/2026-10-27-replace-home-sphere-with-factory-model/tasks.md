## 1. FactoryScene component

- [x] 1.1 Factory model loads with visible status: add `FactoryScene` (src/FactoryScene.js) that will load the model with GLTFLoader from the public folder (`${process.env.PUBLIC_URL}/models/factory.glb`), following "Status is React state; the 3D scene is imperative": show `role="status"` "Loading factory…" while loading, remove it on success, and show `role="alert"` "Could not load the 3D model." on failure with no canvas created. Set up src/FactoryScene.test.js to test FactoryScene with mocked three modules (fake `GLTFLoader`, stub `OrbitControls`, fake `WebGLRenderer` over real `three` exports). Verify: tests "shows loading text until the model loads" and "shows error text when loading fails" pass with `CI=true npm test`.
- [x] 1.2 [after: 1.1] Embedded animations play on loop: play every clip with one AnimationMixer (`clipAction(clip).play()` for each clip, `mixer.update(delta)` each frame). Per "3D scene ignores reduced motion", playback is not gated by `matchMedia`. Verify: test "plays every clip on loop" (a fake model with 3 clips yields 3 playing actions with `repetitions === Infinity`) passes.
- [x] 1.3 [after: 1.2] Camera frames the model and auto-orbits with user control: frame with the bounding sphere and OrbitControls. The camera looks at the bounding-box centre from `radius / sin(fov / 2)`, and the controls use `autoRotate = true`, `autoRotateSpeed = 0.5`, `enableDamping = true`, `enablePan = false`, `minDistance = radius` and `maxDistance = 3 × distance`. Verify: test "frames the model and configures orbit controls" checks the stubbed controls' target and settings for a fake model with a known bounding box.
- [x] 1.4 [after: 1.3] Factory scene releases resources on unmount: the cleanup stops the render loop and mixer, disposes controls, every model geometry/material and the renderer, and removes the canvas. An `isDisposed` flag discards a model that loads after unmount. Verify: tests "disposes renderer, controls and canvas on unmount" and "ignores a model that loads after unmount" pass.

## 2. Switch Home to the factory scene

- [x] 2.1 [after: 1.4] Home page shows the factory scene: `HomePage` renders `<FactoryScene />` so the factory scene fills its container below the nav bar. Add CSS for `.FactoryScene` (fills parent, positioned for the overlay) and the centred status/alert overlay text. In src/App.test.js, replace the `RotatingSphere` stub with a `FactoryScene` stub (`data-testid="factory-scene"`). Rename "sphere present on Home and absent on Profile" to "factory scene present on Home and absent on Profile" and "signed-out visitor sees Home with sphere" to "signed-out visitor sees Home with factory scene", and update every `sphere` test id in that file. Verify: `CI=true npm test` passes.
- [x] 2.2 [after: 2.1] Remove the replaced sphere, retiring the requirement "Home page shows the rotating sphere": delete src/RotatingSphere.js. Verify: `grep -rn RotatingSphere src` prints nothing, and `CI=true npm test` and `npm run build` both succeed.

## 3. Final check

- [x] 3.1 [after: 2.2] Run the acceptance pass from design.md's Implementation Contract in a real browser (`npm start`):
  - at 1280×800 the whole model is visible below the nav bar and animated (two screenshots 1 s apart differ), and "Loading factory…" appears before it;
  - a horizontal drag rotates the view, and auto-orbit resumes after release;
  - a 404 for `models/factory.glb` (request intercepted) shows "Could not load the 3D model." and no canvas;
  - on `/profile` no canvas exists;
  - with `prefers-reduced-motion: reduce` the scene still animates.

  Record the results in the apply report.
