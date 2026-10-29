## Context

- `HomePage` (src/pages/HomePage.js) originally rendered only `<div class="HomePage"><FactoryScene /></div>`. `.HomePage` and `.ArchimedesPage` share `height: 100vh; height: 100dvh; overflow: hidden` in src/App.css (decision "Pages fill the full screen height", `floating-nav-pill`). The floating navigation reserves no height; `--nav-gap`, `--nav-toggle-size` and `--nav-clearance` describe it, and its pill look is `rgba(21, 26, 46, 0.85)` background, `backdrop-filter: blur(8px)` and a `1px solid rgba(255, 255, 255, 0.12)` border.
- `FactoryScene` (src/FactoryScene.js) is a single `useEffect([])` that builds the scene after the GLB loads. Inside it, `focusOn(building)` saves the overview pose on first use, hides labels and calls `fly()`; `returnToOverview()` hides labels and flies back. `fly()` re-reads its destination every frame, and the `ResizeObserver` keeps the camera in place while focused or flying, re-fitting only the saved overview pose (decision "Resize while focused keeps the focus framing", `focus-building-on-click`). The overview fit is `fitDistance(radius, camera.fov, camera.aspect)`. Clicks are filtered by `handlePointerDown/Up` and picked with `Raycaster.setFromCamera`.
- Names are `CSS2DObject` labels in a `CSS2DRenderer` layer with `pointer-events: none` (decision "Show names with CSS2DRenderer labels anchored above each building", `focus-building-on-click`).
- src/FactoryScene.test.js mocks `three`'s loader, controls and WebGL renderer but uses real `three` math, the real `CSS2DRenderer` and real GSAP.
- The project uses GSAP for state transitions inside `gsap.matchMedia()` gated on `(prefers-reduced-motion: no-preference)` (decision "GSAP transitions with useGSAP and matchMedia", `add-login-and-home-navigation`), while the 3D scene's own motion ignores reduced motion (decision "3D scene ignores reduced motion", `replace-home-sphere-with-factory-model`).
- Tasks 1.1 to 2.3 were implemented with the slogan in its own column. After seeing it, the user asked for the slogan to float over the scene like the navigation, and chose to shift the model clear of the card in the overview (option offered in discussion: "model moves right"). Tasks 3.1 to 3.5 move the implementation to that. The user then found the narrow-screen card (a band under the ☰) too high and its font too large; tasks 4.1 to 4.3 float it at the bottom-left over the scene with a smaller font and leave the model centred on narrow screens.

## Goals / Non-Goals

**Goals:**

- The factory scene always fills the whole Home page.
- Slogan in a floating card styled like the navigation: left and vertically centred on desktop, bottom-left with a smaller font on narrow screens.
- In the desktop overview the model is framed and centred in the part of the scene the card does not cover; on narrow screens it stays centred on the whole scene, with the card below it.
- Focus on a building: card fades out, model offset removed, building centred on the full page; return restores both. Reduced motion: card shows and hides at once.
- An obvious, clickable, keyboard-reachable marker on each clickable building.

**Non-Goals:**

- Changes to the Archimedes page, the navigation, labels, the flight path, or click/drag rules.
- Reduced motion inside the 3D scene, including the framing shift.
- More buildings, more Home text, or marker styling per building.

## Decisions

### FactoryScene reports focus through an onFocusChange prop held in a ref

`FactoryScene` takes an optional `onFocusChange(buildingId | null)` prop. The component stores it in a ref updated on every render, and the scene effect calls `onFocusChangeRef.current?.(id)` from `focusOn` (right before `fly`) and `onFocusChangeRef.current?.(null)` from `returnToOverview` (right before `fly`). Using a ref keeps the effect's dependency list empty, so a new callback never rebuilds the scene. Calls happen only where a flight actually starts, so ignored input produces no call. Alternative: a custom DOM event on the mount — rejected as harder to test and type than a prop.

### Clickable-building markers are buttons in the CSS2D label layer

For each building, a second `CSS2DObject` holds `<button type="button" class="FactoryScene-marker" aria-label="<building label>">` containing `<span class="FactoryScene-markerDot" aria-hidden="true">`. It is anchored at the same point as the name label (`centre.x, box.max.y + 1, centre.z`), appended to the label layer up front like the labels, and visible from load. The layer keeps `pointer-events: none`; each marker sets `pointer-events: auto` as an inline style (inline like the layer's own style, so it also holds where the stylesheet is not loaded, such as the jsdom tests), so only the marker itself captures input and drags elsewhere still reach the canvas. The marker's `click` handler applies the same rule as `handleClick`: ignore while `flight` is set or when the building is already focused, otherwise `focusOn(building)`. A native button gives Enter/Space activation and keyboard focus; hidden markers (`display: none`) drop out of the tab order. Visibility: `focusOn(building)` hides that building's marker and shows all others; `returnToOverview()` shows all markers at its start. Teardown removes the marker objects with the labels.

Look (src/App.css): `.FactoryScene-marker` is a 32px transparent round button with `cursor: pointer`; `.FactoryScene-markerDot` is a 16px circle in `--accent` (`#66ccff`) with a 2px white border and a soft shadow, centred; a `::after` ring around the dot scales from 1 to 2.4 and fades from 0.6 opacity to 0 over 1.6s, repeating. A white `:focus-visible` outline marks keyboard focus.

### Marker halo uses a CSS keyframe loop

The halo is a perpetual decorative loop with no state to bridge, so it is a CSS `@keyframes` animation rather than a GSAP tween; `@media (prefers-reduced-motion: reduce)` sets `animation: none` on it, leaving the dot and a static ring visible. This does not conflict with "GSAP transitions with useGSAP and matchMedia", which covers state transitions.

### HomePage holds focus state and renders the hero and scene columns

Superseded during apply by "Floating slogan card over a full-page scene". Implemented in tasks 2.1: `HomePage` kept `focusedId` in state and rendered a `.HomePage-hero` column (40% wide on desktop, a top band on narrow screens) beside a `.HomePage-scene` column, collapsing the hero while focused. Kept here so the completed task's history stays traceable.

### Home layout switch is a GSAP tween that bridges the CSS states

Superseded during apply by "Slogan card fades with a GSAP autoAlpha tween". Implemented in task 2.2: a `useGSAP` tweened the hero column's `flexBasis` or `height` over 0.6s. Two fixes made during that task carry over to the replacement: compare against the last layout bridged (a `shownFocused` ref) instead of skipping the first run, because React StrictMode re-runs effects on mount in development.

### Fly-in destination follows the container while the layout changes

When the `ResizeObserver` (or a covered-area change, below) refits during a fly-in to a building, the in-flight destination position is recomputed from the current camera aspect (`centre + FOCUS_DIRECTION × fitDistance(radius, fov, aspect) × FOCUS_MARGIN`), and `fly()`'s per-frame re-read carries the camera there. The camera is never moved by the refit itself, which keeps "Resize while focused keeps the focus framing" intact. With the floating card the scene no longer changes size on focus, but this still covers window resizes and rotations during a fly-in.

### Render right after a resize so the canvas never shows blank

Changing a WebGL canvas's size clears it, and the scene only redrew on the next animation frame, so every resize showed one empty frame. The column version (tasks 2.1, 2.2) resized the canvas on every frame of its 0.6s switch, which the user saw as the 3D disappearing during the camera flight (measured: canvas width 768 → 776 → 1266 → 1280 across the flight while scene and canvas opacity stayed 1). The `ResizeObserver` callback now calls `renderer.render(scene, camera)` and `labelRenderer.render(scene, camera)` right after updating sizes and the camera, so the resized canvas is drawn before the browser paints. The floating card removes the per-frame resize on focus entirely; this covers window resizes and rotations.

### Floating slogan card over a full-page scene

**Supersedes**: home-hero-split-layout / HomePage holds focus state and renders the hero and scene columns

`HomePage` keeps `focusedId` in state, passes `setFocusedId` as `onFocusChange`, and renders `.HomePage` (adds `is-focused` while a building is focused) containing `<div class="HomePage-scene"><FactoryScene onFocusChange={setFocusedId} coveredArea={…} /></div>` and `<section class="HomePage-card" aria-hidden="true" when focused><h1 class="HomePage-slogan">以 AI 驅動虛擬電廠引領臺灣能源轉型</h1></section>`.

CSS: `.HomePage` is `position: relative`; `.HomePage-scene` fills it (`height: 100%`). `.HomePage-card` is `position: absolute; z-index: 10; box-sizing: border-box` with the navigation's look (`background: rgba(21, 26, 46, 0.85)`, `backdrop-filter: blur(8px)`, `border: 1px solid rgba(255, 255, 255, 0.12)`, `border-radius: 16px`). Desktop (wider than 768px): `left: 48px; top: 50%; transform: translateY(-50%); width: min(calc(40vw - 48px), 520px); padding: 32px`, so its right edge is at most 40% of the viewport. Narrow (768px or less): originally `left: 16px; right: 16px; top: var(--nav-clearance)` (task 3.2); changed by task 4.1 after the user found it too high to `left: 16px; top: 50%; transform: translateY(-50%); width: auto; max-width: 60vw; padding: 12px 16px`; that covered the Office and its marker at 375×667 (measured in task 4.2), so task 4.3 moves it to the bottom-left: `top: auto; bottom: 10%; transform: none`, which puts it below the model's ground (ground bottom measured at y 459 of 667 and 391 of 568). Slogan type: `font-size: clamp(28px, 3.2vw, 48px)` on desktop and `clamp(16px, 4.8vw, 20px)` on narrow screens (task 4.1; first `clamp(22px, 6vw, 28px)`), `line-height: 1.3`, `font-weight: 700`, colour `--text`. Resting focused state: `.HomePage.is-focused .HomePage-card { visibility: hidden; opacity: 0; }`. The column rules from task 2.1 (`.HomePage` flex layout, `.HomePage-hero`, `.HomePage-heroInner`, their narrow-screen variants) are removed.

### Slogan card fades with a GSAP autoAlpha tween

**Supersedes**: home-hero-split-layout / Home layout switch is a GSAP tween that bridges the CSS states

A `useGSAP` keyed on the focused flag, guarded by the `shownFocused` ref, runs inside `gsap.matchMedia()` under `(prefers-reduced-motion: no-preference)` only: `gsap.fromTo(card, { autoAlpha: focused ? 1 : 0 }, { autoAlpha: focused ? 0 : 1, duration: 0.4, ease: 'power2.out', clearProps: 'opacity,visibility' })`. Reduced motion matches nothing, so the class change applies at once.

### HomePage measures the card to set the covered area

`HomePage` computes `coveredArea = { left, top }` from the card's bounding rectangle relative to `.HomePage`: on screens wider than 768px `left` is the card's right edge and `top` is 0; on narrow screens the covered area is `{ left: 0, top: 0 }` (task 4.1; task 3.2 first used the card's bottom edge as a top band), because the user accepted the card overlapping the model there. It measures in a layout effect after mount and on window `resize`, and passes `{ left: 0, top: 0 }` while a building is focused. The result is held in state so a change re-renders with the new prop. Alternative: a `ResizeObserver` on the card — rejected because the card only changes size with the viewport, and jsdom has no `ResizeObserver`.

### Covered area shifts the projection and fits the uncovered region

`FactoryScene` takes an optional `coveredArea` prop (`{ left, top }` in CSS pixels, default `{ left: 0, top: 0 }`), stored in a ref so the scene is not rebuilt. Inside the scene the current band is a mutable `inset` object:

- Framing: the overview fit uses the uncovered region, `w' = w − left`, `h' = h − top`: `fit = fitDistance(radius, fovU, w' / h')` where `fovU = 2 · atan(tan(fov / 2) · h' / h)` in degrees. This replaces `fitDistance(radius, camera.fov, camera.aspect)` in the initial framing and in the resize refit; `near`, `far`, `maxDistance` follow `fit` as today.
- Centring: `camera.setViewOffset(w, h, −left / 2, −top / 2, w, h)` moves the drawn image right by `left / 2` and down by `top / 2`, putting the view centre at the centre of the uncovered region; with both bands 0 the code calls `camera.clearViewOffset()`. The canvas, `aspect` and controls keep the full scene size. `Raycaster.setFromCamera` and `CSS2DRenderer` both use the camera's projection matrix, which includes the offset, so picking, markers and labels stay aligned.
- Change: when the prop changes after load, a GSAP tween moves `inset` to the new values over `FLIGHT_SECONDS` (1s) with `power2.inOut`; its `onUpdate` re-applies the offset and runs the same refit as the `ResizeObserver` (overview: rescale the camera distance; focused or flying: rescale the saved overview pose and re-aim a fly-in). The tween is not gated on reduced motion, following "3D scene ignores reduced motion". A prop present at load is applied without a tween.
- Focus framing (`aimAt`) keeps using the full-scene fov and aspect, since the host empties the band while a building is focused.

## Implementation Contract

**Behaviour once shipped:**

- `/` at 1280×800, overview: the scene canvas is 1280×800; the card `h1` "以 AI 驅動虛擬電廠引領臺灣能源轉型" floats at x = 48, vertically centred, right edge at most 512; the factory model's projected box lies right of the card's right edge and is centred in the remaining width; markers "Office" and "Guard House" visible with a pulsing halo.
- `/` at 375×667, overview: canvas 375×667; no view offset, model centred on the canvas; card at the bottom-left (`left: 16px; bottom: 10%`), at most 60% of the viewport wide, slogan 16–20px, its top edge below the model's ground and both markers.
- Clicking a building or its marker: `onFocusChange(id)` fires, the card gets `aria-hidden="true"` and fades out over 0.4s, the covered area becomes empty, and over 1s the camera flies to the building while the offset moves to none, ending with the building centred on the full canvas; that building's marker hides, the other stays.
- Esc or clicking a non-building point while focused: `onFocusChange(null)`, markers all show, the card fades in, the offset returns while the camera flies back to the overview.
- Only the card fades: the scene canvas keeps the viewport size and full opacity on every frame of a focus or return.
- Reduced motion: card shows and hides with no fade; halo static; camera flights and the offset shift unchanged.
- Archimedes page unchanged.

**Interfaces:** `FactoryScene({ onFocusChange?: (id: 'Office' | 'GuardHouse' | null) => void, coveredArea?: { left: number, top: number } })`. Classes: `HomePage-scene`, `HomePage-card`, `HomePage-slogan`, `is-focused`, `FactoryScene-marker`, `FactoryScene-markerDot`. Removed: `HomePage-hero`, `HomePage-heroInner`.

**Failure modes:** model fails to load → no markers and no focus; the card stays over the scene's error message. A covered area as large as the scene (`w' ≤ 0` or `h' ≤ 0`) → treated as no band (offset cleared), so the model is never framed into a zero-size region. `coveredArea` omitted → full-scene framing, as before.

**Acceptance criteria:**

- `CI=true npx react-scripts test --watchAll=false` passes, including: the existing tests from tasks 1.1 to 1.3; new src/FactoryScene.test.js tests for the covered area (view offset values for a left band and a top band; removing the band during a fly-in ends with the building centred on the whole scene; a resize from 768×800 to 1280×800 redraws at once; the overview fit uses the uncovered region; a click at the drawn Office position still picks the Office with a band; a band change tweens over 1s and ends with the expected offset; a band larger than the scene clears the offset); src/pages/HomePage.test.js (slogan heading present; hidden from the accessibility tree after a focus report and back after `null`; `coveredArea` passed to the scene is the card's right edge in the wide-screen overview, zero on narrow screens, and zero while focused, using a mocked card rectangle; the card fade starts only when motion is allowed); src/App.test.js (the signed-out Home route shows the slogan heading).
- Browser measurement (headless Chromium over the DevTools protocol, as in tasks 2.3) at 1280×800, 375×667 and 320×568: card rectangle; canvas rectangle equals the viewport in every state; the model's projected bounding box inside the uncovered region and centred within 5% of its width (desktop) in the overview; after clicking the "Office" marker and waiting 1.3s the card is hidden and the Office's projected box is centred on the canvas within 5% of the canvas width; after Esc the overview values return; with reduced motion emulated the card's opacity is 0 on the first frame after the click and the marker halo's `::after` has `animation-name: none`; on narrow screens the card's top edge is below the projected ground box and both markers.

**In scope:** src/FactoryScene.js (covered area), src/pages/HomePage.js, src/App.css (card, removal of column rules), the two test files.

**Out of scope:** src/ArchimedesScene.js, src/layout/AppLayout.js, routing, labels' look, building table, the camera flight path.

## Risks / Trade-offs

- [The card covers part of the sky and, while the view orbits, briefly part of the ground plane's corners] → The model's bounding sphere is fitted into the uncovered region, so the factory itself stays clear; only empty ground or sky passes under the card.
- [Shrinking the fit region makes the model smaller in the overview] → On desktop the uncovered region (about 720×800 at 1280×800) is close in size to the earlier 768×800 column, so the model is about as large as in the first version; the browser check records it.
- [A marker can pass under the card or the navigation while the view orbits] → Both sit above the label layer and stay clickable; the marker reappears as the view turns.
- [The covered area is measured from the card, so a font that wraps differently changes the narrow top band] → It is measured, not assumed, and re-measured on resize.
