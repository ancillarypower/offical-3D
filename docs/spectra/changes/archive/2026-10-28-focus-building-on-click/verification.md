# Verification: focus-building-on-click

Run on 2026-10-28 against the working tree on top of commit `7b8a657`: three 0.186.1, gsap 3.15.0, Node v24.22.1, headless Chromium 155 with SwiftShader, `npm start` on port 3123. No source file changed after these runs.

## Change made during apply

The design's first flight path moved the camera in a straight line. Before task 1.2 that was found to cut through the model, and through the look-at point, when the auto-orbit has turned the camera to the far side. With the user's agreement, design.md ("Flight path", "OrbitControls during a flight") and tasks 1.2 and 3.1 were updated to an arc flight driven by one GSAP progress tween.

## Automated checks

| Check | Task | Result |
| --- | --- | --- |
| "pickBuilding resolves the first visible hit" (5 rows), "BUILDINGS parts match the factory0.glb node names" | 1.1 | All 6 failed before the code existed, as intended; pass after |
| "clicking a building flies the camera to it", "a 5 px move still counts as a click", "clicking the other building switches focus and keeps the overview pose", "clicks during a flight are ignored", "clicking the focused building again changes nothing", "the flight swings around instead of passing through the target" | 1.2 | Failed before the code change; pass after |
| "a 6 px drag is not a click", "a model without building nodes has nothing clickable" | 1.2 | Passed before the change as well, because they assert that nothing happens; they guard against regressions rather than prove the new behaviour |
| "Esc returns to the saved overview", "clicking empty space returns to the overview" | 1.3 | Failed before; pass after |
| "Esc during the fly-in is ignored", "Esc in the overview does nothing" | 1.3 | Passed before too (assert that nothing happens) |
| "shows the focused building's name after the flight", "switching buildings switches the label", "the label layer does not block pointer events" | 2.1 | Failed before; pass after. "returning hides the label" passed before too (no labels existed) |
| "the cursor is a hand over a building only" | 2.2 | Failed before; passes after |
| "resize while focused keeps the camera and rescales the return pose"; existing "re-fits after resize keeping direction and zoom ratio" still passes | 2.3 | Failed before; passes after |
| "unmounting mid-flight leaves no label, tween or key listener", "unmounting while focused removes the Esc listener" | 3.1 | Listener removal and tween kill were added during 1.3, because the Esc tests leaked between test cases without them. So these tests passed when first written. Checked instead by deleting each cleanup line in turn (tween kill, label layer removal, Esc listener removal, label removal): each deletion makes one of the two tests fail |
| "exposes the dev debug handle and removes it on unmount" (extended), "the dev debug handle lists buildings and reports focus" | 3.2 | Failed before; pass after |
| `CI=true npm test` | 3.3 | PASS: 3 suites, 80 tests |
| `npm run build` | 3.3 | PASS: "Compiled successfully"; main JS 277.23 kB gzip (+2.4 kB) |
| `grep -c __FACTORY_SCENE__ build/static/js/*.js` | 3.2 | 0 in `main.a8363619.js` and 0 in `453.7290f9b9.chunk.js` |

## Browser check

The browser window was 1280×800. Each building's box centre was projected to the screen and clicked with real mouse events. The check then waited 1.2 s, pressed Esc, and waited 1.2 s again. Values were read from `window.__FACTORY_SCENE__`.

| Check | Office | Guard House |
| --- | --- | --- |
| Focus after the click | `Office`, not flying | `GuardHouse`, not flying |
| Look-at point minus box centre | 8.9e-16 | 2.2e-16 |
| Camera distance (expected `fitDistance(r) × 1.2`) | 40.354 (40.354) | 8.064 (8.064) |
| Auto-rotate while focused | off | off |
| Zoom-in limit while focused (building radius) | 12.869 (12.869) | 2.571 (2.571) |
| Labels shown | only "Office" | only "Guard House" |
| Cursor over the building | `pointer` | `pointer` |
| After Esc: focus, auto-rotate, labels shown | none, on, 0 | none, on, 0 |
| After Esc: look-at point, distance and elevation vs the pose at the click | all exactly equal | all exactly equal |
| After Esc: camera position vs the pose at the click | 0.0124 apart | 0.0124 apart |
| Page errors | none | none |

The 0.0124 position difference is the auto-rotation, which resumes when the flight ends. The pose is sampled on the first frame after the flight, and in that frame the auto-rotation has already turned the camera 4.4e-5 rad around the look-at point at a distance of about 280. Look-at point, distance and elevation match exactly. So the return flight lands on the saved overview. The design's acceptance criterion was later reworded to compare look-at point, distance and elevation, and to allow this one-frame azimuth difference; all three match exactly.

**Screenshots** (`focus-Office.png`, `focus-GuardHouse.png` in the session scratchpad):

- **Office:** the building is seen from the road side with its entrance canopy. Nothing stands in front of it, and the "Office" label sits above the roof.
- **Guard House:** the building fills the centre of the view with its window. The road is on the left and the Office in the background. Nothing stands in front of it, and the "Guard House" label sits just above the roof.

## Fixes after review

`/spectra-review` reported one Warning and one Suggestion. Both were fixed on 2026-10-28, and each new test failed before its fix, as intended.

| Finding | Fix | Test |
| --- | --- | --- |
| Warning: a resize during the return flight was ignored, so the overview landed at the old framing | The flight re-reads its destination on every update; the return flight's destination is the saved overview pose that the resize rescales | "resize during the return flight lands on the re-fitted overview" |
| Suggestion: right or middle clicks, and a finger lifted during a pinch, counted as clicks | Only a primary-button press with one pointer down starts a click; a second pointer cancels it, and `pointercancel` drops it. The spec's click definition now says so | "right and middle clicks do not focus a building", "lifting fingers after a two-finger touch is not a click" |

After the fixes: `CI=true npm test` PASS, 3 suites, 83 tests. `npm run build` "Compiled successfully", main JS 277.29 kB gzip (+60 B); `__FACTORY_SCENE__` count 0 in both JS files.
