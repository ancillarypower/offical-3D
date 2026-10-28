## Why

The site shows only the factory model on Home. The team also has a 3D model of the Archimedes screw hydro-power unit (`Archimedes_opt_anim.glb`, screw and water animated), and visitors have no page to see it. A dedicated page lets the screw generator be shown with the same viewing experience as the factory.

## What Changes

- Add a public page at `/archimedes`. The navigation bar gets an "Archimedes" link between "Home" and "Profile", for signed-in and signed-out visitors alike.
- The page shows a new 3D scene that loads `public/models/Archimedes_opt_anim.glb` (copied from `/home/ej/Documents/Archimedes_opt_anim.glb`, 13.7 MB measured with `ls -l`).
- The scene behaves like the Home factory scene's basics: loading text and error alert, sky gradient background, camera fitted to the model at any aspect ratio and re-fitted on resize, pixel ratio capped at 2, slow auto-orbit, drag to rotate, wheel or pinch to zoom with the same limits, the embedded clip `ScrewAndWaterFlow` looping, and full cleanup when leaving the page.
- The size-independent helpers the factory scene already has (fit distance, pixel-ratio cap, model disposal) move to a shared module so both scenes use the same code. The factory scene's behaviour does not change.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

- `archimedes-scene`: the 3D scene that renders the Archimedes screw hydro-power model, with loading and error states, animation playback, camera behaviour and resource cleanup.

### Modified Capabilities

- `home-navigation`: the navigation bar lists "Archimedes" between "Home" and "Profile", and a new requirement says the `/archimedes` page shows the Archimedes scene, fills the area below the navigation bar and does not scroll.

## Impact

- New files: public/models/Archimedes_opt_anim.glb, src/ArchimedesScene.js, src/ArchimedesScene.test.js, src/pages/ArchimedesPage.js, src/threeHelpers.js.
- Modified files: src/FactoryScene.js (imports the shared helpers instead of defining them), src/layout/AppLayout.js (`NAV_ITEMS`), src/App.js (new route), src/App.css (page and scene styles), src/App.test.js (navigation order and the new page).
- Repository size grows by about 13.7 MB because the model file is committed, the same way `factory0.glb` (2.9 MB) is.
- No new npm dependency: three 0.186.1's `GLTFLoader` reads the model's `KHR_mesh_quantization` extension natively.
