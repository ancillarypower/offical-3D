# mock-auth Specification

## Purpose

Provide a front-end-only sign-in flow so the app has a signed-in state that gates personal pages, without depending on a backend. It exists to let the navigation and the Profile page be built and demonstrated before real authentication is available.

## Requirements

### Requirement: Login page accepts non-empty credentials

The system SHALL show a login page at `/login` with a username field, a password field, and a "Log in" button. The system SHALL accept any username and password that are both non-empty after trimming whitespace, SHALL store the trimmed username as the signed-in user, and SHALL navigate to `/` (Home). The system SHALL NOT send credentials to any network endpoint.

#### Scenario: Successful sign-in

- **WHEN** a visitor on `/login` enters username "amy" and password "secret" and clicks "Log in"
- **THEN** the system navigates to `/` and the Home page is displayed

#### Scenario: Missing field rejected

- **WHEN** a visitor submits the login form with an empty or whitespace-only username or password
- **THEN** the system stays on `/login` and shows the message "Please enter username and password"

##### Example: credential validation

| Username | Password | Result |
| -------- | -------- | ------ |
| "amy" | "secret" | signed in as "amy" |
| "  amy  " | "x" | signed in as "amy" |
| "" | "secret" | error message, stays on /login |
| "amy" | "   " | error message, stays on /login |


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
### Requirement: Session persists for the browser tab

The system SHALL store the signed-in username in `sessionStorage` under the key `gsap-app.user`, and SHALL restore the signed-in state from that key when the app loads. If `sessionStorage` is unavailable or throws, the system SHALL keep the signed-in state in memory only.

#### Scenario: Refresh keeps user signed in

- **WHEN** a signed-in user reloads the page on `/profile`
- **THEN** the system displays the Profile page for the same username without showing the login page


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
### Requirement: Profile page requires sign-in

The system SHALL redirect a visitor who is not signed in from `/profile` to `/login`. The Home page (`/`) SHALL be viewable without signing in. The system SHALL redirect a signed-in user who opens `/login` to `/`.

#### Scenario: Unauthenticated visitor redirected from Profile

- **WHEN** a visitor who is not signed in opens `/profile`
- **THEN** the system navigates to `/login`

#### Scenario: Unauthenticated visitor views Home

- **WHEN** a visitor who is not signed in opens `/`
- **THEN** the system stays on `/` and displays the Home page

#### Scenario: Signed-in user skips login page

- **WHEN** a signed-in user opens `/login`
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
### Requirement: Logout ends the session

The system SHALL, when the user activates "Logout", remove the `gsap-app.user` entry, clear the in-memory signed-in state, and navigate to `/` (Home).

#### Scenario: Logout returns to Home

- **WHEN** a signed-in user clicks "Logout" in the navigation bar
- **THEN** the system navigates to `/`, the navigation bar shows "Log in" instead of "Logout", and opening `/profile` afterwards redirects to `/login`

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