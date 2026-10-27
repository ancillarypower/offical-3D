## Context

gsap-app is a Create React App project (react-scripts 5, React 19). `App` originally rendered only `RotatingSphere`, a three.js component sized to the full viewport (100vw × 100vh), with no router, auth, or navigation. gsap and @gsap/react are installed. The original `src/App.test.js` asserted the CRA "learn react" text, which the app no longer rendered.

CRA's bundled Jest 27 cannot resolve react-router v7's package `exports` and its jsdom lacks `TextEncoder` and `window.matchMedia`; the test setup therefore maps `react-router/dom` in package.json's `jest.moduleNameMapper` and polyfills those globals in src/setupTests.js (matchMedia reports no match, so GSAP animations are skipped in tests).

## Goals / Non-Goals

**Goals:**

- A mock login flow; Home is public, Profile requires sign-in.
- A top navigation bar whose last item depends on sign-in state (Log in / Logout), with active-link indication and a collapsible mobile menu.
- Home reuses `RotatingSphere`; Profile shows the username.
- GSAP page and menu transitions that honour reduced motion.
- Tests covering the spec scenarios that jsdom can exercise.

**Non-Goals:**

- Real authentication, password checking, tokens, or any backend/API call.
- Settings page or any page beyond Home and Profile (can be added later to the nav config).
- Persisting sign-in across browser tabs or restarts (sessionStorage only).
- Visual redesign of `RotatingSphere` itself.
- Remembering the page a visitor was redirected from (after sign-in the user always lands on `/`).

## Decisions

### Use react-router-dom for routing

Use `react-router-dom` (v7) with `BrowserRouter`, routes `/login`, `/`, `/profile`, and a catch-all. Alternative: a hand-rolled `useState` page switcher — rejected because it gives no real URLs, no back-button support, and makes redirects ad hoc. CRA's dev server already falls back to index.html, so BrowserRouter works in `npm start`.

### Mock auth via AuthContext with sessionStorage

An `AuthProvider` (src/auth/AuthContext.js) exposes `useAuth()` returning `{ user, login(username, password), logout() }`. `login` trims inputs, returns `false` when either is empty, otherwise sets `user` and writes `sessionStorage['gsap-app.user']`. Reads and writes are wrapped in try/catch so a blocked storage falls back to memory; a blank stored value is treated as signed out. Alternative: localStorage — rejected; sign-in should not outlive the tab for a mock.

### Route guards as wrapper components

`RequireAuth` redirects to `/login` when `user` is null; `RedirectIfAuthed` wraps `/login` and redirects to `/`. Both use `<Navigate replace>`, so guarded URLs do not pile up in history.

### Public Home with per-route guard

**Supersedes** the earlier placement of `RequireAuth` around the whole layout route (which made `/` and the catch-all sign-in only). The `AppLayout` route is now public; `RequireAuth` wraps only the `/profile` element, and the `*` catch-all redirects every visitor to `/`. Alternative: keep the layout guarded and add a second public layout for Home — rejected because it duplicates the nav bar and transitions.

### Single nav config drives the navigation bar

The nav bar renders from one array `NAV_ITEMS = [{ to: '/', label: 'Home' }, { to: '/profile', label: 'Profile' }]` using `NavLink` (which sets `aria-current="page"` automatically; Home uses `end`), followed by one auth item: a "Log in" `NavLink` to `/login` when signed out, or a "Logout" button when signed in. Profile stays visible when signed out; following it hits the guard. Logout calls `logout()` and navigates to `/` (**supersedes** the earlier navigate-to-`/login`). Adding a page later means adding one entry and one route.

### GSAP transitions with useGSAP and matchMedia

The layout's `<main>` is keyed by `location.pathname`; `useGSAP` animates it from `{ autoAlpha: 0, y: 16 }` over 0.35s. The mobile menu animates height/opacity; its closed state on narrow screens uses `visibility: hidden` (not `display: none`) so the close tween is visible, and hidden items stay unclickable and unfocusable. Both run inside `gsap.matchMedia()` under `(prefers-reduced-motion: no-preference)` (the menu additionally under `(max-width: 768px)`), so reduced-motion users get no tween. Alternative: CSS transitions — rejected because the project already depends on GSAP and this is the intended showcase.

### RotatingSphere fills its container

Change `RotatingSphere`'s mount sizing from `100vw/100vh` to `100%` width and height, with the Home page giving it `height: calc(100vh - var(--nav-height))`. The existing cleanup (dispose + removeChild) already handles unmount when leaving Home.

## Implementation Contract

**Behavior:** Anyone can open `/` and sees the nav bar and sphere. Signed-out nav: Home, Profile, Log in; signed-in nav: Home, Profile, Logout. Signed-out visitors opening `/profile` go to `/login`. Valid sign-in → `/`. Profile shows the username. Logout → `/`, session cleared, nav shows "Log in". Unknown paths → `/` for everyone. ≤768px viewport → "Menu" toggle. Route changes fade/slide in unless reduced motion.

**Interface / data shape:**
- `useAuth(): { user: string | null, login(username: string, password: string): boolean, logout(): void }`
- Storage key `gsap-app.user` in sessionStorage, value is the trimmed username string.
- Routes: `/login` (public, redirects to `/` if signed in), `/` (public), `/profile` (guarded), `*` → `/`.
- Login error text: "Please enter username and password".

**Failure modes:** sessionStorage throwing → silent fallback to in-memory state. WebGL unavailable in tests → `RotatingSphere` is mocked in Jest; at runtime its behaviour is unchanged from today.

**Acceptance criteria:**
- `CI=true npm test` passes with tests for: valid/invalid sign-in, signed-out visitor sees Home with "Log in", guard redirect from `/profile`, signed-in `/login` redirect, logout to `/` with "Log in" shown, `aria-current` on active link, Profile username, unknown route fallback (signed in and signed out), mobile menu `aria-expanded` toggling.
- `npm run build` succeeds.
- Manual check in `npm start`: signed-out visitor sees the sphere on Home below the nav bar; refresh on `/profile` keeps sign-in; narrow window shows "Menu"; page transitions animate, and do not when OS reduced-motion is on.

**Scope boundaries:** In scope — auth context, guards, layout/nav, Home and Profile pages, sphere sizing, GSAP transitions, tests, react-router-dom dependency and its Jest setup. Out of scope — backend, Settings page, theming, changes to the sphere's visuals, return-to-previous-page after sign-in.

## Risks / Trade-offs

- [three.js WebGLRenderer cannot run in jsdom] → mock `RotatingSphere` in tests; verify the sphere manually.
- [Mock login could be mistaken for real security] → login page shows a small "Demo login — any username and password" hint, and design/proposal state it is front-end only.
- [Public Home renders WebGL for every visitor, including before sign-in] → acceptable; it was already the app's only page before this change.
