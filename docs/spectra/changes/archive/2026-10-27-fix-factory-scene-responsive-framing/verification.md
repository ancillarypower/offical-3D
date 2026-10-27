# Verification: fix-factory-scene-responsive-framing

Run on 2026-10-27 against the working tree (three 0.186.1, Node v24.22.1, headless Chromium with SwiftShader, `npm start` on port 3123).

## Method for the edge check

The check takes a screenshot of the factory canvas and counts pixels in its leftmost and rightmost 2 columns that differ from the background `#0b0d17` (tolerance ±8 per channel). Zero on both sides means no model pixels touch the side edges. Page scroll is checked as `document.documentElement.scrollHeight === innerHeight`.

## Task 1.1: before any code change (bug confirmation)

| Viewport (canvas) | Left edge | Right edge | Scroll | Result |
| --- | --- | --- | --- | --- |
| 375×667 (375×611) | 117 | 115 | none | FAIL: model clipped |
| 1280×800 (1280×744) | 0 | 0 | none | PASS |
| 1280×800 → resized to 375×667 | 119 | 115 | none | FAIL: model clipped |
| resized back to 1280×800 | 0 | 0 | none | PASS |

The premise is confirmed: portrait screens clipped the model and resizing did not re-fit.

## Task 4.1: after the fix

| Check | Result |
| --- | --- |
| `CI=true npm test` | PASS: 3 suites, 42 tests |
| `npm run build` | PASS: "Compiled successfully", main JS 274.63 kB gzip (+111 B) |
| Edge check 375×667 (canvas 375×611) | PASS: left 0, right 0; no scroll |
| Edge check 1280×800 (canvas 1280×744) | PASS: left 0, right 0; no scroll |
| 1280×800 → 375×667 resize | PASS: left 0, right 0; no scroll |
| 375×667 → 1280×800 resize back | PASS: left 0, right 0; no scroll |
| Real phone: canvas bottom at screen bottom with address bar expanded, no scroll | NOT RUN: no real device available in this session; headless Chromium cannot show a collapsing toolbar |
| Real phone: observed frame rate | NOT RUN: same reason |

## Observations

- At 375×667 the whole model now fits, but it fills only about 85% of the canvas width (estimated from the screenshot: ground plane spans roughly x = 27–345 of 375 px). This is expected from the conservative bounding-sphere fit (design.md, Risks).
- Some vehicles drive past the ground plane edge in the model's own animations. This is model content and was already observed in the previous change.
