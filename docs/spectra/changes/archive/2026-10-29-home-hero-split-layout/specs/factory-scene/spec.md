## ADDED Requirements

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

### Requirement: Factory scene redraws immediately after a resize

When the factory scene's size changes after the model has loaded, the system SHALL draw the scene at the new size before the browser next paints, so that a resize never shows an empty or partly drawn scene.

#### Scenario: Resize does not blank the scene

- **WHEN** the factory model has loaded and the scene is resized from 768×800 to 1280×800
- **THEN** the scene is drawn at 1280×800 within the same resize handling, before any further animation frame runs

