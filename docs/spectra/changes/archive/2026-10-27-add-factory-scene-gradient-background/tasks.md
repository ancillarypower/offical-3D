## 1. Gradient background

- [x] 1.1 Scene background is a sky gradient: draw the gradient with CSS behind a transparent canvas.
  - Precondition: `spxa list` no longer shows `fix-factory-scene-responsive-framing`, because it was archived first (design.md Risks). If it is still active, stop and report.
  - In src/FactoryScene.js, create the renderer with `{ antialias: true, alpha: true }`, call `renderer.setClearColor(0x000000, 0)`, and stop setting `scene.background`.
  - In src/App.css, give `.FactoryScene` `background: linear-gradient(to bottom, #4a90d9, #dfeaf5)`.
  - In src/FactoryScene.test.js, the fake `WebGLRenderer` stores its constructor options, records `setClearColor` calls and keeps the last scene passed to `render`.

  Verify: the new test "renders on a transparent canvas over the CSS gradient" fails before the code change and passes after (`alpha: true`, `setClearColor(0x000000, 0)`, `scene.background === null`). Every other test in `CI=true npm test` passes.
- [x] 1.2 [after: 1.1] Status messages on a dark label: make `.FactoryScene-message` a centred label (`position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 8px 16px; border-radius: 8px; background: var(--surface)`) with unchanged text colours, so "Loading factory…" and "Could not load the 3D model." stay legible over the gradient. Verify: `CI=true npm test` passes. In headless Chromium, while the `factory.glb` request is held and again after a 404 response, the message element's computed `background-color` is `rgb(21, 26, 46)` and the scene area's centre-top pixel is within ±8 of `#4a90d9`.

## 2. Final check

- [x] 2.1 [after: 1.2] Run the acceptance pass from design.md's Implementation Contract:
  - `CI=true npm test` and `npm run build` succeed;
  - the browser checks compare edges against the gradient row colour: at 1280×800 and 375×667 after load, the outermost 2 pixel columns match the expected row colour within ±8, with top ≈ `#4a90d9`, middle ≈ `#94bde7` and bottom ≈ `#dfeaf5`;
  - after a horizontal drag, the top and bottom rows still match;
  - the loading and 404 checks from task 1.2 still hold.

  Record every result in `docs/spectra/changes/add-factory-scene-gradient-background/verification.md`.
