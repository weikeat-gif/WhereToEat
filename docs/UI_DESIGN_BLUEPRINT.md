# MakanMana UI Design Blueprint

## Product Feel

MakanMana should feel like a fast nearby-food decision board. Users are hungry, deciding quickly, and usually on their phones, so the interface should help them search, compare, select, and move quickly.

The UI should be:

- Mobile-first
- Clear at night
- Fast to scan
- Friendly but practical
- Focused on food decisions, not marketing

Avoid landing-page styling. The first screen should always be the actual tool.

## Core Screen Structure

```text
App Header
Search Controls
Food Options List
Quick Maps Search
Restaurant Detail Sheet
```

### App Header

Purpose: show identity and location status.

Content:

- App name: `MakanMana`
- Main title: `Pick food nearby`
- Status badge:
  - `Ready`
  - `Locating`
  - `GPS ready`
  - `Type location`

Design notes:

- Keep compact.
- Use a single status badge on the right.
- Header should feel like an app toolbar, not a hero section.

## Search Controls

Purpose: let users describe what they want and set basic search context.

Controls:

- Craving input
  - Placeholder: `Try nasi, cafe, coffee, halal, cheap...`
  - Search icon inside the input
- Search mode toggle grid:
  - `Open nearby`
  - `Nearby food`
  - `Chill place`
  - `Cheap food`
  - `Drinks/cafe`
  - `Late-night food`
- Location fallback input:
  - Placeholder: `Training venue or area`
- Primary action:
  - `Search nearby food`
- Filter icon button:
  - Opens distance slider sheet

Design notes:

- Use a 2-column toggle grid on mobile.
- Selected category should be strongly visible.
- The main search button should be the strongest visual action.
- Filter stays as an icon button to avoid clutter.

## Food Options List

Purpose: show selectable restaurants users can compare quickly.

Each restaurant card should include:

- Restaurant name
- Cuisine
- `Live` or `Sample` badge
- Open status
- Price range
- Distance
- Vibe sentence
- Inside preview:
  - Example: `Inside: Roti canai, Mee goreng, Nasi lemak, Teh tarik`

Design notes:

- Cards are selection objects, not decorative cards.
- Keep card radius at `8px`.
- Text must stay readable at phone widths.
- Use badges for quick facts.
- The list should feel like a group decision board.

## Restaurant Detail Sheet

Purpose: answer “what is inside this restaurant?”

Opened when a restaurant card is selected.

Content:

- Restaurant name
- Cuisine and vibe summary
- Open status badge
- Price badge
- Distance badge
- `What is inside` section:
  - Menu highlight grid
- `Place details` section:
  - Address
  - Hours
  - Amenities
- Actions:
  - `Open Maps`
  - `Copy`

Design notes:

- Use a bottom sheet on mobile.
- Keep the sheet scrollable.
- Menu highlights should use small fixed cards/chips.
- The detail sheet should make the restaurant feel inspectable without replacing Google Maps.

## Quick Maps Search

Purpose: keep the original broad Google Maps handoff available.

Content:

- Generated Maps URL
- `Open Maps`
- `Share`
- `Copy link`

Design notes:

- This is secondary to the restaurant list.
- Keep below the food options.
- Useful when users want to leave the app and browse Maps directly.

## Visual System

### Color Roles

Use colors by purpose, not decoration.

- Primary: search actions, selected state, strongest buttons
- Accent: urgent or useful food status such as `Open now`
- Secondary: neutral status badges
- Muted: descriptions, helper copy, less important metadata
- Card/background: warm light surface suitable for night use

Current color direction:

- Teal primary
- Warm amber accent
- Soft warm background
- Dark readable text

Avoid making the app one-note teal. Amber and neutral surfaces should balance it.

### Typography

Use system UI fonts.

Recommended hierarchy:

- App title: bold, compact, around `24px`
- Card title: `18px`
- Body: `14px-16px`
- Metadata/badges: `12px`

Rules:

- Do not use huge hero typography.
- Do not scale text with viewport width.
- Avoid negative letter spacing.
- Prioritize readability during night use and quick decisions.

### Components

Use shadcn/ui-style components:

- `Button`
- `Card`
- `Badge`
- `Input`
- `Slider`
- `ToggleGroup`
- `Sheet`
- `Sonner` toast

Use lucide icons:

- `MapPin`
- `LocateFixed`
- `Search`
- `Filter`
- `Clock`
- `Utensils`
- `Coffee`
- `Navigation`
- `Share`
- `Copy`
- `Info`

## Interaction States

### Location

States:

- `idle`: user has not searched yet
- `requesting`: GPS request in progress
- `granted`: GPS search available
- `denied`: use manual location
- `unavailable`: browser does not support geolocation

### Restaurant Data

States:

- Live results loaded
- Live results empty, show sample results
- Live request fails, show sample results and toast
- Search filter has no matches

### Selection

When user taps a restaurant:

- Open detail sheet
- Preserve list position behind the sheet
- Give clear `Open Maps` and `Copy` actions

## Mobile Layout Blueprint

```text
┌────────────────────────────────────┐
│ MakanMana                   Ready  │
│ Pick food nearby                   │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Open now   Chill   Nearby food     │
│                                    │
│ Search nearby food                 │
│ [ Search craving input           ] │
│                                    │
│ [Open nearby] [Nearby food]        │
│ [Chill place] [Cheap food]         │
│ [Drinks/cafe] [Late-night food]    │
│                                    │
│ [ Location fallback              ] │
│                                    │
│ [ Search nearby food        ] [⚙] │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Food options             Select one│
│                                    │
│ ┌────────────────────────────────┐ │
│ │ Restaurant name          Live  │ │
│ │ Cuisine                        │ │
│ │ Open | $ | 1.2 km              │ │
│ │ Vibe sentence                  │ │
│ │ Inside: nasi, roti, drinks...  │ │
│ └────────────────────────────────┘ │
│                                    │
│ More restaurant cards...           │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Quick Maps search                  │
│ Generated Maps URL                 │
│ [ Open Maps ] [ Share ]            │
│ [ Copy link ]                      │
└────────────────────────────────────┘
```

## Detail Sheet Blueprint

```text
┌────────────────────────────────────┐
│ Restaurant Name                    │
│ Cuisine · Vibe                     │
│                                    │
│ Open status | $ | 1.2 km           │
│                                    │
│ What is inside                     │
│ [Roti canai] [Nasi lemak]          │
│ [Mee goreng] [Teh tarik]           │
│                                    │
│ Place details                      │
│ Address: ...                       │
│ Hours: ...                         │
│ Amenities: ...                     │
│                                    │
│ [ Open Maps ] [ Copy ]             │
└────────────────────────────────────┘
```

## Future UI Additions

Good next features:

- Saved favorite places
- Team voting
- Halal-only filter
- Budget filter
- Open-now confidence display
- Photo preview if using a paid Places API later
- Group share card for WhatsApp/Telegram
- Training venue presets

Keep these future additions inside the same structure:

- Search controls
- Food options
- Restaurant detail
- Team decision actions

Do not add a marketing homepage unless the project becomes public-facing.
