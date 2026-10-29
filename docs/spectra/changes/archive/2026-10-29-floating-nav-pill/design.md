## Context

The navigation lives in `AppLayout` (src/layout/AppLayout.js): `<header class="AppLayout-header">` wraps `<nav class="AppLayout-nav">`, which holds the ☰ toggle (`.AppLayout-menuToggle`, shown only at 768px or less) and the item list `<ul id="main-nav-links" class="AppLayout-links">`. All of its layout is in src/App.css:

- `--nav-height: 56px` sets the header height, the narrow-screen panel's `top`, `.AppLayout-main`'s `min-height` and the Home/Archimedes page `height` (`calc(100dvh - var(--nav-height))` with a `vh` fallback, from the decision "Size Home with dvh and a vh fallback" in `fix-factory-scene-responsive-framing`).
- The header is a full-width strip with a bottom border; desktop items are pushed right with `margin-left: auto` (decision "Push the desktop item list right with an auto left margin", `right-align-horizontal-nav`).
- At 768px or less the list becomes an absolute panel (`top: var(--nav-height); left: 0; right: 0`) with wrapping right-aligned rows (decision "Narrow-screen menu panel uses a wrapping right-aligned row", `right-align-horizontal-nav`), closed with `visibility: hidden` and animated by GSAP height/opacity (decision "GSAP transitions with useGSAP and matchMedia", `add-login-and-home-navigation`).
- `.ProfilePage` has `padding: 32px 16px`. `/login` renders no navigation.

No test in src reads computed styles or `--nav-height` (checked with a search of the test files for `dvh`, `nav-height` and `App.css`), so jsdom tests cannot see this change; layout is verified in a real browser.

The user decided in discussion: the navigation is a content-sized floating pill that does not touch the top edge; desktop pill at the top right; narrow-screen ☰ stays at the top left; the navigation no longer reserves height, so the 3D pages fill the screen.

## Goals / Non-Goals

**Goals:**

- Desktop: floating, content-width pill at the top right with a gap from the top and right edges.
- Narrow: floating ☰ at the top left; the open menu is a floating card below it, inset from both sides, items in right-aligned wrapping rows.
- Navigation reserves no layout height; Home and Archimedes fill `100dvh` (fallback `100vh`).
- Profile content starts below the floating navigation.

**Non-Goals:**

- Home page split layout, full-screen building focus, building markers (separate follow-up change).
- Moving the narrow-screen toggle to the right.
- Changing item order, labels, colours, active-link styling, toggle accessible name, or the GSAP menu tween technique.

## Decisions

### Fixed-position header shrinks to a floating pill

`.AppLayout-header` becomes `position: fixed; top: var(--nav-gap); right: 16px; z-index: 20` with no width or height of its own, so it sizes to the nav. On desktop it carries the pill look: `border-radius: 999px`, `background: rgba(21, 26, 46, 0.85)` (the `--surface` colour at 85% opacity), `border: 1px solid rgba(255, 255, 255, 0.12)`, `padding: 4px`, and `backdrop-filter: blur(8px)`; the old bottom border and fixed height are removed. `.AppLayout-nav` drops its `height: 100%` and side padding. The `margin-left: auto` on `.AppLayout-links` from "Push the desktop item list right with an auto left margin" becomes unnecessary inside a content-width pill and is removed. A new token `--nav-gap: 12px` is the distance from the screen edge to the top of the navigation. Alternative: keep a full-width transparent header and float only the list — rejected because the transparent strip would still intercept clicks meant for the 3D scene.

### Narrow screens float the toggle top-left and the panel as an inset card

At 768px or less the header moves to `left: 16px; right: auto` and drops the pill background, border and padding, so only the toggle shows; the toggle itself gets the pill look (same background, border and blur, `border-radius: 12px`) so it stands out over the 3D scene. The item panel changes from `position: absolute; top: var(--nav-height); left: 0; right: 0` to `position: fixed; top: calc(var(--nav-gap) + var(--nav-toggle-size) + 8px); left: 16px; right: 16px` with `border-radius: 12px`, a 1px outline drawn as `box-shadow: inset 0 0 0 1px` instead of the old bottom border, and the same background. `--nav-toggle-size: 40px` sizes the toggle directly (`height` and `min-width` set to the token, `box-sizing: border-box`, horizontal padding only), so the token and the rendered toggle cannot drift apart; measured as 40×40px during apply. The rows, wrapping and right alignment from "Narrow-screen menu panel uses a wrapping right-aligned row" are unchanged.

### Menu panel uses border-box so the open tween lands on its final height

The GSAP tween animates the panel's `height` to `list.scrollHeight`, which includes padding; with the default `content-box` the panel was 16px taller during the tween and the items jumped at the end (found in the `right-align-horizontal-nav` review). The rebuilt panel sets `box-sizing: border-box` and draws its outline with an inset `box-shadow` rather than a `border`, because `scrollHeight` excludes borders; together these make the tween's end height equal the panel's resting height. The tween code in `AppLayout` is unchanged.

### Pages fill the full screen height

**Supersedes**: fix-factory-scene-responsive-framing / Size Home with dvh and a vh fallback

`.HomePage` and `.ArchimedesPage` use `height: 100vh; height: 100dvh;` and `.AppLayout-main` uses `min-height: 100vh; min-height: 100dvh;` — the same two-declaration `dvh`-with-`vh`-fallback pattern, without subtracting a navigation height, because the navigation now floats over the content. `--nav-height` is removed once nothing reads it.

### Profile content clears the floating navigation

A token `--nav-clearance: calc(var(--nav-gap) * 2 + var(--nav-toggle-size))` is the space a page leaves at its top. `.ProfilePage` uses `padding: calc(var(--nav-clearance) + 16px) 16px 32px`. The desktop pill (4px padding plus 34px items, measured as 34px tall in the `right-align-horizontal-nav` browser check, total about 44px) is close to the toggle height, so one clearance value serves both widths; measured during apply: pill 44px tall, Profile heading top at 101px.

## Implementation Contract

**Behaviour once shipped:**

- 1280px wide: the nav is a pill at the top right, `--nav-gap` (12px) from the top and 16px from the right, as wide as its four items; the 3D scene is visible behind and to the left of it, from the top of the screen to the bottom.
- 375px and 320px wide: only a floating ☰ at the top left (12px from the top, 16px from the left) is visible; opening it shows a card 16px in from both sides with right-aligned rows (two rows at 375px and 320px, accepted by the user after measurement; one row at 768px); clicking an item navigates and closes it.
- The open tween ends with no jump: the panel height at the last tween frame equals its resting height.
- Home and Archimedes: scene top at y = 0, bottom at the bottom of the visible screen, no page scroll.
- Profile: the "Profile" heading's top is below the bottom of the pill or toggle at 375px and 1280px.
- `/login` still has no navigation.

**Interfaces:** `AppLayout` markup, `NAV_ITEMS`, `#main-nav-links`, `aria-controls`, `aria-label="Menu"`, and the GSAP tween code are unchanged. CSS tokens change: `--nav-height` removed; `--nav-gap`, `--nav-toggle-size`, `--nav-clearance` added.

**Failure modes:** browsers without `backdrop-filter` show the 85%-opaque background without blur, which stays legible. Browsers without `dvh` use `vh`.

**Acceptance criteria:**

- `CI=true npx react-scripts test --watchAll=false` passes with no test changes.
- A browser measurement (headless Chromium driven over the DevTools protocol, as used for `right-align-horizontal-nav`) at 1280, 768, 375 and 320px wide confirms the positions above, the panel insets, the wrap at 320px, scene top at 0 and bottom at the viewport height on `/` and `/archimedes`, the Profile heading below the navigation, and no end-of-tween jump.

**In scope:** src/App.css navigation, page-height and Profile padding rules.

**Out of scope:** src/layout/AppLayout.js logic, FactoryScene and ArchimedesScene code, Login page, Home page text layout.

## Risks / Trade-offs

- [The floating pill covers part of the 3D scene, so a click on a building under the pill reaches the nav instead] → The pill is small and in a corner; the scene auto-orbits, so buildings pass out from under it. The follow-up Home change can offset the camera if needed.
- [The pill's 85%-opaque background over a bright sky could look heavy] → Values are recorded above so they can be tuned in one place after the user sees it.
- [jsdom cannot verify any of this] → The browser measurement in the acceptance criteria is the verification of record.
