# home-navigation Specification

## Purpose

Define the site layout and top navigation bar that every visitor sees, so pages can be reached consistently and new pages can be added to one place. It covers the public Home page, the Profile page, sign-in-dependent navigation items, active-link indication, responsive collapse, and animated transitions.

## Requirements

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


<!-- @trace
source: add-archimedes-page
updated: 2026-10-28
code:
  - src/pages/ArchimedesPage.js
  - public/models/Archimedes_opt_anim.glb
  - src/FactoryScene.js
  - src/App.css
  - src/layout/AppLayout.js
  - src/ArchimedesScene.js
  - src/threeHelpers.js
  - src/App.js
tests:
  - src/App.test.js
  - src/ArchimedesScene.test.js
-->

---
### Requirement: Active page is indicated

The system SHALL mark the navigation link matching the current route with `aria-current="page"`, and only that link.

#### Scenario: Profile link active

- **WHEN** a signed-in user is on `/profile`
- **THEN** the "Profile" link has `aria-current="page"` and the "Home" link does not


<!-- @trace
source: add-login-and-home-navigation
updated: 2026-10-27
code:
  - src/RotatingSphere.js
  - src/auth/AuthContext.js
  - src/layout/AppLayout.js
  - src/pages/LoginPage.js
  - src/pages/ProfilePage.js
  - src/setupTests.js
  - src/App.js
  - package.json
  - src/pages/HomePage.js
  - src/App.css
  - src/auth/guards.js
  - src/index.js
tests:
  - src/auth/AuthContext.test.js
  - src/App.test.js
-->

---
### Requirement: Profile page shows the signed-in user

The system SHALL display the signed-in username on the Profile page (`/profile`).

#### Scenario: Username displayed

- **WHEN** user "amy" opens `/profile`
- **THEN** the page displays the text "amy"


<!-- @trace
source: add-login-and-home-navigation
updated: 2026-10-27
code:
  - src/RotatingSphere.js
  - src/auth/AuthContext.js
  - src/layout/AppLayout.js
  - src/pages/LoginPage.js
  - src/pages/ProfilePage.js
  - src/setupTests.js
  - src/App.js
  - package.json
  - src/pages/HomePage.js
  - src/App.css
  - src/auth/guards.js
  - src/index.js
tests:
  - src/auth/AuthContext.test.js
  - src/App.test.js
-->

---
### Requirement: Unknown routes fall back to Home

The system SHALL redirect any visitor, signed in or not, who opens an unknown path to `/`.

#### Scenario: Unknown path when signed in

- **WHEN** a signed-in user opens `/does-not-exist`
- **THEN** the system navigates to `/`

#### Scenario: Unknown path when signed out

- **WHEN** a visitor who is not signed in opens `/does-not-exist`
- **THEN** the system navigates to `/`


<!-- @trace
source: add-login-and-home-navigation
updated: 2026-10-27
code:
  - src/RotatingSphere.js
  - src/auth/AuthContext.js
  - src/layout/AppLayout.js
  - src/pages/LoginPage.js
  - src/pages/ProfilePage.js
  - src/setupTests.js
  - src/App.js
  - package.json
  - src/pages/HomePage.js
  - src/App.css
  - src/auth/guards.js
  - src/index.js
tests:
  - src/auth/AuthContext.test.js
  - src/App.test.js
-->

---
### Requirement: Navigation collapses on narrow screens

The system SHALL, when the viewport width is 768px or less, hide the navigation links behind a menu toggle button labelled "Menu" with `aria-expanded` reflecting its state. Activating a link inside the open menu SHALL close the menu.

#### Scenario: Open and use mobile menu

- **WHEN** a signed-in user on a 375px-wide viewport clicks "Menu" and then clicks "Profile"
- **THEN** the menu toggle shows `aria-expanded="true"` while open, the system navigates to `/profile`, and the toggle returns to `aria-expanded="false"`


<!-- @trace
source: add-login-and-home-navigation
updated: 2026-10-27
code:
  - src/RotatingSphere.js
  - src/auth/AuthContext.js
  - src/layout/AppLayout.js
  - src/pages/LoginPage.js
  - src/pages/ProfilePage.js
  - src/setupTests.js
  - src/App.js
  - package.json
  - src/pages/HomePage.js
  - src/App.css
  - src/auth/guards.js
  - src/index.js
tests:
  - src/auth/AuthContext.test.js
  - src/App.test.js
-->

---
### Requirement: Page transitions are animated with reduced-motion support

The system SHALL animate the page content in with GSAP (fade and upward slide) when the route changes, and SHALL animate the mobile menu open and closed. When the user's system requests reduced motion (`prefers-reduced-motion: reduce`), the system SHALL show content and the menu immediately without animation.

#### Scenario: Reduced motion

- **WHEN** a user with `prefers-reduced-motion: reduce` navigates from `/` to `/profile`
- **THEN** the Profile content is fully visible immediately with no transition

<!-- @trace
source: add-login-and-home-navigation
updated: 2026-10-27
code:
  - src/RotatingSphere.js
  - src/auth/AuthContext.js
  - src/layout/AppLayout.js
  - src/pages/LoginPage.js
  - src/pages/ProfilePage.js
  - src/setupTests.js
  - src/App.js
  - package.json
  - src/pages/HomePage.js
  - src/App.css
  - src/auth/guards.js
  - src/index.js
tests:
  - src/auth/AuthContext.test.js
  - src/App.test.js
-->

---
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
### Requirement: Archimedes page shows the Archimedes scene

The system SHALL serve a page at `/archimedes` to every visitor, signed in or not, and SHALL render the Archimedes scene (see the `archimedes-scene` capability) on it, filling the content area below the navigation bar. The system SHALL unmount the scene when the user navigates away from `/archimedes`. The content area's height SHALL be the visible viewport height minus the navigation bar height, following mobile browser toolbars (`dvh`) and falling back to `vh` in browsers without `dvh` support. The Archimedes page SHALL NOT scroll. While on `/archimedes`, the "Archimedes" navigation link SHALL have `aria-current="page"` and no other link SHALL.

#### Scenario: Signed-out visitor opens the Archimedes page

- **WHEN** a visitor who is not signed in opens `/archimedes`
- **THEN** exactly one Archimedes scene is present, no factory scene is present, and the "Archimedes" link has `aria-current="page"` while "Home" does not

#### Scenario: Navigate between Home and Archimedes

- **WHEN** a visitor on `/` clicks "Archimedes" and then "Home"
- **THEN** on `/archimedes` exactly one Archimedes scene and no factory scene are present, and back on `/` exactly one factory scene and no Archimedes scene are present

<!-- @trace
source: add-archimedes-page
updated: 2026-10-28
code:
  - src/pages/ArchimedesPage.js
  - public/models/Archimedes_opt_anim.glb
  - src/FactoryScene.js
  - src/App.css
  - src/layout/AppLayout.js
  - src/ArchimedesScene.js
  - src/threeHelpers.js
  - src/App.js
tests:
  - src/App.test.js
  - src/ArchimedesScene.test.js
-->