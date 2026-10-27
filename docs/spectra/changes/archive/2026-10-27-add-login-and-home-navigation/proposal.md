## Why

The app currently renders only a full-screen `RotatingSphere` with no entry flow or way to move between pages. We need a defined navigation structure — what a visitor sees before and after signing in and how they move between pages — so further pages can be added on a stable structure. The Home page (with the sphere) is the public face of the app, so it must be viewable without signing in; only personal pages require sign-in.

## What Changes

- Add a front-end-only login page (mock authentication, no backend) that accepts any non-empty username and password.
- Persist the signed-in user for the browser tab session so a page refresh keeps the user signed in.
- Add a layout with a top navigation bar shown on every page except `/login`:
  - signed out: Home, Profile, Log in (link to `/login`);
  - signed in: Home, Profile, Logout.
- Home page (`/`) is public and reuses the existing `RotatingSphere` as its main visual.
- Profile page shows the signed-in username and requires sign-in; signed-out visitors are redirected to the login page.
- Logout clears the session and returns the user to Home (`/`), where the navigation bar switches back to the signed-out form.
- Unknown paths fall back to Home for every visitor.
- On narrow screens, the navigation bar collapses into a toggleable (hamburger) menu.
- Animate page transitions and the mobile menu with GSAP, respecting `prefers-reduced-motion`.
- Add client-side routing via the `react-router-dom` dependency.

## Non-Goals

Recorded in design.md (Goals / Non-Goals).

## Capabilities

### New Capabilities

- `mock-auth`: Front-end-only sign-in, session persistence, sign-out, and route protection for the Profile page.
- `home-navigation`: Site layout with a top navigation bar whose items depend on sign-in state, public Home and guarded Profile routes, active-link indication, responsive collapse, and GSAP transitions.

### Modified Capabilities

(none)

## Impact

- Affected code: src/App.js, src/App.css, src/App.test.js, src/index.js, src/setupTests.js, package.json (Jest moduleNameMapper for react-router v7); new files under src/auth/, src/layout/, src/pages/.
- `RotatingSphere` (src/RotatingSphere.js) moves from App root into the Home page; its sizing changes from full viewport to fill the content area below the navigation bar.
- Dependencies: adds react-router-dom; uses already-installed gsap and @gsap/react.
- No backend or API changes.
