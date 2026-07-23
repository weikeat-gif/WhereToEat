# MakanMana Design QA

## Evidence

- Source visual truth: `docs/reference/makanmana-night-food-hunt.png`
- Dark Home implementation: `docs/qa/home-dark-393x852.png`
- Light Home implementation: `docs/qa/home-light-393x852.png`
- Dark Map implementation: `docs/qa/map-dark-393x852.png`
- Dark Details implementation: `docs/qa/details-dark-393x852.png`
- Full-view comparison: `docs/qa/comparison-dark.png`
- Focused Details comparison: `docs/qa/comparison-details-dark.png`
- Browser URL: `http://127.0.0.1:8081`
- Browser viewport and CSS size: 393 x 852 CSS px
- Browser density: deviceScaleFactor 1
- Source pixels: 1693 x 929 (three framed screens)
- Implementation pixels: 393 x 852 per unframed app viewport
- Normalization: comparison canvases preserve the 1693 x 929 source and scale the
  implementation proportionally to the same 929 px height. Device chrome in the
  source is treated as framing, not app content.
- States: dark Home, warm-light Home, dark Map web fallback, dark Details, guest
  Saved gate, and dark/light theme selection.

## Full-view comparison

The implementation preserves the source's food-first night-market direction:
near-black canvas, acid-lime brand/action color, large condensed-looking display
hierarchy, vivid food photography, compact semantic chips, and persistent
four-tab navigation. The Home composition is intentionally adapted from the
source: Nearby now is primary and Surprise me is secondary, following the
approved product plan. The warm-light mode keeps the hero photographic and the
semantic chips colorful while moving surrounding surfaces to warm off-white.

The web Map state correctly presents an explicit accessible fallback rather than
pretending to render a native Google map. The native build owns the real map
canvas.

## Focused comparison

`docs/qa/comparison-details-dark.png` compares the source Details screen and the
rendered implementation in one artifact. The visible fidelity surfaces match:
full-bleed burger photography, title and rating overlay, open-status treatment,
category chips, description, Popular picks, and the fixed Directions action.
The implementation uses a tighter hero crop and slightly larger body type; these
are acceptable responsive adaptations at the 393 px viewport.

## Required fidelity surfaces

- Fonts and typography: hierarchy, bold display weight, compact metadata, line
  height, wrapping, and truncation are readable and visually aligned with the
  source. The system font is an acceptable native substitute; no P0-P2 mismatch.
- Spacing and layout rhythm: 16 px page rhythm, rounded hero/cards, compact chips,
  fixed bottom navigation, and fixed Details action remain stable at 393 x 852.
  Horizontal chip/result rows deliberately reveal a partial next item as a
  scroll affordance.
- Colors and visual tokens: lime brand/action color, dark neutrals, warm-light
  canvas, teal/green/gold/orange semantic colors, borders, and opacity preserve
  the intended contrast in both themes. Meaning also uses text/icons.
- Image quality and asset fidelity: generated night-market, burger, and nasi
  lemak raster assets are sharp, correctly cropped, and match the Malaysian food
  art direction. No placeholder, emoji, CSS-drawn, or handcrafted SVG substitute
  is used for target imagery.
- Copy and content: English copy is concise and standalone. Restaurant metadata,
  status, filters, Saved gate, and theme descriptions are understandable without
  relying on the original mock.
- Icons: Expo vector icons are consistent in weight and paired with labels where
  meaning matters.
- Accessibility and interaction: semantic buttons/tabs/radios, alt labels,
  visible text labels, practical touch targets, and non-color cues were observed.

## Primary interactions tested

- Switched System/Light/Dark appearance and confirmed light/dark rendering.
- Opened Home, Map, Saved, and Profile tabs.
- Ran Surprise me and confirmed it selects a valid current result and changes to
  Try another.
- Opened Jalan 21 Burger from Home and confirmed the Details route.
- Confirmed the guest Saved screen requires sign-in.
- Confirmed the Map web fallback exposes location and Search this area controls.

## Console check

- JavaScript errors: none.
- One non-blocking framework warning: `props.pointerEvents is deprecated. Use
  style.pointerEvents`, originating from the Expo Router web development bundle.

## Findings

- [P3] Horizontal rows depend on the partial next chip/card as the scroll cue.
  Location: Home filter row and Map filter/result rows.
  Evidence: the rightmost item is intentionally clipped at 393 px.
  Impact: some users may not immediately notice horizontal scrolling.
  Follow-up: add a subtle end fade or short first-use nudge without shrinking the
  colorful labels.

- [P3] The third discovery listing reuses the nasi lemak photograph.
  Location: Home discovery data.
  Evidence: Wok & Walk uses the same asset family as Nasi Lemak Antarabangsa.
  Impact: reduces content authenticity but does not affect layout or core use.
  Follow-up: provide a distinct char kway teow raster asset.

## Comparison history

- Pass 1: no actionable P0, P1, or P2 differences were found. No visual fixes
  were required. The approved Nearby/Surprise priority and native-system font are
  intentional product adaptations, not fidelity defects.

## Follow-up polish

- Add a distinct Wok & Walk image.
- Consider a subtle affordance for horizontally scrollable rows.
- Re-check the native Google map and dynamic-type layouts on representative iOS
  and Android devices once development credentials are configured.

## Final result

final result: passed
