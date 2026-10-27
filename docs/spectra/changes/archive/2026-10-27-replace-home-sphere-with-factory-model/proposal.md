## Why

The Home page currently shows `RotatingSphere`, a placeholder three.js sphere. The project now has a real 3D asset — an animated factory scene (`public/models/factory.glb`, exported from Blender) — and Home should showcase it instead, so the first thing every visitor sees represents the product rather than a generic shape.

## What Changes

- Replace the rotating sphere on the Home page with a `FactoryScene` that loads and renders `public/models/factory.glb`.
- Play all animation clips embedded in the model (vehicles, conveyor boxes, people, workers) on a continuous loop.
- Frame the camera on the loaded model, slowly auto-orbit around it, and let the user drag to rotate and scroll/pinch to zoom; auto-orbit continues after the user releases.
- Show "Loading factory…" while the model downloads and "Could not load the 3D model." if loading fails.
- Release the renderer, controls, animations, geometries and materials when the user leaves Home.
- The 3D scene ignores the OS reduced-motion setting (explicit product decision); the existing reduced-motion rule for page and menu transitions is unchanged.
- **BREAKING** (internal): remove `src/RotatingSphere.js`; nothing else imports it after the switch.

## Non-Goals

Recorded in design.md (Goals / Non-Goals).

## Capabilities

### New Capabilities

- `factory-scene`: Loading, rendering, animation playback, camera behaviour, loading/error states, and cleanup of the factory 3D model.

### Modified Capabilities

- `home-navigation`: removes the requirement "Home page shows the rotating sphere" and adds "Home page shows the factory scene" — Home renders the factory scene instead of the sphere.

## Impact

- Affected code: src/pages/HomePage.js, src/App.test.js, src/App.css; new src/FactoryScene.js and src/FactoryScene.test.js; src/RotatingSphere.js removed.
- Test setup: package.json `jest` section (`transformIgnorePatterns`, `transform`) and new jest/babelTransform.js, so Jest can load three 0.186.1.
- Assets: public/models/factory.glb (2,740,840 bytes, measured) is served as a static file and fetched by the browser when Home opens.
- Dependencies: none added; uses `GLTFLoader` and `OrbitControls` shipped inside the installed three package (0.186.1), and the already-installed (transitive) `@babel/plugin-transform-class-static-block` in tests.
- No backend or API changes.
