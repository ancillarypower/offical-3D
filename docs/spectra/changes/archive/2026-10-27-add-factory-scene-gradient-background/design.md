## Context

`FactoryScene` (src/FactoryScene.js) creates its `WebGLRenderer({ antialias: true })` only after the model loads, and sets `scene.background = new THREE.Color(0x0b0d17)`. Before load, or after a failure, the `.FactoryScene` div has no background of its own, so the page background `--bg: #0b0d17` from src/App.css shows through.

The status messages (`.FactoryScene-message`, `role="status"` / `role="alert"`) fill the scene area and are centred, with text colours `--muted #8b93b5` and `--error #ff7b7b`. Over the new gradient's middle colour (`#94bde7`), their computed contrast would be only 1.54:1 and 1.28:1.

The active change `fix-factory-scene-responsive-framing` changes the same component (camera fit, `ResizeObserver`, pixel-ratio cap) and is implemented but not yet archived. Its browser edge check assumes a uniform `#0b0d17` background.

## Goals / Non-Goals

**Goals:**

- A screen-fixed vertical gradient `#4a90d9` → `#dfeaf5` behind the factory scene, visible in every state (loading, loaded, error).
- Legible status messages over the gradient (contrast ≥ 4.5:1).
- No change to the rest of the site's dark theme.

**Non-Goals:**

- Changing the navigation bar, Profile, Login or page background colours.
- An animated, time-of-day or 3D sky (skybox, environment map), fog, or horizon blending with the ground.
- Changing lights, materials or the model.
- A theme switch or user-selectable colours.

## Decisions

### Draw the gradient with CSS behind a transparent canvas

`.FactoryScene` gets `background: linear-gradient(to bottom, #4a90d9, #dfeaf5)`. The renderer becomes transparent: `new THREE.WebGLRenderer({ antialias: true, alpha: true })` plus `renderer.setClearColor(0x000000, 0)`, and `scene.background` is no longer set. The 3D scene therefore composites over the CSS gradient.

This approach has four effects:

- The gradient exists before the canvas is created, so it covers the loading and error states.
- It resizes with the container at no cost.
- It stays fixed to the screen however the camera moves.
- Its colours are exact CSS hex values, with no texture colour-space conversion.

Alternatives were rejected:

- A `CanvasTexture` gradient assigned to `scene.background` would only appear after load, would need regenerating on every resize, and would pass through three.js colour management, which can shift the hex values.
- A custom shader background is too heavy for a two-stop gradient.

### Status messages on a dark label

`.FactoryScene-message` changes from a full-area overlay to a centred label with:

- `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)`;
- `padding: 8px 16px`, `border-radius: 8px`, `background: var(--surface)` (`#151a2e`);
- `white-space: nowrap`, added during apply: an absolutely positioned, centred element shrinks to fit and would wrap the message onto two lines on narrow screens;
- text colours unchanged.

Computed contrast on `#151a2e` is 5.69:1 for `#8b93b5` and 6.87:1 for `#ff7b7b`. Alternative: darker text colours directly on the gradient — rejected because no single colour reaches 4.5:1 across the whole gradient range at the label's possible positions. For example, `#b3261e` reaches only 3.33:1 at the midpoint (computed).

### Check edges against the gradient row colour

Browser checks compare each sampled background pixel with the gradient colour expected for its row: linear interpolation between the two stops by `row / (height − 1)`, tolerance ±8 per channel. A uniform-colour comparison no longer applies.

## Implementation Contract

**Behavior:**

- Opening `/` shows the sky gradient in the scene area immediately, then the model over it once loaded.
- On failure, the error message appears on the dark label over the gradient.
- Dragging or zooming does not move the gradient.
- Other pages and the navigation bar are unchanged.

**Interface / data shape:**

- `WebGLRenderer` options gain `alpha: true`, with `setClearColor(0x000000, 0)` called once after creation.
- `scene.background` stays `null`.
- CSS: `.FactoryScene` has `background: linear-gradient(to bottom, #4a90d9, #dfeaf5)`. `.FactoryScene-message` is a centred label with `background: var(--surface)`, `padding: 8px 16px`, `border-radius: 8px` and `white-space: nowrap`.
- The message elements, roles and texts are unchanged.

**Failure modes:**

- If WebGL is unavailable, the error label shows over the gradient, as today but on the gradient.
- No new failure paths.

**Acceptance criteria:**

- `CI=true npm test` passes, including:
  - the new test "renders on a transparent canvas over the CSS gradient": the fake renderer records `alpha: true` in its constructor options and `setClearColor(0x000000, 0)`, and the scene passed to `render` has `background === null`;
  - every existing FactoryScene and App test still passes. The fake `WebGLRenderer` in src/FactoryScene.test.js has no `setClearColor` today, so it gains a recording `setClearColor` and keeps its constructor options; no existing assertion changes.
- `npm run build` succeeds.
- Browser check (`npm start`, headless Chromium):
  - at 1280×800 and 375×667 after load, edge pixels with no model match the expected row colour within ±8;
  - the top row is about `#4a90d9`, the middle row about `#94bde7` and the bottom row about `#dfeaf5`;
  - while the `factory.glb` request is held, and after a 404, the scene area centre-top pixel is about `#4a90d9`, and the message label's computed background is `rgb(21, 26, 46)`;
  - after a horizontal drag, the top and bottom rows still match.
- Results are recorded in this change's `verification.md`.

**Scope boundaries:**

- In scope: renderer transparency, removing the solid `scene.background`, `.FactoryScene` gradient, `.FactoryScene-message` label, tests and the verification record.
- Out of scope: site theme, other pages, sky/lighting/model changes, camera behaviour (owned by `fix-factory-scene-responsive-framing`).

## Risks / Trade-offs

- [This change and `fix-factory-scene-responsive-framing` edit the same component and the same `factory-scene` spec (different requirements)] → finish (verify, commit, archive) the responsive change first, then apply this one on top. Both deltas only add or modify different requirements, so archive order does not conflict.
- [A transparent canvas costs a little blending work per frame] → negligible next to the model's ~65k triangles; the phone frame-rate check from the responsive change covers it.
- [Antialiased model edges blend against the gradient, so edge pixels touching the model may fall slightly outside the ±8 band] → the browser check samples only the outermost 2 columns, where (after the responsive fix) the model does not reach.
