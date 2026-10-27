## 1. Routing and test setup

- [x] 1.1 Use react-router-dom for routing: install react-router-dom, wrap `App` in `BrowserRouter` (src/index.js), and replace the stale "learn react" test in src/App.test.js with a test that renders the app in a `MemoryRouter` with `RotatingSphere` mocked via `jest.mock`. Verify: `CI=true npm test` passes and `npm run build` succeeds.

## 2. Mock authentication

- [x] 2.1 [after: 1.1] Mock auth via AuthContext with sessionStorage: add `AuthProvider` and `useAuth()` (src/auth/AuthContext.js) returning `{ user, login, logout }`, where `login` trims inputs, returns `false` on empty fields, and writes `gsap-app.user`; storage errors fall back to memory, so the session persists for the browser tab. Verify: unit tests in src/auth/AuthContext.test.js cover the credential validation example table, restore-from-sessionStorage on mount, and a throwing `sessionStorage` stub.
- [x] 2.2 [after: 2.1] Login page accepts non-empty credentials: add the `/login` page (src/pages/LoginPage.js) with username, password, "Log in" button, the "Demo login — any username and password" hint, and the "Please enter username and password" error; success navigates to `/`. Verify: tests "signs in with valid credentials" and "shows error for missing field".
- [x] 2.3 [after: 2.2] Route guards as wrapper components: add `RequireAuth` and `RedirectIfAuthed` (src/auth/guards.js) so post-login pages require sign-in and a signed-in user on `/login` goes to `/`. Verify: tests "redirects anonymous visitor from /profile to /login" and "redirects signed-in user from /login to /".

## 3. Layout and pages

- [x] 3.1 [after: 2.3] Single nav config drives the navigation bar: add `AppLayout` (src/layout/AppLayout.js) with `NAV_ITEMS` rendering a top navigation bar on post-login pages (Home, Profile, then a Logout button) via `NavLink`, so the active page is indicated with `aria-current="page"`; the bar is absent on `/login`. Verify: tests "nav shows Home, Profile, Logout in order", "no nav on /login", and "Profile link has aria-current on /profile".
- [x] 3.2 [after: 3.1] Logout ends the session: the Logout button calls `logout()` and navigates to `/login`. Verify: test "logout returns to login and / then redirects to /login".
- [x] 3.3 [after: 3.1] RotatingSphere fills its container: change the `RotatingSphere` mount from viewport units to 100% of its parent, and add the Home page (src/pages/HomePage.js) so the Home page shows the rotating sphere below the navigation bar. Verify: test "sphere present on Home and absent on Profile" (with the mock), plus manual check in `npm start` that the canvas sits below the nav bar and resizes with the window.
- [x] 3.4 [after: 3.1] Profile page shows the signed-in user: add src/pages/ProfilePage.js displaying `user`. Verify: test "profile shows username amy".
- [x] 3.5 [after: 3.1] Unknown routes fall back to Home: add a `*` route redirecting to `/`. Verify: test "unknown path redirects to /".

## 4. Responsive menu and animation

- [x] 4.1 [after: 3.1] Navigation collapses on narrow screens: at ≤768px (CSS media query in src/App.css) hide the links behind a "Menu" toggle with `aria-expanded`, and close the menu when a link is activated. Verify: test "menu toggles aria-expanded and closes after clicking Profile", plus manual check at 375px width in browser devtools.
- [x] 4.2 [after: 4.1] GSAP transitions with useGSAP and matchMedia: animate `<main>` (keyed by pathname) from `autoAlpha: 0, y: 16` and the mobile menu open/close, only under `(prefers-reduced-motion: no-preference)`, so page transitions are animated with reduced-motion support. Verify: manual check in `npm start` that route changes fade/slide in, and with OS reduced-motion enabled content appears instantly; `CI=true npm test` still passes.

## 5. Public Home (requirement change)

> Change note (2026-10-27): Home (`/`) became public. This supersedes the guarded `/` and guarded catch-all delivered by completed tasks 2.3 ("Route guards as wrapper components") and 3.5 ("Unknown routes fall back to Home"), the always-"Logout" nav delivered by 3.1 ("Single nav config drives the navigation bar"), and the logout-to-`/login` destination delivered by 3.2 ("Logout ends the session"). Those tasks stay checked as history; 5.1 and 5.2 migrate their behavior. See design.md "Public Home with per-route guard".

- [x] 5.1 [after: 3.5] Public Home with per-route guard: make the `AppLayout` route public and wrap only the `/profile` element in `RequireAuth`, so Profile page requires sign-in while the Home page shows the rotating sphere to signed-out visitors and unknown routes fall back to Home for every visitor. Verify: tests "signed-out visitor sees Home with sphere", "redirects anonymous visitor from /profile to /login", "redirects signed-in user from /login to /", "unknown path redirects to /" and "unknown path redirects to / when signed out" pass; the superseded test "redirects anonymous visitor from / to /login" is removed.
- [x] 5.2 [after: 5.1] Top navigation bar reflects sign-in state: after `NAV_ITEMS`, render a "Log in" `NavLink` to `/login` when signed out or the "Logout" button when signed in; Logout calls `logout()` and navigates to `/`. Verify: tests "nav for signed-out visitor shows Home, Profile, Log in", "nav shows Home, Profile, Logout in order", and "logout returns to Home with Log in shown and /profile then redirects to /login" (replacing "logout returns to login and / then redirects to /login") pass.

## 6. Final check

- [x] 6.1 [after: 3.3, 3.4, 4.2, 5.2] Run the full acceptance pass from design.md's Implementation Contract. Verify: `CI=true npm test` and `npm run build` both succeed, and the manual checklist (signed-out visitor sees the sphere on Home below the nav bar, refresh on /profile keeps sign-in, Menu at narrow width, reduced motion) is confirmed.
