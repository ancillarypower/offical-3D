## Summary

Right-align the navigation items on every screen width: on desktop they sit in one row at the right edge of the bar, and on narrow screens (768px or less) the opened menu shows them in a horizontal, right-aligned row that wraps when it runs out of width. The narrow-screen toggle button shows a ☰ icon instead of the word "Menu" while keeping "Menu" as its accessible name.

## Motivation

The current narrow-screen menu opens as a full-width vertical list with left-aligned text, and the desktop items sit on the left. The user asked for the menu content to be horizontal and right-aligned, and chose (option C in the preceding discussion) to apply the same right alignment on desktop so both layouts look consistent. The toggle reads "Menu" as text, which does not look like the hamburger menu the user expects.

## Proposed Solution

- Desktop (viewport wider than 768px): the navigation items stay in one row and move to the right edge of the bar.
- Narrow screens (768px or less): the toggle button stays at the left of the bar. The opened panel lays the items out in a row aligned to the right edge, wrapping onto further rows when they do not fit; wrapped rows are also right-aligned.
- The toggle button's visible content becomes a ☰ glyph hidden from assistive technology, and the button carries `aria-label="Menu"` so its accessible name stays "Menu".
- Everything else about the menu is unchanged: the toggle only appears at 768px or less, `aria-expanded` reflects state, activating an item closes the menu, the open/close GSAP height-and-opacity tween runs only under `prefers-reduced-motion: no-preference`, and reduced-motion users see the menu change state immediately.
- The `home-navigation` spec's "Navigation collapses on narrow screens" requirement gains the layout rules and scenarios above, and a desktop alignment rule is added to the "Top navigation bar reflects sign-in state" requirement.

## Non-Goals

- Moving the toggle button to the right side of the bar.
- Changing navigation item order, labels, colours, or the active-link styling.
- Changing the menu animation technique; the existing decision "GSAP transitions with useGSAP and matchMedia" (change `add-login-and-home-navigation`) stays in force because a wrapped horizontal row still has a measurable height to tween.

## Alternatives Considered

- Option A (narrow screens only): leaves desktop items on the left, so the two layouts disagree; the user rejected it.
- Option B (desktop only): does not touch the hamburger menu the user asked about; rejected.
- Keeping the "Menu" text label: rejected in favour of the ☰ icon the user expects from a hamburger menu; the accessible name is preserved so the spec wording "labelled Menu" still holds.

## Impact

- Affected specs: home-navigation
- Affected code:
  - Modified: src/layout/AppLayout.js, src/App.css, src/App.test.js
  - New: none
  - Removed: none
