## MODIFIED Requirements

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

## ADDED Requirements

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
