## Purpose

Define the site layout and top navigation bar that every visitor sees, so pages can be reached consistently and new pages can be added to one place. It covers the public Home page, the Profile page, sign-in-dependent navigation items, active-link indication, responsive collapse, and animated transitions.

## ADDED Requirements

### Requirement: Top navigation bar reflects sign-in state

The system SHALL render a top navigation bar on every page except `/login`. When no user is signed in, the bar SHALL contain, in order: a "Home" link to `/`, a "Profile" link to `/profile`, and a "Log in" link to `/login`. When a user is signed in, the bar SHALL contain, in order: a "Home" link to `/`, a "Profile" link to `/profile`, and a "Logout" button. The navigation bar SHALL NOT appear on `/login`.

#### Scenario: Navigation bar for signed-out visitor

- **WHEN** a visitor who is not signed in is on `/`
- **THEN** the navigation bar shows "Home", "Profile", and "Log in" in that order

#### Scenario: Navigation bar after sign-in

- **WHEN** a signed-in user is on `/`
- **THEN** the navigation bar shows "Home", "Profile", and "Logout" in that order

#### Scenario: Navigation bar hidden on login page

- **WHEN** a visitor is on `/login`
- **THEN** no navigation bar is rendered

### Requirement: Active page is indicated

The system SHALL mark the navigation link matching the current route with `aria-current="page"`, and only that link.

#### Scenario: Profile link active

- **WHEN** a signed-in user is on `/profile`
- **THEN** the "Profile" link has `aria-current="page"` and the "Home" link does not

### Requirement: Home page shows the rotating sphere

The system SHALL render the existing `RotatingSphere` 3D visual on the Home page (`/`) for every visitor, signed in or not, filling the content area below the navigation bar, and SHALL dispose of its renderer when the user navigates away from Home.

#### Scenario: Navigate between Home and Profile

- **WHEN** a signed-in user goes from `/` to `/profile` and back to `/`
- **THEN** exactly one sphere canvas is present on Home and none is present on Profile

#### Scenario: Signed-out visitor sees the sphere

- **WHEN** a visitor who is not signed in opens `/`
- **THEN** exactly one sphere canvas is present

### Requirement: Profile page shows the signed-in user

The system SHALL display the signed-in username on the Profile page (`/profile`).

#### Scenario: Username displayed

- **WHEN** user "amy" opens `/profile`
- **THEN** the page displays the text "amy"

### Requirement: Unknown routes fall back to Home

The system SHALL redirect any visitor, signed in or not, who opens an unknown path to `/`.

#### Scenario: Unknown path when signed in

- **WHEN** a signed-in user opens `/does-not-exist`
- **THEN** the system navigates to `/`

#### Scenario: Unknown path when signed out

- **WHEN** a visitor who is not signed in opens `/does-not-exist`
- **THEN** the system navigates to `/`

### Requirement: Navigation collapses on narrow screens

The system SHALL, when the viewport width is 768px or less, hide the navigation links behind a menu toggle button labelled "Menu" with `aria-expanded` reflecting its state. Activating a link inside the open menu SHALL close the menu.

#### Scenario: Open and use mobile menu

- **WHEN** a signed-in user on a 375px-wide viewport clicks "Menu" and then clicks "Profile"
- **THEN** the menu toggle shows `aria-expanded="true"` while open, the system navigates to `/profile`, and the toggle returns to `aria-expanded="false"`

### Requirement: Page transitions are animated with reduced-motion support

The system SHALL animate the page content in with GSAP (fade and upward slide) when the route changes, and SHALL animate the mobile menu open and closed. When the user's system requests reduced motion (`prefers-reduced-motion: reduce`), the system SHALL show content and the menu immediately without animation.

#### Scenario: Reduced motion

- **WHEN** a user with `prefers-reduced-motion: reduce` navigates from `/` to `/profile`
- **THEN** the Profile content is fully visible immediately with no transition
