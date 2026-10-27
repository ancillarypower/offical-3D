# Verification: add-factory-scene-gradient-background

Run on 2026-10-27 against the working tree on top of commit `ca025eb` (three 0.186.1, Node v24.22.1, headless Chromium with SwiftShader, `npm start` on port 3123). No source file changed after these runs.

## Method

The check screenshots the `.FactoryScene` area and reads the pixels with a 2D canvas.

- **Edge check**: every row of the outermost 2 pixel columns on each side is compared with the expected gradient colour for that row. The expected colour is the linear interpolation `#4a90d9` → `#dfeaf5` by `row / (height − 1)`. Tolerance is ±8 per channel.
- **Loading**: the `factory.glb` request is held until the check finishes.
- **Failure**: the `factory.glb` request is answered with HTTP 404.
- **Label colour**: the label's colour is read with `getComputedStyle`.

## Results

| Check | Task | Result |
| --- | --- | --- |
| `CI=true npm test` | 1.1, 2.1 | PASS: 3 suites, 43 tests, including "renders on a transparent canvas over the CSS gradient", which failed before the code change |
| `npm run build` | 2.1 | PASS: "Compiled successfully"; JS 274.62 kB (−5 B), CSS 1.23 kB (+61 B), gzip |
| Loading (375×667): label background | 1.2 | PASS: `rgb(21, 26, 46)` |
| Loading (375×667): scene centre-top pixel ≈ `#4a90d9` | 1.2 | PASS: `#4e92da` (max channel offset 4; the nav bar fade-in was still running) |
| 404 (375×667): label background | 1.2 | PASS: `rgb(21, 26, 46)` |
| 404 (375×667): scene centre-top pixel ≈ `#4a90d9` | 1.2 | PASS: `#4a90d9` (offset 0) |
| 404 (375×667): no canvas | 1.2 | PASS |
| 1280×800 loaded (scene 1280×744): edge columns vs row colour | 2.1 | PASS: 0 pixels outside ±8, worst offset ≈ 1; top `#4a90d9`, middle `#95bde7`, bottom `#dfeaf5` |
| 1280×800 after a 500 px horizontal drag: top/bottom rows | 2.1 | PASS: top `#4a90d9`, bottom `#dfeaf5` |
| 375×667 loaded (scene 375×611): edge columns vs row colour | 2.1 | PASS: 0 pixels outside ±8, worst offset ≈ 1; top `#4a90d9`, middle `#95bde7`, bottom `#dfeaf5` |
| No page errors (1280×800, 375×667) | 2.1 | PASS |

The measured middle `#95bde7` differs from the spec's `#94bde7` by 1 in red because of rounding (148.5); this is within tolerance.

## Notes

- `.FactoryScene-message` also has `white-space: nowrap`, which is not listed in design.md. It keeps the centred, absolutely positioned label on one line on narrow screens, where it would otherwise shrink and wrap. Text colours are unchanged, as designed.
- Not checked in this change: real-phone rendering, which was already marked NOT RUN in `fix-factory-scene-responsive-framing`.
