## Context

The navigation bar lives in `AppLayout` (src/layout/AppLayout.js) and is styled in src/App.css. Today the `.AppLayout-nav` flex row places the item list on the left on desktop. At 768px or less a toggle button (text "Menu") appears, and the item list becomes an absolutely positioned panel under the bar with `flex-direction: column`, `align-items: stretch`, and full-width left-aligned items. The panel's open/close tween animates height and opacity with GSAP inside `gsap.matchMedia()` (decision "GSAP transitions with useGSAP and matchMedia", change `add-login-and-home-navigation`), measuring `scrollHeight` to know the open height. src/App.test.js reads the nav items by collecting every `a, button` inside the nav and filtering out the one whose text is "Menu", and finds the toggle with `getByRole('button', { name: 'Menu' })`.

The user chose option C in the preceding discussion: right-align the items on both desktop and narrow screens, make the narrow-screen menu horizontal, and show a ☰ icon on the toggle.

## Goals / Non-Goals

**Goals:**

- Desktop (wider than 768px): items in one row pushed to the right edge of the bar.
- Narrow (768px or less): toggle stays left; open panel shows items in right-aligned rows that wrap when needed.
- Toggle shows ☰ visually and keeps "Menu" as its accessible name.
- Keep the existing open/close tween, reduced-motion behaviour, and close-on-click behaviour.

**Non-Goals:**

- Moving the toggle to the right side of the bar.
- Changing item order, labels, colours, active-link styling, or the bar height (`--nav-height`).
- Replacing the GSAP menu tween with CSS transitions.

## Decisions

### Push the desktop item list right with an auto left margin

Give `.AppLayout-links` `margin-left: auto` inside the `.AppLayout-nav` flex row. This keeps the toggle (hidden on desktop, first child) on the left and the list on the right without changing the DOM order. Alternative: `justify-content: flex-end` on the nav — rejected because on narrow screens it would also push the toggle to the right, which the user did not ask for.

### Narrow-screen menu panel uses a wrapping right-aligned row

At 768px or less, `.AppLayout-links` keeps its absolute panel position but switches from `flex-direction: column; align-items: stretch` to `flex-direction: row; flex-wrap: wrap; justify-content: flex-end; align-items: center` with a small gap, and the items drop the `width: 100%; text-align: left` override. The auto margin from the desktop rule is neutralised for the absolute panel (it spans `left: 0; right: 0`, so the margin has no effect, but it is reset explicitly to avoid surprises). The GSAP tween is unchanged: `scrollHeight` of a wrapped row is still the panel's natural height, so the decision "GSAP transitions with useGSAP and matchMedia" stays in force.

### Hamburger icon with aria-label keeps the Menu name

The toggle button gets `aria-label="Menu"` and renders `<span aria-hidden="true">☰</span>` as its only content. Alternative: visually hidden "Menu" text next to the icon — rejected as more markup for the same accessible name. Because the button's `textContent` becomes "☰", the nav-order tests in src/App.test.js that filter by `text !== 'Menu'` must instead exclude the toggle element itself (for example by selecting only items inside the `#main-nav-links` list), otherwise "☰" would leak into the expected order.

## Implementation Contract

**Behaviour once shipped:**

- At a viewport wider than 768px, the four nav items sit in one row at the right edge of the bar, order unchanged.
- At 768px or less, the toggle at the left shows ☰; screen readers and `getByRole('button', { name: 'Menu' })` still find it as "Menu", and `aria-expanded` toggles as before.
- The open panel shows items in a row aligned to the right edge; at 320px width the items wrap onto a second row whose items are also right-aligned, all clickable.
- Clicking an item closes the menu; the open/close tween runs only under `(prefers-reduced-motion: no-preference) and (max-width: 768px)`; reduced-motion users get an immediate change.

**Interfaces:** `NAV_ITEMS`, `AppLayout` props, routes, and the `#main-nav-links` id with `aria-controls` stay the same. Only the toggle's content and attributes change.

**Failure modes:** none new; if the ☰ glyph is missing from the font the fallback glyph still shows and the accessible name is unaffected.

**Acceptance criteria:**

- `CI=true npm test -- --watchAll=false` passes, including: nav order tests (desktop order, signed-in and signed-out) that no longer depend on the toggle's text; a test that the toggle has accessible name "Menu", contains "☰", and does not show the text "Menu"; the existing open-and-use-menu test.
- Manual check in a browser at 1280px, 768px, 375px, and 320px widths confirms right alignment, wrapping at 320px, and the open/close animation.

**In scope:** src/layout/AppLayout.js (toggle markup), src/App.css (nav layout rules), src/App.test.js (nav tests).

**Out of scope:** page content, the factory and Archimedes scenes, auth logic, colours and theme tokens.

## Risks / Trade-offs

- [jsdom does not compute layout, so automated tests cannot prove right alignment or wrapping] → Cover alignment and wrapping with the manual browser check listed in the acceptance criteria; automated tests cover order, accessible name, and toggle behaviour.
- [A wrapped two-row panel is taller, so the open tween covers more distance] → Duration stays 0.25s; the extra height at 320px (one extra row, estimated about 40px from the 8px+12px item padding, to be confirmed in the manual check) does not warrant a duration change.
