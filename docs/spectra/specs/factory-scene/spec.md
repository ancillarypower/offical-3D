# factory-scene Specification

## Purpose

Render the animated factory 3D model (`public/models/factory.glb`) as the Home page's main visual, so visitors see the product's factory scene instead of a placeholder shape. It covers loading and error states, animation playback, camera behaviour, and resource cleanup.

## Requirements

### Requirement: Factory model loads with visible status

The system SHALL load `models/factory0.glb` from the app's public URL when the factory scene mounts. While the model is loading, the system SHALL show the text "Loading factory…" in an element with `role="status"`. When loading succeeds, the system SHALL remove that text and display the model. When loading fails, the system SHALL show the text "Could not load the 3D model." in an element with `role="alert"` and SHALL NOT show the loading text.

#### Scenario: Loading then ready

- **WHEN** a visitor opens `/` and the model download has not finished
- **THEN** "Loading factory…" is shown, and after the model finishes loading the text is gone and the model is displayed

#### Scenario: Load failure

- **WHEN** a visitor opens `/` and `models/factory0.glb` cannot be loaded (for example the server returns 404)
- **THEN** "Could not load the 3D model." is shown and "Loading factory…" is not shown


<!-- @trace
source: hide-vehicles-outside-ground
updated: 2026-10-28
code:
  - public/models/factory.glb
  - src/FactoryScene.js
  - public/models/factory0.glb
tests:
  - src/FactoryScene.test.js
-->

---
### Requirement: Embedded animations play on loop

The system SHALL play every animation clip embedded in the factory model simultaneously and repeat each clip indefinitely while the scene is mounted. The scene SHALL play regardless of the operating system's reduced-motion setting.

#### Scenario: All clips playing

- **WHEN** the factory model containing 102 clips finishes loading
- **THEN** 102 animation actions are playing with infinite repetition

#### Scenario: Reduced motion does not stop the scene

- **WHEN** a user with `prefers-reduced-motion: reduce` opens `/` and the model finishes loading
- **THEN** the embedded animations and the camera auto-orbit run the same as for other users


<!-- @trace
source: replace-home-sphere-with-factory-model
updated: 2026-10-27
code:
  - src/layout/AppLayout.js
  - jest/babelTransform.js
  - public/models/factory.glb
  - src/App.css
  - src/setupTests.js
  - src/App.js
  - src/auth/guards.js
  - src/auth/AuthContext.js
  - src/pages/LoginPage.js
  - src/pages/ProfilePage.js
  - src/RotatingSphere.js
  - package.json
  - src/index.js
  - src/FactoryScene.js
  - src/pages/HomePage.js
tests:
  - src/App.test.js
  - src/auth/AuthContext.test.js
  - src/FactoryScene.test.js
-->

---
### Requirement: Camera frames the model and auto-orbits with user control

The system SHALL point the camera at the centre of the loaded model's bounding box from a distance at which the whole model is in view at the canvas's current aspect ratio, fitting the model's bounding sphere into whichever of the vertical and horizontal fields of view is narrower. When the canvas is resized, the system SHALL re-fit: it SHALL keep the camera's current viewing direction and its distance relative to the fit distance, and SHALL recompute the zoom limits. The system SHALL slowly rotate the camera around the model centre automatically, and SHALL let the user rotate the view by dragging and zoom by scroll wheel or pinch. Zoom SHALL be limited so the camera neither enters the model's bounding box nor moves out beyond three times the current fit distance. After the user releases the pointer, the automatic rotation SHALL continue.

#### Scenario: Initial framing

- **WHEN** the factory model finishes loading in a 1280×744 viewport
- **THEN** the whole model is visible and the camera looks at the centre of its bounding box

#### Scenario: Initial framing on a portrait screen

- **WHEN** the factory model finishes loading in a 375×611 canvas
- **THEN** the whole model is visible, with no part cut off at the left or right edge

##### Example: fit distance by aspect ratio

| Canvas (w×h) | Vertical FOV | Bounding radius | Expected camera distance |
| ------------ | ------------ | --------------- | ------------------------ |
| 600×600 | 45° | 1 | 1 / sin(22.5°) ≈ 2.613 |
| 1200×600 | 45° | 1 | 1 / sin(22.5°) ≈ 2.613 (vertical is narrower) |
| 300×600 | 45° | 1 | 1 / sin(atan(0.5 × tan 22.5°)) ≈ 4.931 (horizontal is narrower) |

#### Scenario: Re-fit after resize

- **WHEN** the model is shown at 1280×744 and the canvas is resized to 375×611
- **THEN** the whole model is still visible, the camera looks from the same direction as before the resize, and the maximum zoom-out distance is three times the new fit distance

#### Scenario: Drag to rotate

- **WHEN** the user drags horizontally across the scene and releases
- **THEN** the view rotates with the drag, and afterwards the automatic rotation continues


<!-- @trace
source: fix-factory-scene-responsive-framing
updated: 2026-10-27
code:
  - src/FactoryScene.js
  - src/App.css
tests:
  - src/FactoryScene.test.js
-->

---
### Requirement: Factory scene releases resources on unmount

The system SHALL, when the factory scene unmounts, stop the render loop and animations, dispose of the orbit controls, every geometry and material in the model, and the WebGL renderer, and remove its canvas. If the scene unmounts before loading finishes, the system SHALL discard the loaded model instead of adding it to a disposed scene.

#### Scenario: Leave Home

- **WHEN** a visitor on `/` with the model loaded navigates to `/profile`
- **THEN** no canvas remains in the page and the renderer has been disposed

#### Scenario: Leave before load completes

- **WHEN** a visitor leaves `/` while "Loading factory…" is still shown, and the download completes afterwards
- **THEN** no canvas is created and no error is raised

<!-- @trace
source: replace-home-sphere-with-factory-model
updated: 2026-10-27
code:
  - src/layout/AppLayout.js
  - jest/babelTransform.js
  - public/models/factory.glb
  - src/App.css
  - src/setupTests.js
  - src/App.js
  - src/auth/guards.js
  - src/auth/AuthContext.js
  - src/pages/LoginPage.js
  - src/pages/ProfilePage.js
  - src/RotatingSphere.js
  - package.json
  - src/index.js
  - src/FactoryScene.js
  - src/pages/HomePage.js
tests:
  - src/App.test.js
  - src/auth/AuthContext.test.js
  - src/FactoryScene.test.js
-->

---
### Requirement: Render resolution is capped

The system SHALL render the factory scene at a pixel ratio of the device pixel ratio capped at 2, both when the scene is created and after every resize.

#### Scenario: High-density phone

- **WHEN** the factory scene loads on a device whose `devicePixelRatio` is 3
- **THEN** the renderer's pixel ratio is 2

##### Example: pixel ratio cap

| devicePixelRatio | Renderer pixel ratio |
| ---------------- | -------------------- |
| 1 | 1 |
| 2 | 2 |
| 3 | 2 |

<!-- @trace
source: fix-factory-scene-responsive-framing
updated: 2026-10-27
code:
  - src/FactoryScene.js
  - src/App.css
tests:
  - src/FactoryScene.test.js
-->

---
### Requirement: Scene background is a sky gradient

The system SHALL display the factory scene over a vertical linear gradient running from `#4a90d9` at the top edge of the scene area to `#dfeaf5` at its bottom edge. The gradient SHALL stay fixed to the screen (it does not rotate or zoom with the camera), SHALL fill the whole scene area at any size, and SHALL be visible while the model is loading, after it has loaded, and when loading fails. The loading and error messages SHALL be shown on a label with background `#151a2e`, so their text keeps a contrast ratio of at least 4.5:1 against what is directly behind it.

#### Scenario: Gradient behind the loaded model

- **WHEN** the factory model has loaded on `/` in a 1280×800 viewport
- **THEN** pixels at the top edge of the scene area that show no model are `#4a90d9`, pixels at the bottom edge that show no model are `#dfeaf5`, and no pixel of the scene area shows the old solid `#0b0d17` background

##### Example: expected background colour by row

| Row position in scene area | Expected colour (±8 per channel) |
| -------------------------- | -------------------------------- |
| top (0%) | `#4a90d9` (74, 144, 217) |
| middle (50%) | `#94bde7` (148, 189, 231) |
| bottom (100%) | `#dfeaf5` (223, 234, 245) |

#### Scenario: Gradient while loading or after failure

- **WHEN** a visitor opens `/` and the model is still downloading, or the download fails
- **THEN** the scene area shows the same gradient, and "Loading factory…" or "Could not load the 3D model." is shown on a `#151a2e` label

#### Scenario: Camera movement does not move the gradient

- **WHEN** the user drags to rotate or scrolls to zoom the scene
- **THEN** the gradient stays the same: `#4a90d9` at the top edge and `#dfeaf5` at the bottom edge

<!-- @trace
source: add-factory-scene-gradient-background
updated: 2026-10-27
code:
  - src/FactoryScene.js
  - public/models/factory0.glb
  - src/App.css
tests:
  - src/FactoryScene.test.js
-->

---
### Requirement: Vehicles are hidden outside the ground

The system SHALL treat every top-level model node named `Car` followed by capital letters and digits, or `Truck` followed by digits (for example `CarE0`, `CarW3`, `Truck3`), as a vehicle. On every rendered frame, after animations advance, the system SHALL show a vehicle only while its world-space origin lies within the world-space x and z extent of the model's `Ground` node (bounds inclusive), and SHALL hide it otherwise. If the model has no `Ground` node, the system SHALL hide no vehicle and SHALL log one console warning that names the missing node.

#### Scenario: Vehicle drives off the ground edge

- **WHEN** a car's animation moves its origin from x 79 to x 81 on a ground spanning x −80 to 80
- **THEN** the car is visible at x 79 and hidden at x 81

#### Scenario: Wrap-around happens out of sight

- **WHEN** a vehicle's loop jumps from x 88.9 to x −88.3
- **THEN** the vehicle is hidden both before and after the jump, and becomes visible again only once its origin is back within x −80 to 80

#### Scenario: Model without a ground

- **WHEN** the loaded model has no node named `Ground`
- **THEN** every vehicle stays visible and exactly one console warning mentioning `Ground` is logged

##### Example: visibility by vehicle origin (ground x and z −80…80)

| Vehicle origin (x, z) | Visible |
| --------------------- | ------- |
| (0, 52.5) | yes |
| (80, 52.5) | yes (on the edge) |
| (80.1, 52.5) | no |
| (−88.3, 47.5) | no |
| (20, 16.5) — parked Truck2 | yes |
| (0, 81) | no |

<!-- @trace
source: hide-vehicles-outside-ground
updated: 2026-10-28
code:
  - public/models/factory.glb
  - src/FactoryScene.js
  - public/models/factory0.glb
tests:
  - src/FactoryScene.test.js
-->