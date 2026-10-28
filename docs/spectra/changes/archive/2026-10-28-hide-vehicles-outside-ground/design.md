## Context

`FactoryScene` (src/FactoryScene.js) loads `${PUBLIC_URL}/models/factory.glb` with `GLTFLoader` and plays all 102 clips with one `AnimationMixer`. Its `animate` loop calls `timer.update()`, `mixer.update(delta)`, `controls.update()` and `renderer.render()` each frame. Nothing limits where an animated object can be seen.

What the two model files contain (measured from their glTF JSON and animation buffers):

| | `factory.glb` (current) | `factory0.glb` (new, from the modeller) |
| --- | --- | --- |
| Size | 2,740,840 B | 2,926,552 B |
| Ground / Road extent | x, z −80…80 / x −80…80 | same |
| Vehicle loop (8 cars + Truck3) | 168 units per 10 s, x up to ±178; start ≠ end, so the vehicle teleports when the loop restarts (CarE0 at x 73, Truck3 at x 57) | start = end over 10.04 s, x within about ±88.9; the wrap jump happens beyond the ground edge (about ±88) |
| Built-in hiding | none | scale animated to 0 off-ground, inconsistently: CarW2 from x −82.3, Truck3 not until x 88.1 |
| Other differences | — | +10 static `Smoke*` mesh nodes, +1 `Smoke` material; same 102 clip names |

Vehicle roots in `factory0.glb` (verified):

- 11 top-level nodes: `CarE0`–`CarE3`, `CarW0`–`CarW3`, `Truck1`–`Truck3`, each a mesh-less group with children;
- `Truck1` and `Truck2` are parked at x 9 and 20, z 16.5;
- `Ground` is a top-level mesh.

The active change `add-factory-scene-gradient-background` also edits src/FactoryScene.js and the `factory-scene` spec, and is implemented but not yet archived.

## Goals / Non-Goals

**Goals:**

- Use the corrected `factory0.glb`.
- No vehicle is ever drawn while its origin is off the ground, whatever the model's own scale keys do.
- Hiding is driven by the model's own `Ground` bounds, not by hard-coded numbers.
- A browser check can observe vehicle positions and visibility frame by frame.

**Non-Goals:**

- Editing the model or its animations in code: no path rewriting, scale-key changes or clip retiming.
- Fading or shrinking vehicles at the edge; hiding is instant.
- Clipping parts of a vehicle body that overhang the edge while its origin is still on the ground.
- Treating smoke, conveyor boxes, people or workers as vehicles.
- Keeping `factory.glb` as a fallback.

## Decisions

### Load factory0.glb in place of factory.glb

`MODEL_URL` becomes `${process.env.PUBLIC_URL}/models/factory0.glb`, and public/models/factory.glb is deleted, so the build no longer ships 2.7 MB nobody loads. The loading approach stays as decided in replace-home-sphere-with-factory-model / "Load the model with GLTFLoader from the public folder"; only the file name changes. Alternative: overwrite `factory.glb` with the new content and keep the URL. Rejected because the user asked to use `factory0.glb` by name, and a different file name keeps the old and new models distinguishable in history and caches.

### Hide vehicles by origin against the Ground box each frame

After load:

- `groundBox = new Box3().setFromObject(groundNode)`, where `groundNode = gltf.scene.getObjectByName('Ground')`. This is world space and computed once, because the ground is static.
- `vehicles` = direct children of `gltf.scene` whose name matches `/^(Car[A-Z]+\d+|Truck\d+)$/`.

Each frame, right after `mixer.update`, an exported pure helper sets each vehicle's `visible`:

```js
updateVehicleVisibility(vehicles, groundBox)
// visible = groundBox.min.x <= p.x <= groundBox.max.x && min.z <= p.z <= max.z,
// with p = vehicle.getWorldPosition(tmp)
```

The check uses the origin, which matches how the model's own scale keys behave and keeps the check to one point per vehicle (11 per frame).

`visible` and the model's animated `scale` are independent properties, so the mixer and this check never overwrite each other.

If `Ground` is missing, the vehicle list is left untouched, nothing is hidden, and there is one `console.warn` naming `Ground`.

Alternatives were rejected:
- Rely only on the model's scale keys: Truck3 would still show 8 units past the edge (measured).
- Rewrite the animation tracks at load: this edits model data in code and is a stated non-goal.
- Clip with a renderer clipping plane: it would cut vehicles in half at the edge and needs per-material setup.

### Development-only debug handle for browser checks

When `process.env.NODE_ENV !== 'production'`, the scene sets `window.__FACTORY_SCENE__ = { vehicles, groundBox }` after load and deletes it in teardown. CRA replaces `process.env.NODE_ENV` at build time, so the production bundle drops this branch. The acceptance check reads world positions and `visible` flags through it without reaching into React internals. Alternative: infer vehicle positions from screenshots — rejected as fragile with a moving camera.

## Implementation Contract

**Behavior:**

- Home loads `models/factory0.glb`.
- Every vehicle disappears the frame its origin crosses outside the ground's x/z extent, and reappears when it crosses back.
- A model without `Ground` behaves as before, with one console warning.
- Nothing else changes: the gradient, framing, loading and error states, and the other animations.

**Interface / data shape:**

- `export function updateVehicleVisibility(vehicles, groundBox)` in src/FactoryScene.js. `vehicles` is an array of `Object3D`, `groundBox` is a `Box3`, and it returns nothing.
- Vehicle name pattern: `/^(Car[A-Z]+\d+|Truck\d+)$/`, matched on direct children of the loaded scene.
- Dev-only `window.__FACTORY_SCENE__ = { vehicles, groundBox }`, removed in teardown and absent from production builds.

**Failure modes:**

- `Ground` missing → no hiding and exactly one `console.warn` containing `Ground`.
- No vehicles matched → no hiding and no warning.

**Acceptance criteria:**

- `CI=true npm test` passes. New and changed tests in src/FactoryScene.test.js:
  - the URL assertion in "shows loading text until the model loads" expects `/models/factory0.glb`;
  - "updateVehicleVisibility follows the ground extent" checks every row of the spec example table;
  - "hides vehicles whose origin is off the ground after load": a fake model with `Ground` (160×0.1×160 box) plus `CarE0` at (0, 0, 52.5), `CarW0` at (88, 0, 47.5) and a non-vehicle `Smoke0_0` at (200, 0, 0). After load, `CarE0` is visible, `CarW0` is hidden and `Smoke0_0` is untouched;
  - "re-evaluates visibility every frame": captures the `requestAnimationFrame` callback, moves `CarE0` to x 81 and runs one frame, and expects `CarE0` hidden;
  - "warns once and hides nothing without a Ground node";
  - "exposes the dev debug handle and removes it on unmount".
- `npm run build` succeeds, and the built JS contains no `__FACTORY_SCENE__`.
- Browser check (`npm start`, headless Chromium, 1280×800), sampling `window.__FACTORY_SCENE__` every 100 ms for 10.5 s, one full loop:
  - no sample has a vehicle with `visible === true` and its origin outside the ground box;
  - no sample has a vehicle hidden by this check while its origin is inside;
  - samples where an on-ground vehicle has a world scale below 0.01 (the model's own keys) are counted and reported;
  - a screenshot is taken for visual review.

**Scope boundaries:**

- In scope: model swap and old file removal, the vehicle visibility check, the warning, the dev debug handle, tests and the verification record.
- Out of scope: model editing, edge fading, smoke or other object behaviour, camera, gradient.

## Risks / Trade-offs

- [`factory0.glb` is about 186 KB larger (measured: 2,926,552 vs 2,740,840 B)] → about 7% more to download on first visit; covered by the existing loading state.
- [Vehicle names are a contract with the modeller] → a renamed vehicle would silently stop being hidden. The name pattern is recorded in the spec, and the browser check reports how many vehicles it found (11 expected).
- [Origin-based hiding lets half a vehicle body overhang the edge for a moment before it disappears] → accepted; it matches the model's own scale-key behaviour, and body clipping is a stated non-goal.
- [Both this change and `add-factory-scene-gradient-background` edit src/FactoryScene.js and the `factory-scene` spec] → archive the gradient change first. The two deltas touch different requirements.
