## Context

`FactoryScene` (src/FactoryScene.js) loads `public/models/factory0.glb`, adds `gltf.scene` to a three.js scene, frames it with `fitDistance`, and uses `OrbitControls` with damping, no pan, auto-rotate at speed 0.5, `minDistance = radius` (half the model's bounding-box diagonal) and `maxDistance = 3 × fit`. The `animate` loop runs `timer.update()`, `mixer.update()`, `updateVehicleVisibility()`, `controls.update()` and `renderer.render()`. A `ResizeObserver` re-fits the camera, scaling its offset from `controls.target` by `nextFit / fit`. In development, `window.__FACTORY_SCENE__ = { vehicles, groundBox }`.

Nothing in the scene reacts to a click. The user asked for the two buildings on the left of the site to be clickable: the camera moves closer and the building's name appears, "using the three.js way". Decisions already made by the user: both buildings, English names, return by clicking empty space or pressing Esc.

The two buildings in `factory0.glb` (read from its glTF JSON, measured):

| Building | Top-level nodes (all meshes, none animated) | World box (x, y, z) |
| --- | --- | --- |
| Office | `Office`, `OfficeRoof`, `OfficeCanopy`, `OfficeEntrance`, `OfficeSolar0`–`2`, `OffWinF0_0`–`OffWinF3_3` (16), `OffWinS0_0`–`OffWinS3_2` (12) | about −39.1…−25, 0…15, 2…16.4 |
| Guard House | `GuardHouse`, `GuardHouseWin` | about −23.5…−20.5, 0…2.8, 36.5…39.6 |

Each building is a set of sibling nodes directly under the model root, not one group. The windows and entrances face +z, the road side.

`gsap` 3.15.0 is installed and already imported by src/layout/AppLayout.js. three 0.186.1 ships `CSS2DRenderer` in `three/examples/jsm/renderers/CSS2DRenderer.js`. Its `Raycaster.intersectObject` tests layers only and ignores `visible`, verified in node_modules/three/src/core/Raycaster.js.

## Goals / Non-Goals

**Goals:**

- Clicking the Office or the Guard House flies the camera in to frame that building and shows its English name above it.
- Clicking anything else, or pressing Esc, flies back to the overview the camera had before and resumes auto-rotation.
- Picking and labels use three.js primitives: `Raycaster` and `CSS2DRenderer`/`CSS2DObject`.
- An orbit drag never counts as a click.
- Every listener, tween and label element is released on unmount.

**Non-Goals:**

- Making any other structure clickable (main hall, silos, tanks, vehicles, people).
- Selecting buildings with the keyboard (Tab/Enter). Esc to leave is keyboard-accessible; focusing a building needs a pointer.
- Info panels, descriptions or links beyond the building name.
- Highlighting, outlining or recolouring the building.
- Changing the overview's auto-orbit speed, damping, pan or initial direction.
- Respecting `prefers-reduced-motion` for the camera flight. This follows the decision "3D scene ignores reduced motion" (replace-home-sphere-with-factory-model): the user chose that the 3D scene's motion plays regardless.

## Decisions

### Buildings are defined by a name table over top-level nodes

A module constant lists the clickable buildings:

```js
const BUILDINGS = [
  { id: 'Office', label: 'Office', parts: /^(Office(Roof|Canopy|Entrance|Solar\d+)?|OffWin[FS]\d+_\d+)$/ },
  { id: 'GuardHouse', label: 'Guard House', parts: /^GuardHouse(Win)?$/ },
];
```

After load, each building's parts are the direct children of `gltf.scene` whose names match `parts`. Its world `Box3` is the union of `setFromObject` over those parts, computed once because none of them is animated. A building with no matching parts is left out silently, so a model without these nodes behaves as before.

Alternative: ask the modeller to group each building under one parent node. Rejected for now because it requires a new model file, and the name table works with `factory0.glb` as it is.

### Pick buildings with a Raycaster on click, not on drag

Listeners on `renderer.domElement`:

- `pointerdown` records the pointer id and client position, but only for a primary-button press while no other pointer is down. A second pointer (pinch) clears the pending press; `pointercancel` clears it too.
- `pointerup` for the same pointer counts as a click only if the pointer moved at most 5 CSS px. Larger moves are orbit drags and are ignored.

On a click, the pointer position is converted to normalised device coordinates using the canvas's `getBoundingClientRect()`. A `Raycaster` then intersects `gltf.scene` recursively.

An exported pure helper resolves the result:

```js
pickBuilding(intersections, modelRoot, buildings) // → building or null
```

- It takes the first intersection whose object and every ancestor up to `modelRoot` are `visible`, because the Raycaster ignores visibility and vehicles can be hidden.
- It walks up to the ancestor that is a direct child of `modelRoot`.
- It returns the building whose `parts` matches that ancestor's name.
- Any other first hit, or no hit, returns `null`.

Because the first visible hit decides, a building behind a tree or the main hall is not picked through it.

Alternative: intersect only the building meshes. Rejected because a click on an object in front of a building would select the building behind it.

### Fly the camera with a GSAP tween between saved poses

A pose is `{ position, target }`.

**Focus pose:**

- `target` is the building box centre.
- `position = target + FOCUS_DIRECTION × fitDistance(r, fov, aspect) × 1.2`, where `r` is half the box diagonal.
- `FOCUS_DIRECTION = normalize(0.35, 0.45, 1)`: in front of the +z face, slightly right and above.

Estimated distances from the box sizes above: about 40 units for the Office and about 8 for the Guard House. The browser check measures the real values.

**State machine:** `focusedId` is `null` for the overview or a building id. `flying` is true during a tween.

- **Overview → building:**
  - Save the current camera position and `controls.target` as `overviewPose`.
  - Set `controls.autoRotate = false` and `controls.enabled = false`.
  - Start the flight to the focus pose (see "Flight path" below), 1 s, ease `power2.inOut`.
  - On complete: set `controls.minDistance = r`, `controls.enabled = true`, `focusedId = id`, and show that building's label.
- **Building A → building B:** hide A's label, then fly to B's focus pose as above. `overviewPose` is kept.
- **Building → overview** (non-building click or Esc):
  - Hide the label.
  - Disable the controls and fly back to `overviewPose`.
  - On complete: restore `controls.minDistance = radius`, set `controls.autoRotate = true` and `controls.enabled = true`, and clear `focusedId`.
- **Same-building click while focused:** no change.
- **Overview with a non-building click:** no change.
- **Click or Esc while `flying`:** ignored. This keeps one tween at a time.

**Flight path:** one `gsap.to` tween of a private progress proxy `{ t: 0 }` to `t: 1`. Its `onUpdate` sets:

- `controls.target` = linear interpolation between the start and end targets;
- the camera offset from the target = the start and end offsets in spherical coordinates, with radius and polar angle interpolated linearly and the azimuth along the shorter arc;
- `camera.position` = target + offset.

The camera therefore swings around the target instead of cutting through the model when the auto-orbit has turned it to the far side. Decided during apply; the first version tweened position and target in straight lines, which can pass through the model and through the target itself.

**OrbitControls during a flight:** `controls.update()` keeps running every frame, and it clamps the distance to `minDistance`/`maxDistance` even while `enabled` is false (verified in OrbitControls.js `update()`). So every flight sets `controls.minDistance = 0` at its start; the end of the flight sets the final value. At the start of a flight the leftover damping rotation is flushed: turn `enableDamping` off, call `controls.update()` once, turn it back on. Without this, the remaining auto-rotate momentum would drift the camera after the flight ends.

The tween is kept in a variable (`flight`) so teardown can kill it.

Alternative: interpolate inside the `animate` loop with `Vector3.lerp`. Rejected because GSAP is already the project's animation library, and a tween gives easing, `onComplete` and `kill()` for free.

### Show names with CSS2DRenderer labels anchored above each building

- A `CSS2DRenderer` is created next to the WebGL renderer. Its `domElement` is appended to the mount with `position: absolute; top: 0; left: 0; pointer-events: none`, so clicks and drags still reach the canvas.
- It is sized with the renderer and rendered right after `renderer.render()` each frame.
- For each building, a `CSS2DObject` wraps `<div class="FactoryScene-label">Office</div>`. It is placed at the box's top centre, at y = `max.y` + 1, added to the scene, and kept `visible = false` until that building is focused.
- **Label style:** `padding: 4px 12px`, `border-radius: 8px`, `background: var(--surface)` (`#151a2e`), `color: var(--text)` (`#e6e9f5`), `white-space: nowrap`, `font-weight: 600`. This matches the dark status label from add-factory-scene-gradient-background.
- **Contrast:** `#e6e9f5` on `#151a2e` is about 14:1 (estimated from the colour values; the browser check does not measure it).

Alternative: a React-rendered overlay at a fixed screen position. Rejected because the user asked for the three.js way, and a CSS2D label stays attached to the building while the user orbits around it.

### Hand cursor over a building

A `pointermove` listener on the canvas runs the same raycast and `pickBuilding` while no button is pressed. It sets the canvas `style.cursor` to `pointer` over a building and to `''` otherwise. A drag in progress (`event.buttons !== 0`) skips the raycast.

### Resize while focused keeps the focus framing

The existing `ResizeObserver` still updates renderer size, aspect, `fit`, near/far and `maxDistance`, and now also sizes the label renderer. The camera move depends on the state:

- **Overview, not flying:** the camera is moved as today.
- **Focused or flying:** the camera stays where it is. Instead, `overviewPose.position` is rescaled around `overviewPose.target` by `nextFit / fit`, so the return flight lands on a correctly framed overview.

### Extend the development debug handle

`window.__FACTORY_SCENE__` gains three fields:

- `camera`
- `controls`
- `buildings`: an array of `{ id, label, box }`

It also gains a `getFocus()` function that returns `{ focusedId, flying }`.

Existing fields stay. This extends the decision "Development-only debug handle for browser checks" (hide-vehicles-outside-ground) and does not replace it. The browser check projects a building centre to screen coordinates through it and reads the state after clicking.

## Implementation Contract

**Behaviour:**

- **Click on a building:** a click (pointer up within 5 CSS px of pointer down) on a visible part of the Office or Guard House starts a 1 s camera flight.
  - When it ends, `controls.target` equals the building box centre (each axis within 0.01).
  - The camera is `fitDistance(r) × 1.2` from it along `FOCUS_DIRECTION`.
  - Auto-rotate is off.
  - The label with that building's text is shown, and no other label is.
- **Return:** a click whose first visible hit is not one of the two buildings, or a click on nothing, while focused flies back. So does Esc, which is listened for on `window`. When the flight ends:
  - the camera's look-at point equals `overviewPose.target` (each axis within 0.01), and its distance and elevation from that point equal `overviewPose`'s (within 0.01). Its azimuth may differ by the auto-rotation of the frame in which the flight ends, because auto-rotate resumes in that frame;
  - auto-rotate is on;
  - `minDistance` equals the model radius;
  - no label is shown.
- **Ignored input:**
  - Clicks and Esc during a flight do nothing.
  - A drag of more than 5 CSS px does nothing.
  - A click on the focused building does nothing.

**Interfaces:**

- New exports from src/FactoryScene.js:
  - `pickBuilding(intersections, modelRoot, buildings)`
  - `BUILDINGS`
  - `FOCUS_DIRECTION` (the focus viewing direction, used by tests to compute the expected camera position)
- The debug handle fields listed under "Extend the development debug handle".
- Label DOM: `.FactoryScene-label` elements inside the label renderer's element, which is itself inside `.FactoryScene`.

**Failure modes:**

- If the model lacks a building's nodes, that building is not clickable, and there is no warning.
- If WebGL is unavailable, the error path is unchanged and no label renderer is created.

**Cleanup on unmount:**

- Kill the running flight tween, if any.
- Remove the `pointerdown`, `pointerup`, `pointercancel` and `pointermove` listeners on the canvas, and the `keydown` listener on `window`.
- Remove each `CSS2DObject` from the scene.
- Remove the label renderer's element from the DOM.

**Acceptance:**

- `CI=true npm test` and `npm run build` pass.
- A headless-Chromium check at 1280×800 on `npm start` does the following through `window.__FACTORY_SCENE__`:
  - clicks the projected centre of each building;
  - after 1.2 s, confirms the target, distance, auto-rotate state and visible label text;
  - presses Esc;
  - after 1.2 s, confirms the overview pose was restored;
  - takes one screenshot per focused building.

**In scope:**

- src/FactoryScene.js
- src/FactoryScene.test.js
- the `.FactoryScene-label` rule in src/App.css

**Out of scope:** everything listed under Non-Goals, and any change to the model file.

## Risks / Trade-offs

- [The 1.2 margin and `FOCUS_DIRECTION` are chosen from the box sizes; another building could hide part of the target, for example the main hall in front of the Office from some angles] → The fixed direction looks from the +z road side, where nothing taller stands between the road and either building. The screenshots in the browser check confirm each building is unobstructed; adjust the direction there if not.
- [Raycasting the whole model, about 600 nodes, on every `pointermove`] → Three tests each mesh's bounding sphere before its triangles. The per-move cost is estimated to be under 1 ms on desktop and is not measured. If the browser check shows stutter while hovering, throttle the hover raycast to one per animation frame.
- [A touch tap moves a few pixels] → The 5 CSS px threshold accepts normal taps; a deliberate drag is longer.
- [`gsap` is imported but not listed directly in package.json; it arrives through `@gsap/react`] → The same is already true for src/layout/AppLayout.js. Declaring it is a separate packaging fix and is out of scope.
- [CSS2DRenderer assumes 100% browser zoom, per its own source comment] → At other zoom levels the label can sit slightly off the building. This is accepted, because the label is decorative and the name is still readable.

## Migration Plan

None. The feature is additive. Rollback is reverting the commit.

## Open Questions

None.
