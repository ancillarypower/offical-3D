## 1. Shared helpers and model file

- [x] 1.1 Separate ArchimedesScene component with shared helpers, part 1: move `fitDistance`, `pixelRatio` and `disposeModel` from src/FactoryScene.js into a new src/threeHelpers.js. `FactoryScene` imports them and re-exports `fitDistance`, and its behaviour is unchanged. Verify: `CI=true npx react-scripts test --watchAll=false src/FactoryScene.test.js` passes with no test edits (58 tests).
- [x] 1.2 Model file location and URL: copy `/home/ej/Documents/Archimedes_opt_anim.glb` to `public/models/Archimedes_opt_anim.glb` byte for byte. Verify: `cmp` of the two files exits 0, and the copy is 13,719,364 bytes.

## 2. Archimedes scene

- [x] 2.1 Archimedes model loads with visible status, and Archimedes scene renders at a capped resolution over the sky gradient (JS side) [after: 1.1]: create src/ArchimedesScene.js and src/ArchimedesScene.test.js. The tests reuse the fakes of src/FactoryScene.test.js (GLTFLoader, OrbitControls, WebGLRenderer, ResizeObserver).
  - The scene loads `${PUBLIC_URL}/models/Archimedes_opt_anim.glb` and shows the status texts from the design's "Status texts" decision: "Loading Archimedes screw…" with `role="status"` until loaded, and "Could not load the 3D model." with `role="alert"` on a load error or when the WebGL renderer throws (no canvas added).
  - The renderer clears with alpha 0 at pixel ratio `min(devicePixelRatio, 2)`.
  - Verify with tests: the URL loaded, loading text then ready, load failure, WebGL failure, clear colour `[0x000000, 0]`, and pixel ratio 1→1, 2→2, 3→2 at creation and after a resize. Each fails before the code exists.
- [x] 2.2 Archimedes animation plays on loop and Archimedes camera frames the model and auto-orbits with user control [after: 2.1]:
  - Every clip gets a playing action with infinite repetition, with no reduced-motion check.
  - The camera starts at `fitDistance(radius, 45, aspect)` from the box centre along `(1, 0.6, 1)` normalised. Controls have damping, no pan, auto-rotate at speed 0.5, `minDistance` = radius and `maxDistance` = 3 × fit.
  - The `ResizeObserver` re-fit keeps direction and zoom ratio and resets `maxDistance`.
  - Verify with tests:
    - a model with one clip has one playing action with `repetitions` Infinity;
    - framing distance and target at 1280×744 and 375×611, matching the spec example (radius-1 values 2.613 and 4.059);
    - resize from 1280×744 to 375×611 keeps the direction and zoom ratio, and `maxDistance` is 3 × the new fit;
    - `autoRotate` is true and `enablePan` false after load.
- [x] 2.3 Archimedes scene releases resources on unmount [after: 2.2]. On unmount the scene:
  - cancels the frame loop;
  - stops and uncaches the mixer;
  - disconnects the observer;
  - disposes the controls, the geometries and materials, and the renderer;
  - removes the canvas.

  If it unmounts before load, it disposes the model on arrival and creates no canvas. Verify with tests: "unmount disposes renderer, controls, geometry and canvas" and "unmount before load creates no canvas and raises nothing".

## 3. Page, navigation and styles

- [x] 3.1 Archimedes page and route, Archimedes page shows the Archimedes scene, and Top navigation bar reflects sign-in state [after: 2.1]:
  - Add src/pages/ArchimedesPage.js rendering `<div className="ArchimedesPage"><ArchimedesScene /></div>`.
  - Add the public route `/archimedes` in src/App.js, before the `*` catch-all.
  - Add `{ to: '/archimedes', label: 'Archimedes' }` to `NAV_ITEMS` between Home and Profile.
  - In src/App.test.js, mock `./ArchimedesScene` as `<div data-testid="archimedes-scene" />` and update the two order tests to Home, Archimedes, Profile, Logout|Log in.
  - Add tests: a signed-out visitor on `/archimedes` sees one archimedes-scene inside `.ArchimedesPage`, no factory-scene, and "Archimedes" with `aria-current="page"` while "Home" has none. Navigating Home → Archimedes → Home swaps the scenes.
  - Verify: `CI=true npx react-scripts test --watchAll=false src/App.test.js` passes; the order tests and the new tests fail before the change.
- [x] 3.2 Scene styles reuse the factory look, the CSS side of Archimedes scene renders at a capped resolution over the sky gradient [after: 3.1]. In src/App.css:
  - `.ArchimedesPage` gets the `.HomePage` height pair (`100vh`, then `100dvh`, minus `--nav-height`) and `overflow: hidden`;
  - `.ArchimedesScene`, `.ArchimedesScene-message` and `.ArchimedesScene-message[role='alert']` join the `.FactoryScene` selector lists.

  Verify by content review of src/App.css, and in the browser check of task 4.2 (gradient, dark label, no page scroll).

## 4. Final checks

- [x] 4.1 Full test suite and build [after: 2.3, 3.2]: `CI=true npm test` passes, with every existing FactoryScene test unchanged, and `npm run build` prints "Compiled successfully". Record suite and test counts and the main JS gzip size in verification.md.
- [x] 4.2 Browser check [after: 4.1]:
  - Run `npm start` and open `/archimedes` in headless Chromium at 1280×800. Confirm that the loading text appears and then disappears, the model is whole and centred over the gradient, the screw and water move between two screenshots taken 1 s apart, the "Archimedes" link is current, the page does not scroll, and there are no page errors.
  - Navigate to `/` and back. Confirm only one canvas is on the page each time.
  - Record the results and screenshots in verification.md.
