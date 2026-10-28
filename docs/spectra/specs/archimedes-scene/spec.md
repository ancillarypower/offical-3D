# archimedes-scene Specification

## Purpose

Render the animated Archimedes screw hydro-power 3D model (`public/models/Archimedes_opt_anim.glb`) as the main visual of the `/archimedes` page, so visitors can view the screw generator with the same viewing experience as the factory scene. It covers loading and error states, animation playback, camera behaviour, render resolution, background, and resource cleanup.

## Requirements

### Requirement: Archimedes model loads with visible status

The system SHALL load `models/Archimedes_opt_anim.glb` from the app's public URL when the Archimedes scene mounts. While the model is loading, the system SHALL show the text "Loading Archimedes screw…" in an element with `role="status"`. When loading succeeds, the system SHALL remove that text and display the model. When loading fails, or the WebGL renderer cannot be created, the system SHALL show the text "Could not load the 3D model." in an element with `role="alert"` and SHALL NOT show the loading text.

#### Scenario: Loading then ready

- **WHEN** a visitor opens `/archimedes` and the model download has not finished
- **THEN** "Loading Archimedes screw…" is shown, and after the model finishes loading the text is gone and the model is displayed

#### Scenario: Load failure

- **WHEN** a visitor opens `/archimedes` and `models/Archimedes_opt_anim.glb` cannot be loaded (for example the server returns 404)
- **THEN** "Could not load the 3D model." is shown and "Loading Archimedes screw…" is not shown

#### Scenario: WebGL unavailable

- **WHEN** the model loads but the browser cannot create a WebGL renderer
- **THEN** "Could not load the 3D model." is shown and no canvas is added


<!-- @trace
source: add-archimedes-page
updated: 2026-10-28
code:
  - src/pages/ArchimedesPage.js
  - public/models/Archimedes_opt_anim.glb
  - src/FactoryScene.js
  - src/App.css
  - src/layout/AppLayout.js
  - src/ArchimedesScene.js
  - src/threeHelpers.js
  - src/App.js
tests:
  - src/App.test.js
  - src/ArchimedesScene.test.js
-->

---
### Requirement: Archimedes animation plays on loop

The system SHALL play every animation clip embedded in the Archimedes model simultaneously and repeat each clip indefinitely while the scene is mounted. The scene SHALL play regardless of the operating system's reduced-motion setting.

#### Scenario: Screw and water animate

- **WHEN** the Archimedes model, which contains the single clip `ScrewAndWaterFlow`, finishes loading
- **THEN** one animation action is playing with infinite repetition

#### Scenario: Reduced motion does not stop the scene

- **WHEN** a user with `prefers-reduced-motion: reduce` opens `/archimedes` and the model finishes loading
- **THEN** the animation and the camera auto-orbit run the same as for other users


<!-- @trace
source: add-archimedes-page
updated: 2026-10-28
code:
  - src/pages/ArchimedesPage.js
  - public/models/Archimedes_opt_anim.glb
  - src/FactoryScene.js
  - src/App.css
  - src/layout/AppLayout.js
  - src/ArchimedesScene.js
  - src/threeHelpers.js
  - src/App.js
tests:
  - src/App.test.js
  - src/ArchimedesScene.test.js
-->

---
### Requirement: Archimedes camera frames the model and auto-orbits with user control

The system SHALL point the camera at the centre of the loaded model's bounding box from a distance at which the whole model is in view at the canvas's current aspect ratio, fitting the model's bounding sphere into whichever of the vertical (45°) and horizontal fields of view is narrower. When the canvas is resized, the system SHALL re-fit: it SHALL keep the camera's current viewing direction and its distance relative to the fit distance, and SHALL recompute the zoom limits. The system SHALL slowly rotate the camera around the model centre automatically, and SHALL let the user rotate the view by dragging and zoom by scroll wheel or pinch. Zoom SHALL be limited so the camera neither enters the model's bounding sphere nor moves out beyond three times the current fit distance. After the user releases the pointer, the automatic rotation SHALL continue.

#### Scenario: Initial framing

- **WHEN** the Archimedes model finishes loading in a 1280×744 canvas
- **THEN** the whole model is visible and the camera looks at the centre of its bounding box

#### Scenario: Initial framing on a portrait screen

- **WHEN** the Archimedes model finishes loading in a 375×611 canvas
- **THEN** the whole model is visible, with no part cut off at the left or right edge

##### Example: camera distance by canvas size (bounding radius 1, vertical FOV 45°)

| Canvas (w×h) | Expected camera distance |
| ------------ | ------------------------ |
| 1280×744 | 1 / sin(22.5°) ≈ 2.613 (vertical is narrower) |
| 375×611 | 1 / sin(atan(375/611 × tan 22.5°)) ≈ 4.059 (horizontal is narrower) |

#### Scenario: Re-fit after resize

- **WHEN** the model is shown at 1280×744 and the canvas is resized to 375×611
- **THEN** the camera looks from the same direction as before the resize, its distance is the new fit distance times the zoom ratio it had before, and the maximum zoom-out distance is three times the new fit distance

#### Scenario: Drag to rotate

- **WHEN** the user drags horizontally across the scene and releases
- **THEN** the view rotates with the drag, and afterwards the automatic rotation continues


<!-- @trace
source: add-archimedes-page
updated: 2026-10-28
code:
  - src/pages/ArchimedesPage.js
  - public/models/Archimedes_opt_anim.glb
  - src/FactoryScene.js
  - src/App.css
  - src/layout/AppLayout.js
  - src/ArchimedesScene.js
  - src/threeHelpers.js
  - src/App.js
tests:
  - src/App.test.js
  - src/ArchimedesScene.test.js
-->

---
### Requirement: Archimedes scene renders at a capped resolution over the sky gradient

The system SHALL render the Archimedes scene at a pixel ratio of the device pixel ratio capped at 2, both when the scene is created and after every resize. The system SHALL clear the canvas transparently and SHALL display the scene over the same vertical gradient as the factory scene, from `#4a90d9` at the top edge to `#dfeaf5` at the bottom edge, fixed to the screen and visible while loading, after loading and on failure. The loading and error messages SHALL be shown on a label with background `#151a2e`.

#### Scenario: High-density phone

- **WHEN** the Archimedes scene loads on a device whose `devicePixelRatio` is 3
- **THEN** the renderer's pixel ratio is 2

#### Scenario: Gradient behind the model

- **WHEN** the Archimedes model has loaded on `/archimedes`
- **THEN** the renderer clears with alpha 0 and the scene area shows the `#4a90d9` → `#dfeaf5` gradient wherever no model is drawn


<!-- @trace
source: add-archimedes-page
updated: 2026-10-28
code:
  - src/pages/ArchimedesPage.js
  - public/models/Archimedes_opt_anim.glb
  - src/FactoryScene.js
  - src/App.css
  - src/layout/AppLayout.js
  - src/ArchimedesScene.js
  - src/threeHelpers.js
  - src/App.js
tests:
  - src/App.test.js
  - src/ArchimedesScene.test.js
-->

---
### Requirement: Archimedes scene releases resources on unmount

The system SHALL, when the Archimedes scene unmounts, stop the render loop and animations, disconnect its resize observer, dispose of the orbit controls, every geometry and material in the model, and the WebGL renderer, and remove its canvas. If the scene unmounts before loading finishes, the system SHALL discard the loaded model instead of adding it to a disposed scene.

#### Scenario: Leave the Archimedes page

- **WHEN** a visitor on `/archimedes` with the model loaded navigates to `/`
- **THEN** no Archimedes canvas remains in the page and its renderer and controls have been disposed

#### Scenario: Leave before load completes

- **WHEN** a visitor leaves `/archimedes` while "Loading Archimedes screw…" is still shown, and the download completes afterwards
- **THEN** no canvas is created and no error is raised

<!-- @trace
source: add-archimedes-page
updated: 2026-10-28
code:
  - src/pages/ArchimedesPage.js
  - public/models/Archimedes_opt_anim.glb
  - src/FactoryScene.js
  - src/App.css
  - src/layout/AppLayout.js
  - src/ArchimedesScene.js
  - src/threeHelpers.js
  - src/App.js
tests:
  - src/App.test.js
  - src/ArchimedesScene.test.js
-->