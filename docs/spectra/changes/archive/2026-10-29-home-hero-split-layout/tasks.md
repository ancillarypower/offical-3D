## 1. Factory scene

- [x] 1.1 Implement "FactoryScene reports focus through an onFocusChange prop held in a ref" for the "Factory scene reports building focus to its host" requirement: `FactoryScene` accepts an optional `onFocusChange` prop, keeps it in a ref, and calls it with the building id right before the fly-in starts and with `null` right before the fly-back starts, never for ignored input. Verify with new tests in src/FactoryScene.test.js that render `<FactoryScene onFocusChange={spy} />` via the existing `loadSite`-style setup and assert the call sequences from the spec's "listener calls" example table (click Office → [`Office`]; Office then Guard House → [`Office`, `GuardHouse`]; Office, finish, Esc → [`Office`, `null`]; Esc during fly-in → [`Office`]; Esc in overview → []), plus a test that re-rendering with a new spy routes later calls to the new spy without creating a second renderer.
- [x] 1.2 Implement "Clickable-building markers are buttons in the CSS2D label layer" and "Marker halo uses a CSS keyframe loop" for the "Clickable buildings show a marker" requirement: one `button.FactoryScene-marker` per present building with `aria-label` "Office" / "Guard House", anchored at the label point, `pointer-events: auto` while the layer stays `none`; clicking or pressing Enter on it behaves like clicking the building; visibility follows the spec's "marker visibility by state" table; the dot, halo keyframes, focus ring and reduced-motion `animation: none` are added to src/App.css. Verify with new tests in src/FactoryScene.test.js: two markers with those names visible after load; after clicking the "Guard House" marker the camera matches `expectFocusedOn(guardHouse)` after `finishFlight()` and only the "Office" marker is visible; Enter (native button activation via `userEvent.type(marker, '{enter}')` or a dispatched click on the focused button) on the "Office" marker switches focus; Esc shows both markers; a marker click during a flight leaves the flight's destination unchanged; a model without building nodes has no markers; the marker's computed `pointer-events` is `auto` and its layer's is `none`. [after: 1.1]
- [x] 1.3 Implement "Fly-in destination follows the container while the layout changes": when the `ResizeObserver` fires during a fly-in to a building, the in-flight destination position is recomputed from the new aspect while the camera itself is not moved by the observer; resizes after arrival still leave the camera in place. Verify with a new test in src/FactoryScene.test.js: start a fly-in to the Office at 768×800, resize the mount to 1280×800 and call `trigger()`, `finishFlight()`, then `expectFocusedOn(office)` holds for the 1280×800 aspect; and the existing "Resize while focused" tests still pass. [after: 1.2]

## 2. Home page

- [x] 2.1 Implement "HomePage holds focus state and renders the hero and scene columns" for the "Home page shows the factory scene" requirement: `HomePage` renders the hero with the `h1` "以 AI 驅動虛擬電廠，引領臺灣能源轉型。" and the scene column, passes `setFocusedId` to `FactoryScene`, sets `is-focused` and `aria-hidden="true"` on the hero while focused, and src/App.css gains the desktop row / narrow column resting states and the focused states. Verify with new src/pages/HomePage.test.js (mocking `../FactoryScene` with a component that exposes buttons calling `onFocusChange('Office')` and `onFocusChange(null)`): the heading is found by role and name initially, is not found by role after the Office report, and is found again after the `null` report; and the existing src/App.test.js Home tests still pass. [after: 1.3]
- [x] 2.2 Implement "Home layout switch is a GSAP tween that bridges the CSS states": a `useGSAP` keyed on the focused flag, skipping the first mount, tweens the hero's `flexBasis` (wider than 768px) or `height` (768px or less) together with `autoAlpha` over 0.6s inside `gsap.matchMedia()` gated on `(prefers-reduced-motion: no-preference)`, clearing its inline props at the end. Verify by browser measurement at 1280×800: sampled hero widths during the switch decrease monotonically from about 512px to 0 within 0.7s, and the scene rect equals the viewport afterwards; at 375×667 the hero height goes from its natural height to 0; with `prefers-reduced-motion: reduce` emulated the hero is at its final size on the first sampled frame. [after: 2.1]
- [x] 2.3 Confirm the whole flow in the browser and the test suite: `CI=true npx react-scripts test --watchAll=false` passes; at 1280×800 and 375×667 record the overview hero and scene rectangles, the two marker elements visible, the rectangles after clicking the "Office" marker and waiting 1.1s (scene equals the viewport, hero hidden), the Office's projected bounding box inside the canvas after the fly-in at 375×667, and the rectangles after Esc (split restored); `/archimedes` shows no slogan and no markers. Append the numbers as a measurement record in this file. [after: 2.2]

## 3. Floating slogan card (requirement change after 2.3)

- [x] 3.1 Implement "Covered area shifts the projection and fits the uncovered region" for the "Factory scene keeps the model clear of a covered area" requirement: `FactoryScene` accepts an optional `coveredArea` `{ left, top }` prop held in a ref; the overview fit uses the uncovered region, `camera.setViewOffset(w, h, -left / 2, -top / 2, w, h)` centres it (cleared when both are 0 or the band fills the scene), a prop change tweens the band over 1s and runs the same refit as the `ResizeObserver`, and a prop present at load applies without a tween. Verify with new tests in src/FactoryScene.test.js: with `coveredArea={{ left: 560, top: 0 }}` at 1280×800 the camera's `view` has `offsetX` -280 and the projected model box lies within x 560..1280; with a 170px top band at 375×667 `offsetY` is -85 and a click at the Office's drawn position (projected with the offset camera) focuses the Office; rerendering from a 560px band to none and finishing the tween leaves `camera.view` disabled or zero-offset and the scene not rebuilt (one renderer); a band of 2000px clears the offset. [after: 1.3]
- [x] 3.2 Implement "Floating slogan card over a full-page scene" and "HomePage measures the card to set the covered area" for the "Home page shows the factory scene" requirement, replacing the column layout from task 2.1: `HomePage` renders the scene full-page and the `h1` in a `.HomePage-card` that gets `aria-hidden="true"` while focused; it passes `coveredArea` from the card's rectangle (right edge on desktop, bottom edge on narrow screens) in the overview and `{ left: 0, top: 0 }` while focused; src/App.css gains the card rules and loses the `.HomePage-hero` / `.HomePage-heroInner` column rules (a search of src for `HomePage-hero` returns nothing). Verify with src/pages/HomePage.test.js updated so the mocked `FactoryScene` records its `coveredArea` prop and the card's `getBoundingClientRect` is stubbed (right 512, bottom 500, with a wide `matchMedia`): the heading is present initially, `coveredArea.left` is 512; after the Office report the heading is not found by role and `coveredArea` is `{ left: 0, top: 0 }`; after the `null` report both return; and the existing src/App.test.js Home tests pass. [after: 3.1]
- [x] 3.3 Implement "Slogan card fades with a GSAP autoAlpha tween", replacing the column tween from task 2.2: the `useGSAP` keyed on the focused flag (still guarded by the `shownFocused` ref) fades the card's `autoAlpha` over 0.4s under `(prefers-reduced-motion: no-preference)` only and clears its inline props; the `flexBasis` / `height` tween is removed. Verify by browser measurement at 1280×800: sampled card opacity after clicking the "Office" marker falls from 1 to 0 over several frames and the card's `visibility` is `hidden` afterwards; with `prefers-reduced-motion: reduce` emulated the card's opacity is 0 on the first frame after the click. [after: 3.2]
- [x] 3.5 Implement "Render right after a resize so the canvas never shows blank" for the "Factory scene redraws immediately after a resize" requirement: the `ResizeObserver` callback in `FactoryScene` draws the WebGL scene and the label layer right after it updates the renderer size and the camera. Verify with a new test in src/FactoryScene.test.js: after load, with `requestAnimationFrame` captured so no frame runs, resizing the mount from 768×800 to 1280×800 and calling `trigger()` makes the renderer's `render` run once more within that call. [after: 3.1]
- [x] 3.4 Confirm the whole flow in the browser and the test suite: `CI=true npx react-scripts test --watchAll=false` passes; at 1280×800 and 375×667 record the card rectangle, the canvas rectangle (equal to the viewport in every state), the model's projected bounding box against the uncovered region in the overview (inside it; on desktop centred within 5% of its width), after clicking the "Office" marker and waiting 1.3s the card hidden and the Office's projected box centred on the canvas within 5% of the canvas width, and after Esc the overview values back; `/archimedes` shows no slogan and no markers. Also sample every frame of the focus at 1280×800 and record that the canvas stays 1280×800 with opacity 1 while only the card's opacity changes. Append the numbers as a new measurement record below the superseded one. [after: 3.3, 3.5]

## 4. Narrow-screen card beside the model (requirement change after 3.4)

- [x] 4.1 Move the narrow-screen card per "Floating slogan card over a full-page scene" and "HomePage measures the card to set the covered area" (updated): at 768px or less `.HomePage-card` floats at `left: 16px`, vertically centred (`top: 50%; transform: translateY(-50%)`), `width: auto; max-width: 60vw; padding: 12px 16px`, slogan `font-size: clamp(16px, 4.8vw, 20px)`; `HomePage` sends `{ left: 0, top: 0 }` as the covered area on narrow screens. Verify with src/pages/HomePage.test.js: the narrow-screen test now expects `coveredArea` `{ left: 0, top: 0 }`; the full suite passes with `CI=true npx react-scripts test --watchAll=false`. [after: 3.4]
- [x] 4.2 Measure the narrow layout in the browser at 375×667 and 320×568: card left edge 16px, card vertical centre within 2px of the viewport centre, card width at most 60% of the viewport, slogan font-size smaller than at 1280×800, camera view offset 0 and model centre at the canvas centre in the overview; the 1280×800 values from the floating-card record are unchanged. Append the numbers to a new record. [after: 4.1]
- [x] 4.3 Move the narrow-screen card to the bottom-left so it covers no building or marker: at 768px or less `.HomePage-card` uses `top: auto; bottom: 10%; transform: none`, keeping `left: 16px`, `max-width: 60vw`, the padding and the smaller font. Verify by browser measurement at 375×667 and 320×568: the card's top edge is below the projected ground box's bottom edge and below both markers' bottom edges, the card's left edge is 16px and its bottom edge is above the viewport bottom; the full test suite passes. Append the numbers to the task 4.2 record. [after: 4.2]

## Change note: slogan moved from a column to a floating card

After tasks 1.1 to 2.3 were done, the user asked that the slogan float over the scene like the navigation instead of taking a column, and chose to shift the model clear of the card. Completed tasks stay as recorded:

- 2.1 (column layout, decision "HomePage holds focus state and renders the hero and scene columns") is superseded by 3.2 ("Floating slogan card over a full-page scene"); 3.2 removes its column CSS.
- 2.2 (column tween, decision "Home layout switch is a GSAP tween that bridges the CSS states") is superseded by 3.3 ("Slogan card fades with a GSAP autoAlpha tween"); its `shownFocused` guard carries over.
- 2.3's measurement record below describes the column layout and is kept as history; 3.4 records the floating-card layout.
- 1.1, 1.2 and 1.3 stay in force unchanged.
- After 3.4 the user removed the punctuation from the slogan in src/pages/HomePage.js and confirmed it; the slogan is now 「以 AI 驅動虛擬電廠引領臺灣能源轉型」 in the specs, design and tests (records above quote the text in use at the time).
- After 3.4 the user found the narrow-screen card too high (a band under the ☰) and its font too large, and asked for it to float at the left over the scene, overlap allowed. 4.1 changes the narrow card and empties the narrow covered area; the narrow rows of the floating-card record describe the earlier top band.
- The user then reported the 3D disappearing during the camera flight in the column version; measurement showed the canvas being resized on every frame of the switch (each resize clears a WebGL canvas until the next frame). 3.2/3.3 remove that resize on focus, and 3.5 redraws right after any resize.

## Browser measurement record (column layout, superseded)

Measured during apply on 2026-10-29 with headless Chromium (SwiftShader WebGL) driven over the DevTools protocol against the dev server, signed out, real `factory0.glb`. Rectangles are `[left, top, right, bottom]` in CSS pixels.

| Check | 1280×800 | 375×667 |
| --- | --- | --- |
| Overview hero | `[0, 0, 512, 800]` | `[0, 0, 375, 153]` (below the ☰ toggle at `[16, 12, 56, 52]`; slogan at `[16, 64, 359, 137]`) |
| Overview scene | `[512, 0, 1280, 800]` | `[0, 153, 375, 667]` |
| Markers in the overview | "Office" and "Guard House" both displayed, `pointer-events: auto` | same |
| Hero size sampled after clicking the "Office" marker | width 512 → 501 → 56 → … → 0, monotonic | height 153 → 152 → 61 → … → 0, monotonic |
| After the fly-in (1.3s) | hero `[0, 0, 0, 800]`, `aria-hidden="true"`, `visibility: hidden`; scene `[0, 0, 1280, 800]`; "Office" marker hidden, "Guard House" displayed | hero height 0, `aria-hidden="true"`; scene `[0, 0, 375, 667]`; same marker state |
| Office projected bounding box in the canvas | `[369, 176, 857, 697]` inside 1280×800 | `[64, 217, 296, 471]` inside 375×667 |
| Hero size sampled after Esc | width 0 → 6 → 509 → 512, monotonic | height 0 → 1 → 17 → … → 153, monotonic |
| After Esc | hero `[0, 0, 512, 800]`, scene `[512, 0, 1280, 800]`, both markers displayed | hero `[0, 0, 375, 153]`, scene `[0, 153, 375, 667]`, both markers displayed |
| `prefers-reduced-motion: reduce` | hero 512 → 0 on the first frame after the click, 0 → 512 on the first frame after Esc | 153 → 0 and 0 → 153 on the first frame |

- Page scroll height equals the viewport height in every state.
- `/archimedes`: no slogan, no `h1`, no markers.
- Two defects found by this measurement and fixed before it was recorded: in development, React StrictMode re-ran the layout effect on mount and played the split tween (the effect now compares against the last layout it bridged instead of skipping the first run); and on narrow screens the desktop `flex-basis: 0` focused rule overrode the animated height (the narrow focused rule resets `flex-basis: auto`).
- `CI=true npx react-scripts test --watchAll=false`: 5 suites, 119 tests passed.

## Browser measurement record (floating card)

Measured during apply on 2026-10-29 with headless Chromium (SwiftShader WebGL) driven over the DevTools protocol against the dev server, signed out, real `factory0.glb`. Rectangles are `[left, top, right, bottom]` in CSS pixels. "Model centre" is the projection of the orbit target (the model's bounding-box centre); "ground box" is the projected `Ground` node bounds, the model's footprint.

| Check | 1280×800 | 375×667 |
| --- | --- | --- |
| Card | `[48, 314, 512, 486]` | `[16, 64, 359, 157]` (below the ☰ toggle) |
| Covered area sent to the scene / camera view offset | left 512 / `offsetX -256` | top 157 / `offsetY -78.5` |
| Canvas in every state | `[0, 0, 1280, 800]` | `[0, 0, 375, 667]` |
| Overview model centre vs uncovered-region centre | 896 vs (512 + 1280) / 2 = 896 | y 412 vs (157 + 667) / 2 = 412 |
| Overview ground box | `[564, 350, 1229, 685]`, right of the card | `[16, 384, 360, 537]`, below the card |
| Every frame of the focus (1.3s after clicking the "Office" marker) | canvas 1280×800, canvas and scene opacity 1; card opacity 1.00 → 0.40 → 0.11 → 0.02 → 0 | canvas 375×667, opacity 1; card 1.00 → 0.63 → 0.24 → 0.09 → 0 |
| Focused | card `aria-hidden="true"`, `visibility: hidden`; view offset 0; Office box `[369, 176, 857, 697]`, centre x 613 vs canvas centre 640 (27px, 2.1% of width); "Office" marker hidden, "Guard House" shown | card hidden; offset 0; Office box `[64, 217, 296, 471]`, centre x 180 vs 187.5 (7.5px, 2%); same markers |
| Every frame of the return after Esc | canvas unchanged, opacity 1; card 0 → 0.71 → 0.96 → 1 | canvas unchanged, opacity 1; card 0 → 0.43 → … → 1 |
| After Esc | same as the overview row values (offset -256, model centre 896, both markers shown) | same as overview (offset -78.5, model centre y 412) |
| `prefers-reduced-motion: reduce` | card opacity 1 → 0 on the first frame after the click, 0 → 1 on the first frame after Esc; canvas unchanged | same |

- Page scroll height equals the viewport height in every state.
- `/archimedes`: no card, no markers.
- `CI=true npx react-scripts test --watchAll=false`: 5 suites, 127 tests passed.

## Browser measurement record (narrow card at the left, task 4.2)

Same setup as the floating-card record.

| Check | 375×667 | 320×568 | 1280×800 (unchanged check) |
| --- | --- | --- | --- |
| Card | `[16, 297, 241, 370]` | `[16, 250, 208, 318]` | `[48, 314, 512, 486]` |
| Card vertical centre vs viewport centre | 334 vs 333.5 | 284 vs 284 | 400 vs 400 |
| Card width / viewport width | 60% (225px) | 60% (192px) | 36% |
| Slogan font-size | 18px | 16px | 40.96px |
| View offset; model centre vs canvas centre | 0; `[187, 333]` vs `[187.5, 333.5]` | 0; `[160, 284]` vs `[160, 284]` | -256; 896 (unchanged) |
| Focus / return | canvas 375×667, opacity 1 every frame; card fades out and back | canvas 320×568, opacity 1 every frame; same | unchanged from the floating-card record |

- Observed: at 375×667 the card overlaps the Office and its marker (marker centre about `[145, 347]`, inside the card), so in the narrow overview the Office marker is covered; the Guard House marker stays uncovered. The user chose to move the card to the bottom-left (task 4.3).
- `CI=true npx react-scripts test --watchAll=false`: 5 suites, 127 tests passed.

### Task 4.3: card at the bottom-left

| Check | 375×667 | 320×568 |
| --- | --- | --- |
| Card | `[16, 528, 241, 600]` | `[16, 444, 208, 511]` |
| Projected ground box bottom (model's lowest point) | 459 | 391 |
| Marker rectangles | Office `[128, 318, 160, 350]`, Guard House `[106, 353, 138, 385]` | both above y 391 (Office box `[110, 281, 137, 309]`) |
| Card top vs ground bottom / lowest marker bottom | 528 > 459 / 528 > 385 | 444 > 391 |
| Card bottom vs viewport bottom | 600 < 667 | 511 < 568 |
| Slogan font-size; card width | 18px; 60% | 16px; 60% |
| Every frame of the focus | canvas 375×667, opacity 1; card fades to 0 | canvas 320×568, opacity 1; card fades to 0 |

- `CI=true npx react-scripts test --watchAll=false`: 5 suites, 127 tests passed.

### Verification follow-up after /spectra-verify

- Marker halo, 1280×800, measured on 2026-10-29: with motion allowed the dot's `::after` has `animation-name: FactoryScene-halo`, `1.6s`, `infinite`; with `prefers-reduced-motion: reduce` emulated it has `animation-name: none`, a static `scale(1.6)` ring at opacity 0.6.
- Tests added for gaps the verify report found: "removing the band during a fly-in ends with the building centred on the whole scene" (src/FactoryScene.test.js); "fades the card when motion is allowed" and "switches the card at once under reduced motion" (src/pages/HomePage.test.js); the signed-out Home test in src/App.test.js now checks the slogan heading; the resize redraw test now goes 768×800 → 1280×800 as the spec says.
- `CI=true npx react-scripts test --watchAll=false`: 5 suites, 130 tests passed.

