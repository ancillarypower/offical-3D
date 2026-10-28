## MODIFIED Requirements

### Requirement: Factory model loads with visible status

The system SHALL load `models/factory0.glb` from the app's public URL when the factory scene mounts. While the model is loading, the system SHALL show the text "Loading factory…" in an element with `role="status"`. When loading succeeds, the system SHALL remove that text and display the model. When loading fails, the system SHALL show the text "Could not load the 3D model." in an element with `role="alert"` and SHALL NOT show the loading text.

#### Scenario: Loading then ready

- **WHEN** a visitor opens `/` and the model download has not finished
- **THEN** "Loading factory…" is shown, and after the model finishes loading the text is gone and the model is displayed

#### Scenario: Load failure

- **WHEN** a visitor opens `/` and `models/factory0.glb` cannot be loaded (for example the server returns 404)
- **THEN** "Could not load the 3D model." is shown and "Loading factory…" is not shown

## ADDED Requirements

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
