# home-navigation Specification

## Purpose

Define the site layout and top navigation bar that every visitor sees, so pages can be reached consistently and new pages can be added to one place. It covers the public Home page, the Profile page, sign-in-dependent navigation items, active-link indication, responsive collapse, and animated transitions.

## Requirements

### Requirement: Top navigation bar reflects sign-in state

The system SHALL render a top navigation bar on every page except `/login`. When no user is signed in, the bar SHALL contain, in order: a "Home" link to `/`, an "Archimedes" link to `/archimedes`, a "Profile" link to `/profile`, and a "Log in" link to `/login`. When a user is signed in, the bar SHALL contain, in order: a "Home" link to `/`, an "Archimedes" link to `/archimedes`, a "Profile" link to `/profile`, and a "Logout" button. The navigation bar SHALL NOT appear on `/login`. The navigation bar SHALL float over the page content without reserving layout height, SHALL stay in place when the page scrolls, and SHALL keep a visible gap between itself and the top edge of the screen. When the viewport is wider than 768px, the navigation bar SHALL be a single horizontal row whose width follows its items rather than the screen width, placed near the top-right corner with a visible gap from the right edge, keeping the order above from left to right.

#### Scenario: Navigation bar for signed-out visitor

- **WHEN** a visitor who is not signed in is on `/`
- **THEN** the navigation bar shows "Home", "Archimedes", "Profile", and "Log in" in that order

#### Scenario: Navigation bar after sign-in

- **WHEN** a signed-in user is on `/`
- **THEN** the navigation bar shows "Home", "Archimedes", "Profile", and "Logout" in that order

#### Scenario: Navigation bar hidden on login page

- **WHEN** a visitor is on `/login`
- **THEN** no navigation bar is rendered

#### Scenario: Desktop navigation floats at the top right

- **WHEN** a signed-in user opens `/` on a 1280px-wide viewport
- **THEN** "Home", "Archimedes", "Profile", and "Logout" appear in one row, left to right in that order, inside a navigation bar that is narrower than the screen, does not touch the top or right edge of the screen, and leaves the area to its left showing the page content


<!-- @trace
source: floating-nav-pill
updated: 2026-10-29
code:
  - src/layout/AppLayout.js
  - src/App.css
tests:
  - src/App.test.js
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

The system SHALL, when the viewport width is 768px or less, hide the navigation links behind a menu toggle button whose accessible name is "Menu" and whose visible content is a hamburger (☰) icon hidden from assistive technology, with `aria-expanded` reflecting its state. The toggle button SHALL float near the top-left corner of the screen with a visible gap from the top and left edges. When the menu is open, its items SHALL appear in a floating panel below the toggle button, inset from both side edges of the screen, laid out in horizontal rows aligned to the right edge of the panel, in the same order as the navigation bar; when the items do not fit on one row they SHALL wrap onto further rows, and every row SHALL be right-aligned. Activating a link inside the open menu SHALL close the menu.

#### Scenario: Open and use mobile menu

- **WHEN** a signed-in user on a 375px-wide viewport clicks "Menu" and then clicks "Profile"
- **THEN** the menu toggle shows `aria-expanded="true"` while open, the system navigates to `/profile`, and the toggle returns to `aria-expanded="false"`

#### Scenario: Toggle shows hamburger icon with Menu name

- **WHEN** a visitor opens `/` on a 375px-wide viewport
- **THEN** the toggle button displays the ☰ icon, assistive technology announces it as "Menu", and the visible text "Menu" is not shown

#### Scenario: Toggle floats at the top left

- **WHEN** a visitor opens `/` on a 375px-wide viewport with the menu closed
- **THEN** only the ☰ toggle of the navigation is visible, it does not touch the top or left edge of the screen, and the factory scene is visible across the full width beside and below it

#### Scenario: Open menu shows a right-aligned row

- **WHEN** a signed-in user on a 768px-wide viewport opens the menu
- **THEN** "Home", "Archimedes", "Profile", and "Logout" appear in one row below the toggle, left to right in that order, with "Logout" ending at the right edge of the menu panel's content area, and the panel does not touch either side edge of the screen

#### Scenario: Open menu wraps on a very narrow screen

- **WHEN** a signed-in user on a 320px-wide viewport opens the menu and the four items do not fit on one row
- **THEN** the items continue onto a second row in the same order, every item stays clickable, and each row ends at the right edge of the menu panel's content area


<!-- @trace
source: floating-nav-pill
updated: 2026-10-29
code:
  - src/layout/AppLayout.js
  - src/App.css
tests:
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

The system SHALL render the factory scene (see the `factory-scene` capability) on the Home page (`/`) for every visitor, signed in or not, filling the whole page at all times, and SHALL unmount it when the user navigates away from Home. The page's height SHALL be the visible viewport height, where the visible viewport height follows mobile browser toolbars as they expand or collapse (`dvh`), falling back to the layout viewport height (`vh`) in browsers without `dvh` support. The Home page SHALL NOT scroll.

The Home page SHALL show the slogan "以 AI 驅動虛擬電廠引領臺灣能源轉型" as its only level-1 heading, inside a card that floats over the factory scene and reserves no layout space, styled like the floating navigation bar (dark translucent background, background blur, thin light border, rounded corners). When the viewport is wider than 768px the card SHALL float at the left of the page with a visible gap from the left edge, vertically centred, and SHALL be no wider than two fifths of the viewport width. When the viewport is 768px wide or less the card SHALL float near the bottom-left of the page with a visible gap from the left and bottom edges, below the factory model so that it covers no clickable building or marker in the overview, no wider than three fifths of the viewport width, with a smaller slogan font than on wider screens, and the factory model SHALL NOT be moved to avoid the card.

While no building is focused (the overview) and the viewport is wider than 768px, the system SHALL tell the factory scene which part of the page the card covers, so the factory model is shown centred in the uncovered part; at 768px or less the covered area SHALL be empty and the model SHALL stay centred on the whole scene (see "Factory scene keeps the model clear of a covered area" in the `factory-scene` capability). While a building is focused, or while the camera is flying to one, the card SHALL be hidden from view and from assistive technology and the covered area SHALL be empty. When the scene returns to the overview, the card and the covered area SHALL be restored. Only the card SHALL fade or hide: the factory scene SHALL stay fully visible, at full size, with every object drawn, throughout the switch. When the user's system requests reduced motion (`prefers-reduced-motion: reduce`), the card SHALL appear and disappear immediately; otherwise it SHALL fade.

#### Scenario: Navigate between Home and Profile

- **WHEN** a signed-in user goes from `/` to `/profile` and back to `/`
- **THEN** exactly one factory scene is present on Home and none is present on Profile

#### Scenario: Signed-out visitor sees the factory scene

- **WHEN** a visitor who is not signed in opens `/`
- **THEN** exactly one factory scene is present and the heading "以 AI 驅動虛擬電廠引領臺灣能源轉型" is shown

#### Scenario: Mobile browser toolbar visible

- **WHEN** a visitor opens `/` in a mobile browser whose address bar is expanded
- **THEN** the factory scene spans from the top to the bottom of the visible screen and the page does not scroll

#### Scenario: Desktop floating slogan card

- **WHEN** a visitor opens `/` on a 1280px-wide, 800px-tall viewport and no building is focused
- **THEN** the factory scene spans the whole screen, the slogan card floats over it at the left with a gap from the left edge and is no wider than 512px, and the factory model appears to the right of the card rather than under it

#### Scenario: Narrow floating slogan card

- **WHEN** a visitor opens `/` on a 375px-wide viewport and no building is focused
- **THEN** the factory scene spans the whole screen with the factory model centred on it, and the slogan card floats over it near the bottom-left with gaps from the left and bottom edges, below the model's ground and clear of both markers, no wider than 225px, with a slogan font smaller than at 1280px

#### Scenario: Focusing a building hides the card

- **WHEN** a visitor on a 1280px-wide viewport clicks the Office in the factory scene
- **THEN** the slogan card is no longer visible or exposed to assistive technology, the factory scene still spans the whole screen, and the Office ends up centred on the screen

#### Scenario: Scene stays visible while the card fades

- **WHEN** a visitor on a 1280px-wide viewport clicks the "Office" marker and the camera flies to the Office
- **THEN** on every frame of the flight the scene canvas stays 1280×800 and fully opaque, and only the card's opacity changes

#### Scenario: Returning to the overview restores the card

- **WHEN** the Office is focused and the visitor presses Esc
- **THEN** the slogan card is shown again and the factory model returns to the uncovered part of the screen as in "Desktop floating slogan card"

#### Scenario: Reduced motion shows and hides the card at once

- **WHEN** a visitor whose system requests reduced motion clicks the Guard House
- **THEN** the slogan card is hidden immediately, with no fade


<!-- @trace
source: home-hero-split-layout
updated: 2026-10-29
code:
  - src/App.css
  - src/pages/HomePage.js
  - src/layout/AppLayout.js
  - src/FactoryScene.js
tests:
  - src/pages/HomePage.test.js
  - src/App.test.js
  - src/FactoryScene.test.js
-->

---
### Requirement: Archimedes page shows the Archimedes scene

The system SHALL serve a page at `/archimedes` to every visitor, signed in or not, and SHALL render the Archimedes scene (see the `archimedes-scene` capability) on it, filling the full visible screen behind the floating navigation bar. The system SHALL unmount the scene when the user navigates away from `/archimedes`. The content area's height SHALL be the visible viewport height, following mobile browser toolbars (`dvh`) and falling back to `vh` in browsers without `dvh` support. The Archimedes page SHALL NOT scroll. While on `/archimedes`, the "Archimedes" navigation link SHALL have `aria-current="page"` and no other link SHALL.

#### Scenario: Signed-out visitor opens the Archimedes page

- **WHEN** a visitor who is not signed in opens `/archimedes`
- **THEN** exactly one Archimedes scene is present, no factory scene is present, and the "Archimedes" link has `aria-current="page"` while "Home" does not

#### Scenario: Navigate between Home and Archimedes

- **WHEN** a visitor on `/` clicks "Archimedes" and then "Home"
- **THEN** on `/archimedes` exactly one Archimedes scene and no factory scene are present, and back on `/` exactly one factory scene and no Archimedes scene are present

#### Scenario: Archimedes scene fills the screen

- **WHEN** a visitor opens `/archimedes` on a 1280px-wide, 800px-tall viewport
- **THEN** the Archimedes scene spans from the top to the bottom of the screen and the page does not scroll


<!-- @trace
source: floating-nav-pill
updated: 2026-10-29
code:
  - src/layout/AppLayout.js
  - src/App.css
tests:
  - src/App.test.js
-->

---
### Requirement: Page content is not covered by the floating navigation

The system SHALL start the Profile page's content below the floating navigation bar, so that the navigation bar does not overlap the Profile heading at any viewport width.

#### Scenario: Profile heading below the navigation

- **WHEN** a signed-in user opens `/profile` on a 375px-wide viewport and on a 1280px-wide viewport
- **THEN** the "Profile" heading is fully visible and its top edge is below the bottom edge of the navigation toggle or navigation bar

<!-- @trace
source: floating-nav-pill
updated: 2026-10-29
code:
  - src/layout/AppLayout.js
  - src/App.css
tests:
  - src/App.test.js
-->