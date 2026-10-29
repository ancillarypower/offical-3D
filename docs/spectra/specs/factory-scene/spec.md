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

The system SHALL point the camera at the centre of the loaded model's bounding box from a distance at which the whole model is in view at the canvas's current aspect ratio, fitting the model's bounding sphere into whichever of the vertical and horizontal fields of view is narrower. When the canvas is resized while the overview is shown, the system SHALL re-fit: it SHALL keep the camera's current viewing direction and its distance relative to the fit distance, and SHALL recompute the zoom limits. While the overview is shown, the system SHALL slowly rotate the camera around the model centre automatically. The system SHALL let the user rotate the view by dragging and zoom by scroll wheel or pinch. While the overview is shown, zoom SHALL be limited so the camera neither enters the model's bounding sphere nor moves out beyond three times the current fit distance. After the user releases the pointer in the overview, the automatic rotation SHALL continue. While a building is focused (see "Clicking a building focuses the camera on it and shows its name"), automatic rotation SHALL be off and the zoom-in limit SHALL be the focused building's bounding radius instead of the model's.

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

#### Scenario: Resize while a building is focused

- **WHEN** the Office is focused and the canvas is resized from 1280×744 to 375×611, then the user presses Esc
- **THEN** the camera does not move on the resize, and after the return flight the whole model is visible at the new size from the same direction as the original overview


<!-- @trace
source: focus-building-on-click
updated: 2026-10-28
code:
  - src/App.css
  - src/FactoryScene.js
tests:
  - src/FactoryScene.test.js
-->

---
### Requirement: Factory scene releases resources on unmount

The system SHALL, when the factory scene unmounts, stop the render loop and animations, dispose of the orbit controls, every geometry and material in the model, and the WebGL renderer, and remove its canvas. The system SHALL also stop any running camera flight, remove the building name labels and their layer from the page, and remove the pointer listeners on the canvas and the Esc key listener. If the scene unmounts before loading finishes, the system SHALL discard the loaded model instead of adding it to a disposed scene.

#### Scenario: Leave Home

- **WHEN** a visitor on `/` with the model loaded navigates to `/profile`
- **THEN** no canvas remains in the page and the renderer has been disposed

#### Scenario: Leave before load completes

- **WHEN** a visitor leaves `/` while "Loading factory…" is still shown, and the download completes afterwards
- **THEN** no canvas is created and no error is raised

#### Scenario: Leave while a building is focused

- **WHEN** a visitor focuses the Guard House, then navigates to `/profile` before or after the flight ends
- **THEN** no "Guard House" label remains in the page, no camera flight is still running, and pressing Esc afterwards raises no error


<!-- @trace
source: focus-building-on-click
updated: 2026-10-28
code:
  - src/App.css
  - src/FactoryScene.js
tests:
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

---
### Requirement: Clicking a building focuses the camera on it and shows its name

The system SHALL treat the Office and the Guard House in the factory model as clickable buildings. The Office SHALL consist of the top-level model nodes `Office`, `OfficeRoof`, `OfficeCanopy`, `OfficeEntrance`, `OfficeSolar` followed by digits, and `OffWinF` or `OffWinS` followed by `<digits>_<digits>`. The Guard House SHALL consist of the top-level nodes `GuardHouse` and `GuardHouseWin`. A click SHALL be a press and release of the primary mouse button, or of a single finger, on the scene with at most 5 CSS pixels of movement between them; a longer movement SHALL be treated as a drag and SHALL NOT select anything. Right and middle button presses SHALL NOT be clicks, and once a second finger touches the scene, no finger lifted before all fingers are up SHALL count as a click.

When a click's first visible object under the pointer belongs to a clickable building, the system SHALL stop the automatic rotation and move the camera over 1 second so that it looks at the centre of that building's bounding box from in front of its road-facing side, close enough that the building fills most of the view. When the movement ends, the system SHALL show the building's name, "Office" or "Guard House", as a label anchored above that building in the 3D scene, and SHALL show no other building label. The label SHALL follow the building when the user rotates or zooms the view. While a building is focused, clicking the other clickable building SHALL move the camera directly to that building and switch the label. Clicking the focused building again SHALL change nothing. While the pointer is over a clickable building, the cursor SHALL be a hand pointer.

If the model has no nodes of a building, that building SHALL NOT be clickable, and no warning SHALL be shown.

#### Scenario: Click the Office

- **WHEN** the model has loaded and the user clicks on the Office's wall
- **THEN** the automatic rotation stops, the camera moves closer to the Office over 1 second and ends looking at the Office's centre, and the label "Office" is shown above the Office

#### Scenario: Building hidden behind another object is not picked through it

- **WHEN** the user clicks a point where a tree is in front of the Office
- **THEN** the camera does not move to the Office

#### Scenario: Drag is not a click

- **WHEN** the user presses on the Guard House, drags 40 CSS pixels sideways, and releases
- **THEN** the view rotates and the camera does not move to the Guard House

#### Scenario: Switch from one building to the other

- **WHEN** the Office is focused and the user clicks the Guard House
- **THEN** the camera moves to the Guard House, the "Office" label disappears, and the "Guard House" label appears when the movement ends

##### Example: which click counts and what it picks

| Pointer movement between press and release | First visible object under the pointer | Result in the overview |
| --- | --- | --- |
| 0 px | `OffWinF1_2` | focus Office |
| 5 px | `GuardHouse` | focus Guard House |
| 6 px | `GuardHouse` | none (drag) |
| 0 px | a tree trunk in front of the Office | none |
| 0 px | a hidden vehicle, with the Guard House behind it | focus Guard House |
| 0 px | nothing (sky) | none |


<!-- @trace
source: focus-building-on-click
updated: 2026-10-28
code:
  - src/App.css
  - src/FactoryScene.js
tests:
  - src/FactoryScene.test.js
-->

---
### Requirement: Leaving the building focus returns to the overview

While a building is focused, the system SHALL return to the overview when the user clicks anywhere whose first visible object is not a clickable building, including empty sky, or presses the Esc key. Returning SHALL hide the building label at once, move the camera over 1 second back to the position and look-at point it had just before the first building was focused, then resume the automatic rotation and restore the overview zoom limits. While the camera is moving, the system SHALL ignore clicks and the Esc key. In the overview, Esc and clicks on non-building objects SHALL change nothing.

#### Scenario: Esc returns to the overview

- **WHEN** the Office is focused and the user presses Esc
- **THEN** the "Office" label disappears, the camera moves back over 1 second to the view shown before the Office was clicked, and the automatic rotation resumes

#### Scenario: Click the sky to return

- **WHEN** the Guard House is focused and the user clicks on empty sky
- **THEN** the camera returns to the overview and no building label is shown

#### Scenario: Input during the camera movement is ignored

- **WHEN** the user clicks the Office and presses Esc 0.5 seconds later, before the movement ends
- **THEN** the camera still finishes moving to the Office and the "Office" label is shown

<!-- @trace
source: focus-building-on-click
updated: 2026-10-28
code:
  - src/App.css
  - src/FactoryScene.js
tests:
  - src/FactoryScene.test.js
-->

---
### Requirement: Clickable buildings show a marker

The system SHALL show a marker above each clickable building present in the model: a bright accent-coloured circular dot with a halo that expands and fades repeatedly. The marker SHALL be anchored in the 3D scene above the building, at the position where that building's name label appears, and SHALL follow the building when the view rotates or zooms. Each marker SHALL be a control whose accessible name is the building's name ("Office" or "Guard House"), reachable with the keyboard. Activating a marker by click, tap, or keyboard SHALL have the same effect as clicking its building in the scene, including being ignored while the camera is moving and changing nothing when its building is already focused. While a building is focused, and while the camera is flying to it, that building's marker SHALL be hidden; the markers of all other clickable buildings SHALL stay visible. In the overview all markers SHALL be visible. When the user's system requests reduced motion, the halo SHALL NOT animate and the marker SHALL stay visible. The surface around the markers SHALL keep letting clicks and drags through to the scene.

#### Scenario: Markers in the overview

- **WHEN** the factory model has loaded and no building is focused
- **THEN** one marker named "Office" and one marker named "Guard House" are visible, each above its building

#### Scenario: Activating a marker focuses its building

- **WHEN** the user clicks the "Guard House" marker in the overview
- **THEN** the camera moves to the Guard House exactly as when the Guard House itself is clicked, the "Guard House" marker is hidden, and the "Office" marker stays visible

#### Scenario: Switching buildings with a marker

- **WHEN** the Guard House is focused and the user presses Enter on the focused "Office" marker
- **THEN** the camera moves to the Office, the "Office" marker is hidden, and the "Guard House" marker is visible again

#### Scenario: Markers return with the overview

- **WHEN** the Office is focused and the user presses Esc
- **THEN** both markers are visible again

#### Scenario: Marker ignored during a flight

- **WHEN** the user clicks the Office and clicks the "Guard House" marker 0.5 seconds later, before the movement ends
- **THEN** the camera still finishes moving to the Office

##### Example: marker visibility by state

| State | "Office" marker | "Guard House" marker |
| --- | --- | --- |
| overview | visible | visible |
| flying to or focused on Office | hidden | visible |
| flying to or focused on Guard House | visible | hidden |
| flying back to the overview | visible | visible |


<!-- @trace
source: home-hero-split-layout
updated: 2026-10-29
code:
  - src/App.css
  - src/pages/HomePage.js
  - src/layout/AppLayout.js
  - src/FactoryScene.js
tests:
  - src/pages/HomePage.test.js
  - src/App.test.js
  - src/FactoryScene.test.js
-->

---
### Requirement: Factory scene reports building focus to its host

The factory scene SHALL accept an optional focus listener from the page that hosts it. The system SHALL call the listener with the building's id (`Office` or `GuardHouse`) at the moment the camera starts moving to that building, including when switching directly from the other building, and SHALL call it with no building at the moment the camera starts moving back to the overview. The system SHALL NOT call it for input that is ignored or changes nothing. The latest listener passed by the host SHALL be used without rebuilding the scene.

#### Scenario: Focus and return are reported

- **WHEN** the host passes a listener and the user clicks the Office, waits for the movement to end, then presses Esc
- **THEN** the listener is called with `Office` when the camera starts moving and with no building when the camera starts moving back, and with nothing else

#### Scenario: Ignored input is not reported

- **WHEN** the Office is focused and the user clicks the Office again
- **THEN** the listener is not called again

##### Example: listener calls

| Input sequence | Listener calls in order |
| --- | --- |
| click Office | `Office` |
| click Office, finish, click Guard House | `Office`, `GuardHouse` |
| click Office, finish, Esc | `Office`, none |
| click Office, Esc during the flight | `Office` |
| Esc in the overview | (no call) |


<!-- @trace
source: home-hero-split-layout
updated: 2026-10-29
code:
  - src/App.css
  - src/pages/HomePage.js
  - src/layout/AppLayout.js
  - src/FactoryScene.js
tests:
  - src/pages/HomePage.test.js
  - src/App.test.js
  - src/FactoryScene.test.js
-->

---
### Requirement: Factory scene keeps the model clear of a covered area

The factory scene SHALL accept from its hosting page an optional covered area, given as a left band width and a top band height in CSS pixels measured from the scene's left and top edges, with both defaulting to 0. In the overview, the system SHALL frame the whole factory model inside the uncovered part of the scene (the scene minus the left band and minus the top band) and SHALL centre it there, while the canvas, the sky and the scene's input keep covering the whole scene. Picking buildings, markers and labels SHALL stay aligned with what is drawn. When the covered area changes, the framing SHALL move to the new uncovered part over the same duration as a camera movement (1 second), without rebuilding the scene; this movement SHALL play regardless of reduced-motion settings, like the camera flights. A focused building SHALL be framed on the whole scene only when the covered area is empty; the hosting page empties it while a building is focused.

#### Scenario: Model framed beside a left band

- **WHEN** the factory model has loaded in a 1280×800 scene with a 560px left band and no top band
- **THEN** the model's projected bounding box lies between x = 560 and x = 1280, and the box's horizontal centre is within 36px (5% of the 720px uncovered width) of x = 920

#### Scenario: Model framed below a top band

- **WHEN** the factory model has loaded in a 375×667 scene with a 170px top band
- **THEN** the model's projected bounding box lies between y = 170 and y = 667, and a click on the Office as drawn still focuses the Office

#### Scenario: Band removed while focusing

- **WHEN** the covered area changes from a 560px left band to none while the camera flies to the Office
- **THEN** after the movement ends the Office is centred on the whole scene


<!-- @trace
source: home-hero-split-layout
updated: 2026-10-29
code:
  - src/App.css
  - src/pages/HomePage.js
  - src/layout/AppLayout.js
  - src/FactoryScene.js
tests:
  - src/pages/HomePage.test.js
  - src/App.test.js
  - src/FactoryScene.test.js
-->

---
### Requirement: Factory scene redraws immediately after a resize

When the factory scene's size changes after the model has loaded, the system SHALL draw the scene at the new size before the browser next paints, so that a resize never shows an empty or partly drawn scene.

#### Scenario: Resize does not blank the scene

- **WHEN** the factory model has loaded and the scene is resized from 768×800 to 1280×800
- **THEN** the scene is drawn at 1280×800 within the same resize handling, before any further animation frame runs

<!-- @trace
source: home-hero-split-layout
updated: 2026-10-29
code:
  - src/App.css
  - src/pages/HomePage.js
  - src/layout/AppLayout.js
  - src/FactoryScene.js
tests:
  - src/pages/HomePage.test.js
  - src/App.test.js
  - src/FactoryScene.test.js
-->