## Problem

On the Home factory scene, vehicles keep driving after they leave the ground: they move through the empty sky past the edge of the 3D model.

In the current `public/models/factory.glb` (measured from its animation data):

- the ground (`Ground`) and road (`Road`) span x −80 to 80;
- the 8 cars and Truck3 travel 168 units per 10-second loop, reaching x up to ±178;
- several vehicles also teleport mid-road when their loop restarts (CarE0 at x 73, Truck3 at x 57).

The modeller supplied a corrected model, `public/models/factory0.glb` (measured). Each vehicle now loops seamlessly between about x −88.9 and 88.9, and the wrap-around jump happens beyond the ground edge. The model hides vehicles off the ground by animating their scale to 0, but not consistently: CarW2 is scaled to 0 from x −82.3, while Truck3 stays at full size up to x 88.1. Truck3 would still be visible about 8 units past the ground edge.

## Root Cause

- The vehicle animation paths in `factory.glb` run far beyond the ground, and the app plays every clip as authored (requirement "Embedded animations play on loop"). Nothing in `FactoryScene` limits where a vehicle may be seen.
- `factory0.glb` fixes the paths and the mid-road teleports. Its per-vehicle hide points come from hand-placed scale keyframes, so they don't line up with the ground edge.

## Proposed Solution

- Load `public/models/factory0.glb` instead of `factory.glb`, and delete the unused `factory.glb`.
- After the model loads, read the ground's x/z extent from the `Ground` node's bounding box, and collect the vehicle root nodes: top-level nodes named `Car<letters><digits>` or `Truck<digits>`, such as `CarE0` or `Truck3`.
- Every frame, after the animation mixer updates, set each vehicle's `visible` to whether its world-space centre lies inside the ground extent on x and z. Vehicles therefore disappear exactly at the ground edge, whatever the model's own scale keys do.
- If the model has no `Ground` node, nothing is hidden (current behaviour) and a single console warning names the missing node.

## Non-Goals

Recorded in design.md (Goals / Non-Goals).

## Success Criteria

- No vehicle (car or truck) is ever drawn while its centre is outside x −80…80 or z −80…80. A browser check samples a full 10-second loop and finds every vehicle hidden whenever its centre is beyond the ground edge, and shown whenever it is inside.
- No vehicle disappears or reappears while its centre is on the ground, which means no mid-road teleport.
- The scene still loads, animates all 102 clips, frames the model, and shows the sky gradient. All existing tests pass, plus new tests for vehicle hiding and the missing-ground fallback.
- `CI=true npm test` and `npm run build` pass.

## Impact

- Affected specs: `factory-scene`. The requirement "Factory model loads with visible status" is modified to load `models/factory0.glb`, and the requirement "Vehicles are hidden outside the ground" is added.
- Affected code:
  - Modified: src/FactoryScene.js, src/FactoryScene.test.js
  - New: public/models/factory0.glb (2,926,552 bytes, measured; already copied into the project, untracked)
  - Removed: public/models/factory.glb
