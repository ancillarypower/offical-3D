# Verification: add-archimedes-page

Run on 2026-10-28 against the working tree on top of commit `f0ad650`: three 0.186.1, Node v24.22.1, headless Chromium with SwiftShader, `npm start` on port 3123.

## Automated checks

| Check | Task | Result |
| --- | --- | --- |
| src/FactoryScene.test.js after moving `fitDistance`, `pixelRatio` and `disposeModel` to src/threeHelpers.js | 1.1 | PASS, 58 tests, test file unchanged. The task text first said 83, the total across all suites at the time; it was corrected to 58 after verify |
| `cmp` of the source and copied model | 1.2 | Exit 0; `public/models/Archimedes_opt_anim.glb` is 13,719,364 bytes |
| Loading text, URL, load failure, WebGL failure, transparent clear, pixel ratio 1→1, 2→2, 3→2 (7 tests) | 2.1 | All 7 failed against an empty component, as intended; pass after |
| Clip loops forever, orbit settings, framing at 1280×744 and 375×611 (spec example 2.613 and 4.059 × radius), resize re-fit (5 tests) | 2.2 | All 5 failed before the code; pass after |
| "unmount disposes renderer, controls, geometry and canvas" | 2.3 | Failed before the teardown; passes after |
| "unmount before load creates no canvas and raises nothing" | 2.3 | Passed before the teardown too, because the 2.1 load handler already drops a model that arrives after unmount; it guards against regressions |
| Navigation order tests (Home, Archimedes, Profile, Logout / Log in), "signed-out visitor sees the Archimedes scene with its link current", "navigating Home → Archimedes → Home swaps the scenes" | 3.1 | All 4 failed before the route and nav entry; pass after |
| src/App.css selectors | 3.2 | Content review: `.ArchimedesPage` shares the `.HomePage` height pair and `overflow: hidden`; `.ArchimedesScene`, `.ArchimedesScene-message` and its alert rule share the factory rules |
| `CI=true npm test` | 4.1 | PASS: 4 suites, 99 tests |
| `npm run build` | 4.1 | "Compiled successfully"; main JS 277.59 kB gzip (+308 B), CSS 1.27 kB (+24 B) |

## Browser check (task 4.2)

Window 1280×800, signed out, opened `/archimedes` directly.

| Check | Result |
| --- | --- |
| "Loading Archimedes screw…" shown while downloading | Yes; the model was ready about 2.0 s after navigation (local dev server) |
| Navigation bar | "Home", "Archimedes", "Profile", "Log in"; only "Archimedes" has `aria-current="page"` |
| Scene area | top 56 px, height 744 px in an 800 px window; the page does not scroll |
| Background | `linear-gradient(rgb(74, 144, 217), rgb(223, 234, 245))`, that is `#4a90d9` → `#dfeaf5` |
| Model in view | Whole and centred, upright (glTF y-up), over the gradient; see `archimedes-a.png` |
| Motion | `archimedes-a.png` and `archimedes-b.png`, taken 1 s apart, differ, and the camera has orbited between them. The camera orbit and the clip both move the image, so the screenshots alone do not prove that the clip plays; that the clip plays on loop is covered by the unit test in 2.2 |
| Home and back via the nav links | On `/`: 1 canvas, no Archimedes scene. Back on `/archimedes`: 1 canvas, no factory scene |
| Page errors | None |

Screenshots are in the session scratchpad under `arch/out/`.

## Fixes after verify

`/spectra-verify` reported no Critical issues, two Warnings and one Suggestion. All three were addressed on 2026-10-28.

| Finding | What was done | Evidence |
| --- | --- | --- |
| Warning: no test for "Reduced motion does not stop the scene" | Added "reduced motion still animates and auto-orbits" to src/ArchimedesScene.test.js. It stubs `matchMedia` so `(prefers-reduced-motion: reduce)` matches, then checks that the clip action is running with infinite repetitions and that auto-rotate is on. The test passes against the unchanged component, so it guards against regressions. To prove it can fail, a reduced-motion check was temporarily added around `play()`: the test failed, and the component was then restored byte for byte (`cmp`) | Fault injection run both alone and with the whole file |
| (found while fixing) | The new test failed in a full-file run: CRA's `resetMocks` empties the earlier test's `play` spy without restoring it, so a second `spyOn` got a no-op. Added `jest.restoreAllMocks()` to the file's `beforeEach` | Full suite passes after the fix |
| Warning: "Drag to rotate" only partly tested | Added a real drag to the browser check: mouse press at (640, 428), 20 moves of 20 px to the left, then release | The view turned to the model's far side, with the rice fields in front (`drag-0-before.png` vs `drag-2-resume-a.png`). Frames taken 2 s and 5 s after release (`drag-2-resume-a.png`, `drag-3-resume-b.png`) show the view still turning the same way, so auto-rotate resumed. No page errors |
| Suggestion: task 1.1 said 83 tests | Changed to 58 | tasks.md |

After the fixes: `CI=true npm test` PASS, 4 suites, 100 tests. `npm run build` "Compiled successfully", main JS 277.59 kB gzip (unchanged; only tests and documents changed). The browser check was re-run in full, including the new drag, and all earlier rows still hold: navigation order and current link, 744 px scene with no scroll, gradient, one canvas after Home and back, no page errors. Screenshots are in the session scratchpad under `arch/out2/`.
