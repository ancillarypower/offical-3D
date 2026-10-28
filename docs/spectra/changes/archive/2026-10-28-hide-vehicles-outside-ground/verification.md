# Verification: hide-vehicles-outside-ground

Run on 2026-10-27 against the working tree on top of commit `3262611`: three 0.186.1, Node v24.22.1, headless Chromium with SwiftShader, `npm start` on port 3123. No source file changed after these runs.

## Automated checks

| Check | Task | Result |
| --- | --- | --- |
| "shows loading text until the model loads" with URL `/models/factory0.glb` | 1.1 | Failed before the `MODEL_URL` change, as intended; passes after |
| `grep -rn "factory\.glb" src public` | 1.1 | No matches; `public/models/factory.glb` deleted |
| "updateVehicleVisibility follows the ground extent" (6 example rows), "hides vehicles whose origin is off the ground after load", "re-evaluates visibility every frame", "warns once and hides nothing without a Ground node" | 1.2 | All 9 failed before the code change, as intended; pass after |
| "exposes the dev debug handle and removes it on unmount" | 1.3 | Failed before, as intended; passes after |
| `CI=true npm test` | 2.1 | PASS: 3 suites, 53 tests |
| `npm run build` | 2.1 | PASS: "Compiled successfully"; main JS 274.82 kB gzip (+198 B) |
| `grep -c __FACTORY_SCENE__ build/static/js/*.js` | 1.3 | 0 in `main.2ee1a350.js` and 0 in `453.7290f9b9.chunk.js` |

## Browser check

1280×800. `window.__FACTORY_SCENE__` was sampled every 100 ms for 10.5 s, one full 10.04 s loop.

| Check | Result |
| --- | --- |
| Model requested | PASS: only `factory0.glb` |
| Vehicles found | PASS: 11 (`CarE0`–`CarE3`, `CarW0`–`CarW3`, `Truck1`–`Truck3`) |
| Ground box | x −80…80, z −80…80 (read from the `Ground` node) |
| Samples | 105; a vehicle was hidden in 87 vehicle-observations |
| Vehicle visible with origin off the ground | PASS: 0 occurrences |
| Vehicle hidden by the check with origin on the ground | PASS: 0 occurrences |
| On-ground samples where the model's own scale is below 0.01 | none |
| Page errors | PASS: none |
| Screenshot | New model with the chimney smoke shown; no vehicle floating beyond the ground plane |

## Notes

- The shared test fixture `fakeGltf` gained an empty `Ground` node, which adds no geometry. Without it, every existing test that loads the fixture would log the new missing-ground warning. The framing tests are unaffected because an empty node does not change the scene's bounds.
- Sampling reads state between animation frames. Visibility is set in the same frame as the mixer moves the vehicles, so the position and the visibility flag always come from the same frame.
