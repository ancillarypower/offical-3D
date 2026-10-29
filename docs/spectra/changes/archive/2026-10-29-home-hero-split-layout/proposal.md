## Why

The Home page shows only the 3D factory, with no statement of what the company does, and visitors cannot tell which buildings can be clicked unless they happen to hover over one with a mouse (touch screens give no hint at all). The user wants the official slogan on the Home page and an obvious marker on every clickable building. After seeing a first version with the slogan in its own column, the user asked that the slogan float over the scene as a card, the same way the navigation floats, instead of taking up part of the page.

## What Changes

- The factory scene always fills the whole Home page.
- Home page overview: the slogan "以 AI 驅動虛擬電廠引領臺灣能源轉型" is the page's main heading, shown in a floating card styled like the floating navigation (dark translucent background, blur, thin border, rounded corners). On screens wider than 768px the card floats on the left, vertically centred, no wider than about 2/5 of the screen. At 768px or less it floats near the top, below the ☰ toggle, inset from both sides.
- In the overview the factory model is centred in the part of the scene the card does not cover (right of the card on desktop, below it on narrow screens), so the card does not hide the factory.
- Choosing a building (clicking it or its marker) fades the card out and removes the model offset while the camera flies to the building, so the building is centred on the full page. Returning to the overview (Esc, or clicking a point that is not a clickable building) fades the card back in and restores the offset while the camera flies back. With reduced motion requested, the card appears and disappears without fading; the camera movement is unchanged.
- Every clickable building (Office, Guard House) shows a marker above it: a bright accent-coloured dot with a continuously expanding halo. The marker follows the building as the view rotates or zooms. Activating a marker (click, tap, or keyboard) does the same as clicking its building. While a building is focused its marker is hidden and its name label shows; the other building's marker stays visible. With reduced motion requested, the halo does not animate.
- The factory scene reports which building is focused (or none) to the page that hosts it, and accepts from that page the area a floating element covers, so it can keep the model clear of it.
- Unchanged: the Archimedes page, the floating navigation, the camera flight, labels, click/drag rules, and the 3D animations.

## Non-Goals

- Slogan, markers, or a covered-area offset on the Archimedes page or any page other than Home.
- Additional text on Home (sub-headings, buttons, links) beyond the one slogan.
- Making more buildings clickable or changing building names.
- Reduced-motion handling inside the 3D scene (decision "3D scene ignores reduced motion", change `replace-home-sphere-with-factory-model`, stays in force).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `home-navigation`: "Home page shows the factory scene" gains the floating slogan card, the model offset beside it, and the card hiding while a building is focused.
- `factory-scene`: adds clickable-building markers, the focus report to the hosting page, and keeping the model clear of a covered area given by the hosting page.

## Impact

- Affected specs: home-navigation, factory-scene
- Affected code:
  - Modified: src/FactoryScene.js, src/FactoryScene.test.js, src/pages/HomePage.js, src/App.css
  - New: src/pages/HomePage.test.js
  - Removed: none
