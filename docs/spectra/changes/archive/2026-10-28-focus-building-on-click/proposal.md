## Why

The Home factory scene is only something to look at: visitors can orbit and zoom, but nothing in the model responds or tells them what it is. The user wants the two buildings on the left of the site — the Office block and the Guard House — to be clickable, so a click brings the camera closer to that building and shows its name, built with three.js picking and labels.

## What Changes

- Clicking the Office or the Guard House on the Home scene flies the camera closer so that building fills the view, stops the automatic rotation, and shows the building's English name ("Office" or "Guard House") as a label anchored above it in the 3D scene.
- Clicking anything that is not one of these two buildings (empty sky, ground, other structures), or pressing Esc, flies the camera back to the view it had before the first building was focused and resumes the automatic rotation. The label disappears.
- While a building is focused, clicking the other building flies straight to it; the return target stays the original overview.
- A drag that rotates the view does not count as a click.
- The pointer cursor changes to a hand while it is over either building.
- The orbit zoom limits change while a building is focused, so the camera can come closer than the whole-model limit allows; they are restored on return.
- On unmount, the scene also removes the label layer, its input listeners, and any running camera flight.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `factory-scene`: adds clicking a building to focus the camera on it and show its name, and leaving that focus by clicking elsewhere or pressing Esc; the camera requirement's zoom limit and automatic rotation now apply to the overview only; cleanup on unmount also covers the label layer, input listeners and camera flights.

## Impact

- Affected specs: `factory-scene`
- Affected code: src/FactoryScene.js (picking, camera flight, labels, cleanup), src/FactoryScene.test.js (new tests), src/App.css (building label style)
- Dependencies: no new packages. Uses `CSS2DRenderer` from three's bundled examples (three 0.186.1) and `gsap` 3.15.0, which src/layout/AppLayout.js already imports.
