# MakanMana design QA

## Evidence

- Source visual: `C:\Users\weike\AppData\Local\Temp\codex-clipboard-25382129-8142-41d3-8342-b179aeef6b7f.png`
- Generated design board: `docs/design/makanmana-reference-board.png`
- Home implementation: `docs/qa/home-dark-393x852.png`
- Map implementation: `docs/qa/map-dark-393x852.png`
- Combined comparison input: `docs/qa/reference-vs-implementation.png`
- Viewport: 393 × 852 CSS pixels
- Density/state: mobile web preview, dark theme, English, mock Places adapter, expanded nearby sheet

## Comparison history

### Pass 1

- Home matched the reference hierarchy, but the browser map was an empty charcoal block when a usable web Maps key was unavailable.
- Fixed by adding a clearly labelled Kuala Lumpur preview map with generated real imagery and pressable result markers. A configured Google Maps key replaces this fallback with the live map.

### Pass 2

- Compared the source and implementation together in `docs/qa/reference-vs-implementation.png`.
- Home now matches the source's food-first hero, overlaid search, paired primary actions, compact nearby rows, lime active navigation and modern sans-serif hierarchy.
- Search/Map now matches the source's full-bleed dark map, floating search, lime markers, search-this-area action and restricted expandable nearby sheet.
- The implementation keeps a compact colourful filter row because the requested search and filter behavior must remain reachable; this is a deliberate functional extension of the source.

## Final review

- Fonts: modern Manrope hierarchy matches the compact reference; no editorial serif remains.
- Spacing/layout: no overlap or clipping at 393 × 852; scrollable content stays above the five-tab bar.
- Colour: dark and warm day modes remain available; semantic labels use text and icons and retain automated AA contrast checks.
- Images: generated hero and map-preview assets fit their measured slots; local mock results use clearly scoped demo food photography while live results use Places photos.
- Icons: Ionicons are used consistently; the real MakanMana mark is used for the brand and map pins.
- States/interactions: Home search, filters, GPS, Surprise me, map focus/restore, area search, result navigation, Details, Save authentication gate, in-app Directions, Lists and theme controls were exercised or covered by tests.
- Accessibility: primary controls have accessible names/roles, 44 px minimum targets, text-scaling guards and non-colour status cues.
- Environment note: the web preview identifies when its browser-restricted Maps key is absent; iOS/Android use the native in-app map, and a valid platform-restricted key enables live tiles in release builds.

final result: passed
