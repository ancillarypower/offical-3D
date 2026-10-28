## MODIFIED Requirements

### Requirement: Top navigation bar reflects sign-in state

The system SHALL render a top navigation bar on every page except `/login`. When no user is signed in, the bar SHALL contain, in order: a "Home" link to `/`, an "Archimedes" link to `/archimedes`, a "Profile" link to `/profile`, and a "Log in" link to `/login`. When a user is signed in, the bar SHALL contain, in order: a "Home" link to `/`, an "Archimedes" link to `/archimedes`, a "Profile" link to `/profile`, and a "Logout" button. The navigation bar SHALL NOT appear on `/login`.

#### Scenario: Navigation bar for signed-out visitor

- **WHEN** a visitor who is not signed in is on `/`
- **THEN** the navigation bar shows "Home", "Archimedes", "Profile", and "Log in" in that order

#### Scenario: Navigation bar after sign-in

- **WHEN** a signed-in user is on `/`
- **THEN** the navigation bar shows "Home", "Archimedes", "Profile", and "Logout" in that order

#### Scenario: Navigation bar hidden on login page

- **WHEN** a visitor is on `/login`
- **THEN** no navigation bar is rendered

## ADDED Requirements

### Requirement: Archimedes page shows the Archimedes scene

The system SHALL serve a page at `/archimedes` to every visitor, signed in or not, and SHALL render the Archimedes scene (see the `archimedes-scene` capability) on it, filling the content area below the navigation bar. The system SHALL unmount the scene when the user navigates away from `/archimedes`. The content area's height SHALL be the visible viewport height minus the navigation bar height, following mobile browser toolbars (`dvh`) and falling back to `vh` in browsers without `dvh` support. The Archimedes page SHALL NOT scroll. While on `/archimedes`, the "Archimedes" navigation link SHALL have `aria-current="page"` and no other link SHALL.

#### Scenario: Signed-out visitor opens the Archimedes page

- **WHEN** a visitor who is not signed in opens `/archimedes`
- **THEN** exactly one Archimedes scene is present, no factory scene is present, and the "Archimedes" link has `aria-current="page"` while "Home" does not

#### Scenario: Navigate between Home and Archimedes

- **WHEN** a visitor on `/` clicks "Archimedes" and then "Home"
- **THEN** on `/archimedes` exactly one Archimedes scene and no factory scene are present, and back on `/` exactly one factory scene and no Archimedes scene are present
