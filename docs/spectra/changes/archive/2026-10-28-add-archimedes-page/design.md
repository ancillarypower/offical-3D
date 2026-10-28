## Context

- **Home today.** Home renders `FactoryScene` (src/FactoryScene.js). It is one component: a `useEffect` loads `models/factory0.glb` with `GLTFLoader` and builds a WebGL renderer with a transparent clear, a hemisphere light and a sun, and an `AnimationMixer` that loops every clip. The camera is fitted with `fitDistance` and driven by `OrbitControls`. A `ResizeObserver` re-fits the camera, and a teardown disposes everything.
- **Factory-only code.** On top of that base, the same effect hides vehicles off the `Ground` node and handles click-to-focus on buildings (Raycaster, GSAP flight, CSS2D labels).
- **The new model.** `/home/ej/Documents/Archimedes_opt_anim.glb` is 13.7 MB. It requires `KHR_mesh_quantization`, has 608 nodes and one clip, `ScrewAndWaterFlow`, 7.2 s long, which animates the screw rotation (`core_001`, `screw_001`) and water foam nodes. The file, node and clip facts were read from the GLB's JSON chunk with a Node script.
- **Navigation.** Pages are added with one `NAV_ITEMS` entry in src/layout/AppLayout.js plus one `<Route>` in src/App.js; the comment above `NAV_ITEMS` says so.
- **Prior decisions this design follows:**
  - *replace-home-sphere-with-factory-model / 3D scene ignores reduced motion*: the factory animations and auto-orbit play even under `prefers-reduced-motion: reduce`, by the user's decision. The Archimedes scene follows the same rule, since the user asked for the same basic behaviour as Home.
  - *fix-factory-scene-responsive-framing / Size Home with dvh and a vh fallback*: the Archimedes page uses the same two-declaration height.
  - *add-factory-scene-gradient-background*: the sky gradient is CSS behind a transparent canvas, with status text on a dark `#151a2e` label.
  - *add-login-and-home-navigation / Use react-router-dom for routing*: the new page is one more route in the public `AppLayout` route.

## Goals / Non-Goals

**Goals:**

- A public `/archimedes` page, linked as "Archimedes" between "Home" and "Profile", that shows the animated Archimedes model.
- The same loading, error, framing, resize, pixel-ratio, orbit, zoom, animation and cleanup behaviour as the factory scene's base.
- One copy of the size-independent helpers shared by both scenes.

**Non-Goals:**

- Click-to-focus, labels, or vehicle hiding in the Archimedes scene.
- Changing the factory scene's behaviour or its tests' expectations.
- A generic model-viewer component that the factory scene is rebuilt on. This is rejected for now; see the decision "Separate ArchimedesScene component with shared helpers".
- Shrinking or re-encoding the model file. `Archimedes_opt.glb` (13.0 MB, no animation) and the 71 MB `Archimedes.glb` are not used.
- Showing download progress while the 13.7 MB file loads.

## Decisions

### Separate ArchimedesScene component with shared helpers

A new component `ArchimedesScene` (src/ArchimedesScene.js) holds the base scene: loader, renderer, lights, mixer, camera fit, `OrbitControls`, `ResizeObserver`, render loop and teardown. It follows the same structure and constants as `FactoryScene`, minus the vehicle and building code.

`fitDistance`, `pixelRatio` and `disposeModel` move to a new module, src/threeHelpers.js, and both scenes import them. `FactoryScene` keeps exporting `fitDistance` by re-exporting it, so `FactoryScene.test.js` and its imports do not change.

Alternative: turn `FactoryScene` into a generic `ModelScene` that takes a model URL and optional factory extras. Rejected for now: the factory effect interleaves focus, flight, label and resize logic with the base setup, and its 83 tests would all have to be rebuilt on the new component. That is a refactor with no visible gain for this page. Duplicating the roughly 100 lines of base setup is the smaller risk; the duplicated part is plain three.js wiring.

### Archimedes page and route

- `ArchimedesPage` (src/pages/ArchimedesPage.js) renders `<div className="ArchimedesPage"><ArchimedesScene /></div>`.
- src/App.js adds `<Route path="/archimedes" element={<ArchimedesPage />} />` inside the public `AppLayout` route, with no `RequireAuth`.
- `NAV_ITEMS` becomes Home, Archimedes (`/archimedes`), Profile.
- The `*` catch-all stays last, so unknown paths still go to `/`.

### Model file location and URL

Copy `/home/ej/Documents/Archimedes_opt_anim.glb` byte for byte to `public/models/Archimedes_opt_anim.glb`. The scene loads `${process.env.PUBLIC_URL}/models/Archimedes_opt_anim.glb`.

### Scene styles reuse the factory look

In src/App.css:

- `.ArchimedesPage` gets the same `height` pair as `.HomePage` (`calc(100vh - var(--nav-height))`, then `calc(100dvh - var(--nav-height))`) and `overflow: hidden`.
- `.ArchimedesScene` and `.ArchimedesScene-message` are added to the selector lists of `.FactoryScene` and `.FactoryScene-message`, and `.ArchimedesScene-message[role='alert']` to the alert rule. So the gradient `#4a90d9` → `#dfeaf5`, the `#151a2e` label and the error colour are defined once.

### Status texts

- While loading: "Loading Archimedes screw…" in an element with `role="status"`.
- On failure: "Could not load the 3D model." in an element with `role="alert"`, the same text as the factory scene.

## Implementation Contract

**Behaviour on `/archimedes`:**

- **Navigation.** Any visitor sees the navigation bar with "Home", "Archimedes", "Profile", then "Log in" or "Logout". The "Archimedes" link has `aria-current="page"` on this page.
- **Loading.** Below the bar, the scene fills the remaining viewport height and the page does not scroll. "Loading Archimedes screw…" shows until the model arrives, over the sky gradient.
- **After load:**
  - The text disappears, and the model is centred and whole in view at any aspect ratio. The fit rule is `fitDistance(radius, 45, aspect)` with `radius` = half the model box diagonal; the start direction is `(1, 0.6, 1)` normalised, as in the factory scene.
  - The camera slowly orbits at `autoRotateSpeed` 0.5 and resumes after a drag. Panning is off.
  - Zoom stays between `radius` and 3 × the current fit distance.
  - `ScrewAndWaterFlow` loops forever, regardless of reduced motion.
- **Resize.** The camera keeps its direction and its distance relative to the fit distance, and the zoom-out limit becomes 3 × the new fit distance. The renderer pixel ratio is `min(devicePixelRatio, 2)` at creation and after each resize.
- **Failure.** A 404, a parse error, or a WebGL renderer that cannot be created all show "Could not load the 3D model." in `role="alert"`, and no loading text.
- **Leaving the page.**
  - The render loop stops, the mixer stops and uncaches, and the controls, every geometry and material, and the renderer are disposed.
  - The canvas is removed and the `ResizeObserver` is disconnected.
  - If the page is left before the download ends, the model is disposed on arrival and no canvas is created.

**Interfaces:**

- src/threeHelpers.js exports `fitDistance(radius, verticalFovDeg, aspect)` (unchanged maths), `pixelRatio()` and `disposeModel(root)`.
- `FactoryScene` still exports `fitDistance`.
- `ArchimedesScene` is the default export of src/ArchimedesScene.js, takes no props and renders `<div className="ArchimedesScene">`.

**Acceptance:**

- `CI=true npm test` passes, including:
  - new tests in src/ArchimedesScene.test.js, with the same fakes as FactoryScene.test.js: the loaded URL, loading and error text, WebGL failure, one looping action per clip, framing at 1280×744 and 375×611, resize re-fit, pixel ratio 3 → 2, unmount disposal, and unmount before load;
  - updated src/App.test.js navigation-order tests and a new test that `/archimedes` shows one Archimedes scene inside `.ArchimedesPage` for a signed-out visitor, with "Archimedes" marked current;
  - all existing FactoryScene tests unchanged.
- `npm run build` compiles.
- In a browser at 1280×800, `/archimedes` shows the screw model with moving water and no page errors; checked with a screenshot.

**Scope:**

- In: the files listed in the proposal's Impact.
- Out: any change to factory-scene behaviour; the non-goals above.

## Risks / Trade-offs

- **[13.7 MB download]** On slow connections the loading text shows for a long time. → Accepted for now, since the user chose the animated file. A progress indicator or a smaller re-encode is a possible follow-up.
- **[Base setup duplicated in two components]** A fix to one scene's base may be missed in the other. → The size-independent helpers are shared. Both test files assert the same base behaviours, so a regression in either is caught by its own tests.
- **[Model orientation or scale unknown until rendered]** The fit uses the bounding box, so any scale is framed. If the model is not y-up, the orbit would look tilted. → The browser screenshot in the final task checks this; glTF is y-up by specification.
