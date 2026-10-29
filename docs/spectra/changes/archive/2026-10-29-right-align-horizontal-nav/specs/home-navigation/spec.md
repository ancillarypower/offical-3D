## MODIFIED Requirements

### Requirement: Top navigation bar reflects sign-in state

The system SHALL render a top navigation bar on every page except `/login`. When no user is signed in, the bar SHALL contain, in order: a "Home" link to `/`, an "Archimedes" link to `/archimedes`, a "Profile" link to `/profile`, and a "Log in" link to `/login`. When a user is signed in, the bar SHALL contain, in order: a "Home" link to `/`, an "Archimedes" link to `/archimedes`, a "Profile" link to `/profile`, and a "Logout" button. The navigation bar SHALL NOT appear on `/login`. When the viewport is wider than 768px, the navigation items SHALL be laid out in a single horizontal row placed against the right edge of the bar, keeping the order above from left to right.

#### Scenario: Navigation bar for signed-out visitor

- **WHEN** a visitor who is not signed in is on `/`
- **THEN** the navigation bar shows "Home", "Archimedes", "Profile", and "Log in" in that order

#### Scenario: Navigation bar after sign-in

- **WHEN** a signed-in user is on `/`
- **THEN** the navigation bar shows "Home", "Archimedes", "Profile", and "Logout" in that order

#### Scenario: Navigation bar hidden on login page

- **WHEN** a visitor is on `/login`
- **THEN** no navigation bar is rendered

#### Scenario: Desktop items aligned to the right

- **WHEN** a signed-in user opens `/` on a 1280px-wide viewport
- **THEN** "Home", "Archimedes", "Profile", and "Logout" appear in one row, left to right in that order, with "Logout" ending at the right edge of the bar's content area and empty space to the left of "Home"

### Requirement: Navigation collapses on narrow screens

The system SHALL, when the viewport width is 768px or less, hide the navigation links behind a menu toggle button whose accessible name is "Menu" and whose visible content is a hamburger (☰) icon hidden from assistive technology, with `aria-expanded` reflecting its state. The toggle button SHALL stay at the left of the bar. When the menu is open, its items SHALL be laid out in horizontal rows aligned to the right edge of the menu panel, in the same order as the navigation bar; when the items do not fit on one row they SHALL wrap onto further rows, and every row SHALL be right-aligned. Activating a link inside the open menu SHALL close the menu.

#### Scenario: Open and use mobile menu

- **WHEN** a signed-in user on a 375px-wide viewport clicks "Menu" and then clicks "Profile"
- **THEN** the menu toggle shows `aria-expanded="true"` while open, the system navigates to `/profile`, and the toggle returns to `aria-expanded="false"`

#### Scenario: Toggle shows hamburger icon with Menu name

- **WHEN** a visitor opens `/` on a 375px-wide viewport
- **THEN** the toggle button displays the ☰ icon, assistive technology announces it as "Menu", and the visible text "Menu" is not shown

#### Scenario: Open menu shows a right-aligned row

- **WHEN** a signed-in user on a 768px-wide viewport opens the menu
- **THEN** "Home", "Archimedes", "Profile", and "Logout" appear in one row, left to right in that order, with "Logout" ending at the right edge of the menu panel's content area

#### Scenario: Open menu wraps on a very narrow screen

- **WHEN** a signed-in user on a 320px-wide viewport opens the menu and the four items do not fit on one row
- **THEN** the items continue onto a second row in the same order, every item stays clickable, and each row ends at the right edge of the menu panel's content area
