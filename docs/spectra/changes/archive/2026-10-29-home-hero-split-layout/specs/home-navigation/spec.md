## MODIFIED Requirements

### Requirement: Home page shows the factory scene

The system SHALL render the factory scene (see the `factory-scene` capability) on the Home page (`/`) for every visitor, signed in or not, filling the whole page at all times, and SHALL unmount it when the user navigates away from Home. The page's height SHALL be the visible viewport height, where the visible viewport height follows mobile browser toolbars as they expand or collapse (`dvh`), falling back to the layout viewport height (`vh`) in browsers without `dvh` support. The Home page SHALL NOT scroll.

The Home page SHALL show the slogan "以 AI 驅動虛擬電廠引領臺灣能源轉型" as its only level-1 heading, inside a card that floats over the factory scene and reserves no layout space, styled like the floating navigation bar (dark translucent background, background blur, thin light border, rounded corners). When the viewport is wider than 768px the card SHALL float at the left of the page with a visible gap from the left edge, vertically centred, and SHALL be no wider than two fifths of the viewport width. When the viewport is 768px wide or less the card SHALL float near the bottom-left of the page with a visible gap from the left and bottom edges, below the factory model so that it covers no clickable building or marker in the overview, no wider than three fifths of the viewport width, with a smaller slogan font than on wider screens, and the factory model SHALL NOT be moved to avoid the card.

While no building is focused (the overview) and the viewport is wider than 768px, the system SHALL tell the factory scene which part of the page the card covers, so the factory model is shown centred in the uncovered part; at 768px or less the covered area SHALL be empty and the model SHALL stay centred on the whole scene (see "Factory scene keeps the model clear of a covered area" in the `factory-scene` capability). While a building is focused, or while the camera is flying to one, the card SHALL be hidden from view and from assistive technology and the covered area SHALL be empty. When the scene returns to the overview, the card and the covered area SHALL be restored. Only the card SHALL fade or hide: the factory scene SHALL stay fully visible, at full size, with every object drawn, throughout the switch. When the user's system requests reduced motion (`prefers-reduced-motion: reduce`), the card SHALL appear and disappear immediately; otherwise it SHALL fade.

#### Scenario: Navigate between Home and Profile

- **WHEN** a signed-in user goes from `/` to `/profile` and back to `/`
- **THEN** exactly one factory scene is present on Home and none is present on Profile

#### Scenario: Signed-out visitor sees the factory scene

- **WHEN** a visitor who is not signed in opens `/`
- **THEN** exactly one factory scene is present and the heading "以 AI 驅動虛擬電廠引領臺灣能源轉型" is shown

#### Scenario: Mobile browser toolbar visible

- **WHEN** a visitor opens `/` in a mobile browser whose address bar is expanded
- **THEN** the factory scene spans from the top to the bottom of the visible screen and the page does not scroll

#### Scenario: Desktop floating slogan card

- **WHEN** a visitor opens `/` on a 1280px-wide, 800px-tall viewport and no building is focused
- **THEN** the factory scene spans the whole screen, the slogan card floats over it at the left with a gap from the left edge and is no wider than 512px, and the factory model appears to the right of the card rather than under it

#### Scenario: Narrow floating slogan card

- **WHEN** a visitor opens `/` on a 375px-wide viewport and no building is focused
- **THEN** the factory scene spans the whole screen with the factory model centred on it, and the slogan card floats over it near the bottom-left with gaps from the left and bottom edges, below the model's ground and clear of both markers, no wider than 225px, with a slogan font smaller than at 1280px

#### Scenario: Focusing a building hides the card

- **WHEN** a visitor on a 1280px-wide viewport clicks the Office in the factory scene
- **THEN** the slogan card is no longer visible or exposed to assistive technology, the factory scene still spans the whole screen, and the Office ends up centred on the screen

#### Scenario: Scene stays visible while the card fades

- **WHEN** a visitor on a 1280px-wide viewport clicks the "Office" marker and the camera flies to the Office
- **THEN** on every frame of the flight the scene canvas stays 1280×800 and fully opaque, and only the card's opacity changes

#### Scenario: Returning to the overview restores the card

- **WHEN** the Office is focused and the visitor presses Esc
- **THEN** the slogan card is shown again and the factory model returns to the uncovered part of the screen as in "Desktop floating slogan card"

#### Scenario: Reduced motion shows and hides the card at once

- **WHEN** a visitor whose system requests reduced motion clicks the Guard House
- **THEN** the slogan card is hidden immediately, with no fade
