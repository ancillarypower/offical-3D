## Purpose

Render the animated factory 3D model (`public/models/factory.glb`) as the Home page's main visual, so visitors see the product's factory scene instead of a placeholder shape. It covers loading and error states, animation playback, camera behaviour, and resource cleanup.

## ADDED Requirements

### Requirement: Factory model loads with visible status

The system SHALL load `models/factory.glb` from the app's public URL when the factory scene mounts. While the model is loading, the system SHALL show the text "Loading factory…" in an element with `role="status"`. When loading succeeds, the system SHALL remove that text and display the model. When loading fails, the system SHALL show the text "Could not load the 3D model." in an element with `role="alert"` and SHALL NOT show the loading text.

#### Scenario: Loading then ready

- **WHEN** a visitor opens `/` and the model download has not finished
- **THEN** "Loading factory…" is shown, and after the model finishes loading the text is gone and the model is displayed

#### Scenario: Load failure

- **WHEN** a visitor opens `/` and `models/factory.glb` cannot be loaded (for example the server returns 404)
- **THEN** "Could not load the 3D model." is shown and "Loading factory…" is not shown

### Requirement: Embedded animations play on loop

The system SHALL play every animation clip embedded in the factory model simultaneously and repeat each clip indefinitely while the scene is mounted. The scene SHALL play regardless of the operating system's reduced-motion setting.

#### Scenario: All clips playing

- **WHEN** the factory model containing 102 clips finishes loading
- **THEN** 102 animation actions are playing with infinite repetition

#### Scenario: Reduced motion does not stop the scene

- **WHEN** a user with `prefers-reduced-motion: reduce` opens `/` and the model finishes loading
- **THEN** the embedded animations and the camera auto-orbit run the same as for other users

### Requirement: Camera frames the model and auto-orbits with user control

The system SHALL point the camera at the centre of the loaded model's bounding box from a distance at which the whole model is in view, SHALL slowly rotate the camera around that centre automatically, and SHALL let the user rotate the view by dragging and zoom by scroll wheel or pinch. Zoom SHALL be limited so the camera neither enters the model's bounding box nor moves out beyond three times the initial viewing distance. After the user releases the pointer, the automatic rotation SHALL continue.

#### Scenario: Initial framing

- **WHEN** the factory model finishes loading in a 1280×744 viewport
- **THEN** the whole model is visible and the camera looks at the centre of its bounding box

#### Scenario: Drag to rotate

- **WHEN** the user drags horizontally across the scene and releases
- **THEN** the view rotates with the drag, and afterwards the automatic rotation continues

### Requirement: Factory scene releases resources on unmount

The system SHALL, when the factory scene unmounts, stop the render loop and animations, dispose of the orbit controls, every geometry and material in the model, and the WebGL renderer, and remove its canvas. If the scene unmounts before loading finishes, the system SHALL discard the loaded model instead of adding it to a disposed scene.

#### Scenario: Leave Home

- **WHEN** a visitor on `/` with the model loaded navigates to `/profile`
- **THEN** no canvas remains in the page and the renderer has been disposed

#### Scenario: Leave before load completes

- **WHEN** a visitor leaves `/` while "Loading factory…" is still shown, and the download completes afterwards
- **THEN** no canvas is created and no error is raised
