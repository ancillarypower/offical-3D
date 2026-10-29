## Summary

Turn the full-width top navigation bar into a floating pill that is only as wide as its items and sits a small distance away from the top of the screen. On desktop the pill floats at the top right; on narrow screens (768px or less) a floating ☰ button sits at the top left and opens a floating menu card. The navigation no longer takes layout height, so the Home and Archimedes 3D scenes fill the whole visible screen.

## Motivation

The user does not want the navigation to span the full width or stick to the top edge; it should size to its content and float. This is also the first step towards the planned Home layout (text on the left, 3D scene on the right, scene going full-screen when a building is clicked): a floating navigation lets the 3D scene use the whole screen while every page stays reachable.

## Proposed Solution

- Desktop (wider than 768px): the navigation renders as a rounded pill with a dark, slightly translucent background and a thin border, fixed near the top-right corner with a gap from the top and right edges. Its width follows its items; item order, colours and the active-page styling stay the same.
- Narrow screens (768px or less): a floating ☰ toggle button fixed near the top-left corner (the user chose to keep it on the left). Opening it shows a floating card below the toggle, inset from both screen edges, with the items in right-aligned rows that wrap when needed, as today.
- The navigation floats over page content and reserves no height. The Home and Archimedes pages fill the full visible screen height (`100dvh`, falling back to `100vh`), and `<main>` no longer subtracts a navigation height.
- The Profile page gets enough top padding that its heading is not covered by the floating navigation.
- Unchanged: sign-in-dependent items and their order, `aria-current`, the toggle's accessible name "Menu" and `aria-expanded`, closing the menu after choosing an item, the open/close animation with reduced-motion support, no navigation on `/login`.

## Non-Goals

- The Home page text-and-scene split layout, full-screen building focus, and clickable building markers; these follow in a separate change.
- Moving the narrow-screen toggle to the right.
- Hiding or auto-hiding the navigation on scroll.

## Alternatives Considered

- Keep the bar reserving its height and only shrink it to a pill: rejected because the page background would show in the empty strip beside the pill and the 3D scenes could not use the full screen.
- Toggle at the top right on narrow screens: offered in discussion; the user chose the left.

## Impact

- Affected specs: home-navigation
- Affected code:
  - Modified: src/App.css (layout only; no test reads computed styles, so src/App.test.js and src/layout/AppLayout.js are expected to stay unchanged)
  - New: none
  - Removed: none
