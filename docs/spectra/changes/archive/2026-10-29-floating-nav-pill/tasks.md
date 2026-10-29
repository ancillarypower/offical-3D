## 1. Floating navigation

- [x] 1.1 Apply "Fixed-position header shrinks to a floating pill" for the "Top navigation bar reflects sign-in state" requirement: in src/App.css add `--nav-gap: 12px`, make `.AppLayout-header` a fixed, content-width pill at the top right (`top: var(--nav-gap)`, `right: 16px`, `z-index: 20`, rounded, 85%-opaque `--surface` background, thin border, `padding: 4px`, `backdrop-filter: blur(8px)`, no fixed height or bottom border), drop `.AppLayout-nav`'s full height and side padding, and remove the now-unneeded `margin-left: auto` on `.AppLayout-links`. Verify by browser measurement at 1280px wide on `/`: the header's top is 12px from the screen top, its right edge is 16px from the screen right, it is narrower than 600px, and the four items appear in order inside it.
- [x] 1.2 Apply "Narrow-screen menu panel uses a wrapping right-aligned row" placement change from "Narrow screens float the toggle top-left and the panel as an inset card" plus "Menu panel uses border-box so the open tween lands on its final height" for the "Navigation collapses on narrow screens" requirement: at 768px or less the header sits at `left: 16px; right: auto` without pill styling, the ☰ toggle carries the pill look with `border-radius: 12px`, the toggle is sized by `--nav-toggle-size: 40px` (`height` and `min-width`), and the panel is `position: fixed` at `top: calc(var(--nav-gap) + var(--nav-toggle-size) + 8px)`, `left: 16px`, `right: 16px`, rounded, fully bordered, `box-sizing: border-box`, keeping its wrapping right-aligned rows and `visibility: hidden` closed state. Verify by browser measurement: at 375px the toggle is 12px from the top and 16px from the left, the open panel's left and right edges are 16px from the screen sides, items form right-aligned rows (the user accepted two rows at 375px after measurement showed the inset card fits only three items); at 768px they form one right-aligned row; at 320px "Logout" wraps to a right-aligned second row; clicking "Home" in the open menu navigates and closes it; sampling the panel height during the open tween never exceeds its resting height. [after: 1.1]

## 2. Page space

- [x] 2.1 Apply "Pages fill the full screen height" for the "Home page shows the factory scene" and "Archimedes page shows the Archimedes scene" requirements: `.HomePage` and `.ArchimedesPage` use `height: 100vh; height: 100dvh;`, `.AppLayout-main` uses `min-height: 100vh; min-height: 100dvh;`, and `--nav-height` is deleted after no rule reads it (confirm with a search of src for `nav-height` returning nothing). Verify by browser measurement at 1280×800 and 375×667 on `/` and `/archimedes`: the scene's top is 0, its bottom equals the viewport height, and `document.scrollingElement.scrollHeight` equals the viewport height. [after: 1.2]
- [x] 2.2 Apply "Profile content clears the floating navigation" for the "Page content is not covered by the floating navigation" requirement: add `--nav-clearance: calc(var(--nav-gap) * 2 + var(--nav-toggle-size))` and give `.ProfilePage` `padding: calc(var(--nav-clearance) + 16px) 16px 32px`. Verify by browser measurement on `/profile` signed in as "amy" at 375px and 1280px: the "Profile" heading's top is greater than the bottom of the toggle or pill. [after: 2.1]
- [x] 2.3 Confirm the unchanged behaviour still holds: `CI=true npx react-scripts test --watchAll=false` passes with no test edits; `/login` renders no navigation in the browser; with `prefers-reduced-motion: reduce` emulated at 375px the menu opens and closes without a tween. Record the measured `--nav-toggle-size` and the pill height from tasks 1.1 to 2.2 in the apply report. [after: 2.2]

## Browser measurement record

Measured during apply on 2026-10-29 with headless Chromium driven over the DevTools protocol against the dev server, signed in as "amy". Values are CSS pixels.

| Check | 1280×800 | 768×800 | 375×667 | 320×568 |
| --- | --- | --- | --- | --- |
| Navigation box (left, top, right, bottom) | pill 913, 12, 1264, 56 (351 wide, 44 tall) | toggle 16, 12, 56, 52 | toggle 16, 12, 56, 52 | toggle 16, 12, 56, 52 |
| Open menu panel (left, right) and rows | n/a | 16, 752; one row | 16, 359; two rows, "Logout" on row 2 | 16, 304; two rows, "Logout" on row 2 |
| Panel height: last open-tween frame / resting (after the review fix below) | n/a | 50 / 50 | 88 / 88 | 88 / 88 |
| Item click in open menu | n/a | navigated, `aria-expanded="false"`, panel hidden | same | same |
| `/` and `/archimedes` scene top / bottom; page scroll height | 0 / 800; 800 | 0 / 800; 800 | 0 / 667; 667 | 0 / 568; 568 |
| `/profile` "Profile" heading top | 101 | 101 | 101 | 101 |

- Review fix: the panel first used a 1px `border`, so the tween (which targets `scrollHeight`, excluding borders) ended 2px short of the resting height (88 vs 90 at 375px). The outline is now an inset `box-shadow`, and the last tween frame was re-measured equal to the resting height at all three narrow widths.
- `/login` signed out: no `nav` element rendered.
- `prefers-reduced-motion: reduce` at 375px: the panel is at its full height from the first sampled frame (90px, measured before the review fix) (no tween).
- `CI=true npx react-scripts test --watchAll=false`: 4 suites, 101 tests passed, with no test edits.

