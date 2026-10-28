## 1. Picking and focus

- [x] 1.1 Implement "Buildings are defined by a name table over top-level nodes" and "Pick buildings with a Raycaster on click, not on drag" as pure, exported pieces in src/FactoryScene.js.
  - Export `BUILDINGS` with ids `Office` and `GuardHouse`, labels `Office` and `Guard House`, and the `parts` patterns from design.md.
  - Export `pickBuilding(intersections, modelRoot, buildings)`. It returns the building of the first intersection whose object and ancestors are all visible, and `null` otherwise.

  Verify: a table-driven test "pickBuilding resolves the first visible hit" covers every row of the spec example "which click counts and what it picks" that does not depend on pointer movement:
  - `OffWinF1_2` → Office;
  - `GuardHouse` → Guard House;
  - a trunk in front → null;
  - a hidden vehicle in front of `GuardHouse` → Guard House;
  - no hits → null.

  A second test, "BUILDINGS parts match the factory0.glb node names", checks the names: every Office and Guard House node listed in design.md's Context table matches, and `MainHall`, `Corridor` and `GuardHouseX` do not. Both tests fail before the code exists and pass after.
- [x] 1.2 [after: 1.1] Deliver "Clicking a building focuses the camera on it and shows its name" (camera part) via "Fly the camera with a GSAP tween between saved poses".
  - After load, compute each present building's box.
  - Add `pointerdown`/`pointerup` listeners on the canvas with the 5 CSS px click threshold, raycasting `gltf.scene` with NDC from `getBoundingClientRect()`.
  - On a building click from the overview: save `overviewPose`, turn auto-rotate off, disable the controls, and start the arc flight to the focus pose (1 s, `power2.inOut`; design.md "Flight path" and "OrbitControls during a flight").
  - On complete: set `minDistance` to the building radius and re-enable the controls.
  - A click on the other building while focused flies there and keeps `overviewPose`. A click on the focused building, or any click during a flight, does nothing.

  Tests extend `fakeFactory` with an `Office` box mesh and a `GuardHouse` box mesh and stub the canvas `getBoundingClientRect`. jsdom 16.7.0 has no `PointerEvent`, so the tests dispatch `MouseEvent`s typed `pointerdown`/`pointerup`. They finish flights with `gsap.globalTimeline.getChildren()` → `progress(1)`.

  Verify: these tests fail before the code change and pass after:
  - "clicking a building flies the camera to it" (target equals the box centre within 0.01, distance equals `fitDistance(r) × 1.2` along `FOCUS_DIRECTION`, `autoRotate` false, `minDistance` equals r);
  - "a 6 px drag is not a click" and "a 5 px move still counts as a click";
  - "clicking the other building switches focus and keeps the overview pose";
  - "clicks during a flight are ignored";
  - "a model without building nodes has nothing clickable";
  - "the flight swings around instead of passing through the target" (camera at the opposite side of the building from `FOCUS_DIRECTION`; at mid-flight the camera-to-target distance stays above the smaller of the start and end distances × 0.9; a straight-line path would drop well below that).
- [x] 1.3 [after: 1.2] Deliver "Leaving the building focus returns to the overview".
  - While focused, a click whose pick is `null`, or an Esc `keydown` on `window`, hides the label and flies back to `overviewPose` for 1 s.
  - On complete: restore `minDistance` to the model radius and turn auto-rotate and the controls back on.
  - In the overview, and during a flight, Esc and non-building clicks do nothing.

  Verify: these tests fail before the code change and pass after:
  - "Esc returns to the saved overview" (position and target within 0.01 of the pose saved before the first focus, `autoRotate` true, `minDistance` equals the model radius);
  - "clicking empty space returns to the overview";
  - "Esc during the fly-in is ignored";
  - "Esc in the overview does nothing".

## 2. Labels, cursor and resize

- [x] 2.1 [after: 1.3] Implement "Show names with CSS2DRenderer labels anchored above each building".
  - Create a `CSS2DRenderer` whose element sits over the canvas with `pointer-events: none`, sized with the renderer and rendered each frame after `renderer.render()`.
  - Create one `CSS2DObject` per present building: a `.FactoryScene-label` div with the building's label text, placed at the box top centre plus 1 on y, and hidden.
  - Show only the focused building's label when the fly-in completes. Hide it when a return or a switch starts.
  - Add the `.FactoryScene-label` rule to src/App.css with the values in design.md.

  Verify: these tests fail before the code change and pass after:
  - "shows the focused building's name after the flight" (one visible `.FactoryScene-label` with text "Office", none during the flight);
  - "switching buildings switches the label";
  - "returning hides the label";
  - "the label layer does not block pointer events" (`pointer-events: none` on the label renderer element).
- [x] 2.2 [after: 2.1] Implement "Hand cursor over a building": a `pointermove` with `buttons === 0` sets the canvas cursor to `pointer` over a building and to `''` elsewhere. Moves with a button held skip the raycast. Verify: test "the cursor is a hand over a building only" fails before and passes after.
- [x] 2.3 [after: 2.1] Deliver the updated requirement "Camera frames the model and auto-orbits with user control" via "Resize while focused keeps the focus framing".
  - While focused or flying, the `ResizeObserver` callback still updates sizes (including the label renderer), aspect, `fit`, near/far and `maxDistance`.
  - It leaves the camera in place, and rescales `overviewPose.position` around `overviewPose.target` by `nextFit / fit`.
  - In the overview, behaviour is unchanged.

  Verify: test "resize while focused keeps the camera and rescales the return pose" fails before and passes after. It asserts that the camera position is unchanged by the resize, and that after Esc the camera direction from the target matches the original overview direction within 1e-6 at the new fit distance. The existing "re-fits after resize keeping direction and zoom ratio" still passes.

## 3. Cleanup, debug handle and acceptance

- [x] 3.1 [after: 2.3] Deliver the updated requirement "Factory scene releases resources on unmount".
  - Teardown kills the running flight tween.
  - It removes the canvas `pointerdown`/`pointerup`/`pointermove` listeners and the `window` `keydown` listener.
  - It removes each `CSS2DObject` from the scene and removes the label renderer element.

  Verify: test "unmounting mid-flight leaves no label, tween or key listener" fails before and passes after. It focuses the Guard House, unmounts before `progress(1)`, and then expects:
  - no `.FactoryScene-label` in the document;
  - `gsap.globalTimeline.getChildren()` empty;
  - dispatching Esc on `window` throws nothing.

  The existing "disposes renderer, controls and canvas on unmount" still passes.
- [x] 3.2 [after: 3.1] Implement "Extend the development debug handle": add `camera`, `controls`, `buildings` (`{ id, label, box }[]`) and `getFocus()` (returning `{ focusedId, flying }`) to `window.__FACTORY_SCENE__`, keeping `vehicles` and `groundBox`. Verify: the existing test "exposes the dev debug handle and removes it on unmount" is extended to assert the new fields, and fails before and passes after. After `npm run build`, `grep -c __FACTORY_SCENE__ build/static/js/*.js` reports 0 for every file.
- [x] 3.3 [after: 3.2] Run the acceptance pass from design.md's Implementation Contract.
  - `CI=true npm test` and `npm run build` succeed.
  - In headless Chromium at 1280×800 on `npm start`, using `window.__FACTORY_SCENE__`, for each building:
    - project its box centre to the screen and click there;
    - after 1.2 s, record `getFocus()`, the target-to-box-centre error, the camera distance, `controls.autoRotate`, and the visible `.FactoryScene-label` text;
    - take a screenshot;
    - press Esc, and after 1.2 s record the camera position and target error against the pose sampled just before the click.
  - Also record whether either building is visibly blocked in its screenshot.

  Record every result in `docs/spectra/changes/focus-building-on-click/verification.md`.
