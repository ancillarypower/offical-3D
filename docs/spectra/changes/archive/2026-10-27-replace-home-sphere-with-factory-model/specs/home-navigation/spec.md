## REMOVED Requirements

### Requirement: Home page shows the rotating sphere

**Reason**: The placeholder `RotatingSphere` visual is replaced by the factory 3D model.

**Migration**: Superseded by the ADDED requirement "Home page shows the factory scene" below; `src/RotatingSphere.js` is deleted.

## ADDED Requirements

### Requirement: Home page shows the factory scene

The system SHALL render the factory scene (see the `factory-scene` capability) on the Home page (`/`) for every visitor, signed in or not, filling the content area below the navigation bar, and SHALL unmount it when the user navigates away from Home.

#### Scenario: Navigate between Home and Profile

- **WHEN** a signed-in user goes from `/` to `/profile` and back to `/`
- **THEN** exactly one factory scene is present on Home and none is present on Profile

#### Scenario: Signed-out visitor sees the factory scene

- **WHEN** a visitor who is not signed in opens `/`
- **THEN** exactly one factory scene is present
