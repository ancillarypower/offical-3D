## Context

Home (`/`) renders `HomePage`, which mounts `RotatingSphere` (src/RotatingSphere.js): a three.js scene that sizes itself to 100% of its parent, runs a `requestAnimationFrame` loop, handles `window` resize, and disposes everything on unmount. `HomePage` gives it `height: calc(100vh - var(--nav-height))`. In Jest, `src/App.test.js` replaces `RotatingSphere` with a `data-testid="sphere"` stub because jsdom has no WebGL.

The new asset `public/models/factory.glb` was inspected (measured): glTF 2.0 from Blender glTF I/O v5.2.40, 2,740,840 bytes, 802 meshes, 840 nodes, 40 materials, no textures/images, no cameras, ~65,000 triangles, extension `KHR_materials_emissive_strength` (used, not required), and 102 animation clips (cars, conveyor boxes, people, workers, plus `OrbitPivotAction`, which rotates an empty `OrbitPivot` node with no children, so it moves no visible geometry). three 0.186.1 is installed and ships `GLTFLoader` and `OrbitControls` under `three/examples/jsm/`.

## Goals / Non-Goals

**Goals:**

- Home shows the animated factory model instead of the sphere, for every visitor.
- All embedded clips loop; the camera frames the model, auto-orbits slowly, and accepts drag/zoom.
- Visible loading and failure states.
- No leaked WebGL contexts or GPU memory when leaving Home.
- Automated tests for loading/error states, clip playback, and cleanup; manual browser check for rendering and interaction.

**Non-Goals:**

- Editing or optimising the model itself (Draco/meshopt compression, LOD, texture baking).
- Selecting or blending individual clips, or a UI to pause/resume animations.
- Using the model's `CamOrbitTarget` / `CamAerialTarget` helper nodes for camera presets.
- Honouring OS reduced motion inside the 3D scene (explicit product decision, see Decisions).
- Keeping `RotatingSphere` as a fallback.
- Changing the page/menu GSAP transitions.

## Decisions

### Factory scene fills its container

**Supersedes**: add-login-and-home-navigation / RotatingSphere fills its container

A new `FactoryScene` component (src/FactoryScene.js) replaces `RotatingSphere` and keeps the same sizing contract: its mount fills 100% of its parent, and `HomePage` keeps `height: calc(100vh - var(--nav-height))`. Resize is handled on `window` resize like today. `src/RotatingSphere.js` is deleted once nothing imports it.

### Load the model with GLTFLoader from the public folder

`GLTFLoader` (`three/examples/jsm/loaders/GLTFLoader.js`) loads `${process.env.PUBLIC_URL}/models/factory.glb`. The file stays in `public/` so CRA serves it as-is, without passing it through webpack. Alternative: `import factoryUrl from './factory.glb'` — rejected because CRA 5 has no loader rule for `.glb`, and a public URL is simpler to replace. No new dependency.

### Status is React state; the 3D scene is imperative

`FactoryScene` keeps `status` in React state: `'loading' | 'ready' | 'error'`. It renders an overlay `<p role="status">Loading factory…</p>` while loading, or `<p role="alert">Could not load the 3D model.</p>` on error. The three.js scene, renderer, mixer and controls are created imperatively inside one `useEffect`, as `RotatingSphere` does today. An `isDisposed` flag set by the cleanup makes a late `onLoad`/`onError` callback a no-op, so a model that finishes loading after unmount is disposed instead of added. Renderer and canvas are created only after a successful load, so an error or early unmount never leaves a canvas.

### Play every clip with one AnimationMixer

One `THREE.AnimationMixer(gltf.scene)` calls `clipAction(clip).play()` for every clip in `gltf.animations`. Default `LoopRepeat` with infinite repetitions gives the endless loop. `mixer.update(timer.getDelta())` runs once per frame, using `THREE.Timer` (`THREE.Clock` is deprecated since three r183). Alternative: a mixer per clip — rejected because it gives no benefit and adds cost.

### Frame with the bounding sphere and OrbitControls

After load, `Box3.setFromObject(gltf.scene)` gives the centre, and `radius = size.length() / 2`. The distance is `radius / sin(fov / 2)`, so the bounding sphere fits the vertical field of view. The camera starts at `centre + normalize(1, 0.6, 1) × distance`, with `near = distance / 100` and `far = distance × 10`. `OrbitControls` uses:

- `target = centre`, `enableDamping = true`, `enablePan = false`;
- `autoRotate = true`, `autoRotateSpeed = 0.5`;
- `minDistance = radius`, which keeps the camera outside the bounding sphere and therefore outside the box;
- `maxDistance = 3 × distance`.

OrbitControls resumes auto-rotation by itself after a drag. `autoRotateSpeed = 0.5` is an estimate: about one revolution per 2 minutes at 60 fps, derived from the three.js docs (2.0 ≈ 30 s per orbit). The manual check confirms that it reads as "slow". Alternative: use the model's `CamOrbitTarget` node as the target — rejected for now because it couples the code to node names; it can come later.

### 3D scene ignores reduced motion

The user decided that the factory animations and auto-orbit play even when `prefers-reduced-motion: reduce` is set. The page/menu transition rule from the `home-navigation` spec (decision "GSAP transitions with useGSAP and matchMedia") is unchanged. Recorded so a later reviewer does not "fix" it silently.

### Test FactoryScene with mocked three modules

Jest (CRA 5, jsdom) cannot create a WebGL context, so `src/FactoryScene.test.js` uses `jest.mock` factories:

- the `GLTFLoader` module becomes a controllable fake: the test resolves `onLoad` with a small `THREE.Group` and N fake clips, or calls `onError`;
- the `OrbitControls` module becomes a stub that records `dispose`;
- `three` keeps its real exports through `jest.requireActual`, except that `WebGLRenderer` becomes a fake with a real `<canvas>` `domElement`, records `dispose`, and can be made to throw to simulate missing WebGL.

The fakes are plain classes, not `jest.fn().mockImplementation`, because CRA enables `resetMocks`, which clears mock implementations before every test.

`src/App.test.js` mocks `FactoryScene` itself with a `data-testid="factory-scene"` stub, in place of today's sphere stub.

**Letting Jest transpile three** (found during apply): loading the real `three` exports in Jest needs two settings:

- three 0.186.1's `build/three.cjs` requires the ES-module file `build/three.core.js`.
- That file uses class static blocks, which CRA's Babel preset does not enable.

package.json's `jest` section therefore sets `transformIgnorePatterns: ["node_modules/(?!three/)"]`, so Jest transpiles three. It also overrides the default JS `transform` key with `jest/babelTransform.js`. That file is CRA's own Jest transformer (`babel-preset-react-app`) with `@babel/plugin-transform-class-static-block` added. The override reuses CRA's exact key, because CRA merges `transform` overrides after its defaults, and a new key would never match first.

The plugin is already installed as a transitive dependency of the Babel packages; no package was added. Alternatives were rejected:
- ejecting CRA or adding craco — both are heavier than one transformer file;
- mocking all of `three` — this would lose real `Box3` and `AnimationMixer` behaviour in the tests.

## Implementation Contract

**Behavior:**

- Opening `/` (signed in or not) shows "Loading factory…", then the animated factory below the nav bar, slowly orbiting.
- Dragging rotates the view and the wheel or pinch zooms; auto-orbit resumes after release.
- If the model cannot load, "Could not load the 3D model." is shown and no canvas is created.
- Leaving Home removes the canvas and disposes GPU resources.
- The reduced-motion setting does not affect the 3D scene.

**Interface / data shape:**

- `FactoryScene` is a default-exported React component (src/FactoryScene.js) with no props. Its root element has class `FactoryScene` and fills its parent.
- Status texts: `role="status"` "Loading factory…"; `role="alert"` "Could not load the 3D model.".
- Model URL: `${process.env.PUBLIC_URL}/models/factory.glb`.
- `HomePage` renders `<FactoryScene />` inside `.HomePage`.

**Failure modes:**

- Network/parse error → error text, no canvas, nothing thrown to React.
- Unmount during load → the late result is discarded and its geometries and materials are disposed.
- WebGL unavailable at runtime → `WebGLRenderer` throws when created after load; this is caught and shown as the same error text.

**Acceptance criteria:**

- `CI=true npm test` passes, including:
  - src/FactoryScene.test.js: "shows loading text until the model loads", "shows error text when loading fails", "plays every clip on loop", "frames the model and configures orbit controls", "disposes renderer, controls and canvas on unmount", "ignores a model that loads after unmount", "shows error text when WebGL is unavailable";
  - src/App.test.js tests renamed from sphere to factory scene: "factory scene present on Home and absent on Profile", "signed-out visitor sees Home with factory scene".
- `npm run build` succeeds.
- `grep -rn RotatingSphere src` returns nothing.
- Manual browser check with `npm start`:
  - at 1280×800 the model is fully in view below the nav bar and visibly animated, meaning two screenshots 1 s apart differ;
  - dragging rotates the view and auto-orbit resumes;
  - a 404 for `factory.glb` shows the error text;
  - on `/profile` there is no canvas;
  - with reduced motion on, the scene still animates.

**Scope boundaries:**

- In scope: `FactoryScene`, `HomePage` switch, removal of `RotatingSphere`, tests, the Jest settings that let tests load three (package.json `jest` section, jest/babelTransform.js), CSS for the status overlay.
- Out of scope: model optimisation, camera presets, animation controls UI, preloading the model before Home is opened, changes to auth/navigation.

## Risks / Trade-offs

- [2.7 MB download on first Home visit (measured file size)] → loading text covers the wait; compression is a listed non-goal for a later change if load time proves too slow on real networks.
- [~65k triangles + 102 clips may render slowly on low-end phones; frame rate not measured] → measure FPS on a real phone during the manual check; if it is below an acceptable rate, a follow-up change can cap pixel ratio or compress the model.
- [Ignoring reduced motion can bother motion-sensitive users] → explicit user decision recorded above; revisit via a new change if needed.
- [Mocking three in tests can drift from real three behaviour] → the manual browser check covers real rendering, animation, interaction and disposal.
- [Jest relies on `@babel/plugin-transform-class-static-block` being present transitively; it is not declared in package.json] → a future dependency update that drops it makes every test file fail at transform time (loud, not silent); declaring it as a devDependency is the fix if that happens.
- [Jest loads three via `require`, so three logs a `THREE_CJS_DEPRECATED` warning during tests] → test-only noise; the app bundle imports three as ES modules and is unaffected.
