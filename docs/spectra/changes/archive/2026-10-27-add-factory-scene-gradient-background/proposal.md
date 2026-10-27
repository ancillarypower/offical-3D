## Why

The Home factory scene renders on a flat near-black background (`#0b0d17`), which reads as empty and monotonous behind a daytime factory with a white ground plane. A vertical sky gradient makes the scene feel outdoors and less flat, without touching the rest of the site's dark theme.

## What Changes

- The factory scene's background becomes a vertical linear gradient: `#4a90d9` (sky blue) at the top to `#dfeaf5` (pale blue-white) at the bottom of the scene area.
- The gradient is visible as soon as Home opens, including while "Loading factory…" or the load-error message is shown.
- The loading and error messages sit on a dark rounded label (site surface colour `#151a2e`). Their existing text colours stay legible over the light gradient: computed contrast 5.69:1 and 6.87:1.
- The rest of the site (navigation bar, Profile, Login, page background) keeps the current dark theme.

## Non-Goals

Recorded in design.md (Goals / Non-Goals).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `factory-scene`: adds the requirement "Scene background is a sky gradient", covering the gradient colours and direction, its visibility during loading/error, and legible status messages over it.

## Impact

- Affected code: src/FactoryScene.js (renderer becomes transparent; the solid `scene.background` colour is removed), src/App.css (`.FactoryScene` gradient, `.FactoryScene-message` label), src/FactoryScene.test.js.
- No new dependencies, assets, or API changes.
- Verification tooling: the browser edge check used by `fix-factory-scene-responsive-framing` assumes a uniform `#0b0d17` background. Checks in this change compare each edge pixel against the expected gradient colour for its row instead.
