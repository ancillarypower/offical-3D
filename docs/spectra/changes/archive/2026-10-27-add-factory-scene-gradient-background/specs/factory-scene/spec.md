## ADDED Requirements

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
