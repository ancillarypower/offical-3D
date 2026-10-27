## MODIFIED Requirements

### Requirement: Home page shows the factory scene

The system SHALL render the factory scene (see the `factory-scene` capability) on the Home page (`/`) for every visitor, signed in or not, filling the content area below the navigation bar, and SHALL unmount it when the user navigates away from Home. The content area's height SHALL be the visible viewport height minus the navigation bar height, where the visible viewport height follows mobile browser toolbars as they expand or collapse (`dvh`), falling back to the layout viewport height (`vh`) in browsers without `dvh` support. The Home page SHALL NOT scroll.

#### Scenario: Navigate between Home and Profile

- **WHEN** a signed-in user goes from `/` to `/profile` and back to `/`
- **THEN** exactly one factory scene is present on Home and none is present on Profile

#### Scenario: Signed-out visitor sees the factory scene

- **WHEN** a visitor who is not signed in opens `/`
- **THEN** exactly one factory scene is present

#### Scenario: Mobile browser toolbar visible

- **WHEN** a visitor opens `/` in a mobile browser whose address bar is expanded
- **THEN** the bottom edge of the factory scene sits at the bottom of the visible screen and the page does not scroll
