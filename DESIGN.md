---
name: GeoInfo
description: A printed topographic map sheet, used as a website for a Kosovo surveying and traffic engineering firm.
colors:
  globe-blue: "#2167c4"
  globe-blue-hover: "#1a54a3"
  globe-blue-bright: "#2f80dc"
  globe-blue-light: "#74b1f2"
  globe-blue-tint: "#d6e5f8"
  logo-indigo: "#29166f"
  validation-red: "#b3361a"
  map-paper: "#f6f7f4"
  paper-tint: "#edefe9"
  paper-shade: "#e3e6df"
  planimetry-ink: "#141714"
  ink-secondary: "#394039"
  ink-tertiary: "#5f675f"
  hairline: "rgb(20 23 20 / 0.14)"
  hairline-strong: "rgb(20 23 20 / 0.3)"
  contour-bistre: "#9a5b2e"
  contour-bistre-light: "#c4936c"
  hydro-cyan: "#1f8ac0"
  hydro-cyan-deep: "#16709f"
  hydro-cyan-light: "#7bbfdf"
  hydro-tint: "#dbeef6"
  vegetation-tint: "#d6e7c0"
  vegetation-ink: "#55813a"
  negative-ground: "#121512"
  negative-ground-2: "#1c201c"
  negative-text: "#e9ece6"
  negative-text-2: "#a3aba3"
typography:
  display:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "clamp(3.1rem, 1.2rem + 6.4vw, 6rem)"
    fontWeight: 790
    lineHeight: 0.92
    letterSpacing: "-0.04em"
    fontVariation: "'wdth' 112"
  headline:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 1.3rem + 3.2vw, 4.25rem)"
    fontWeight: 760
    lineHeight: 0.98
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 108"
  title:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.2rem, 1.05rem + 0.5vw, 1.45rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 102"
  lede:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.1rem, 1rem + 0.45vw, 1.35rem)"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
    fontVariation: "'wdth' 100"
  label:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 560
    letterSpacing: "0.09em"
    fontVariation: "'wdth' 85"
  place-name:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1rem + 2vw, 2.9rem)"
    fontWeight: 720
    lineHeight: 1
    letterSpacing: "0.1em"
    fontVariation: "'wdth' 116"
  coordinate:
    fontFamily: "Martian Mono Variable, Martian Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    fontFeature: "'tnum'"
    fontVariation: "'wdth' 87.5"
rounded:
  none: "0px"
  hair: "1px"
  sm: "2px"
spacing:
  band: "24px"
  band-sm: "16px"
  gutter: "clamp(16px, 3.6vw, 56px)"
  topbar: "68px"
  container: "1360px"
  logo: "172px"
components:
  button-accent:
    backgroundColor: "{colors.globe-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0 22px"
    height: "52px"
  button-accent-hover:
    backgroundColor: "{colors.globe-blue-hover}"
    textColor: "#ffffff"
  button-accent-hover-negative:
    backgroundColor: "{colors.globe-blue-bright}"
    textColor: "#ffffff"
  button-line:
    backgroundColor: "{colors.map-paper}"
    textColor: "{colors.planimetry-ink}"
    rounded: "{rounded.sm}"
    padding: "0 22px"
    height: "52px"
  button-line-hover:
    backgroundColor: "{colors.planimetry-ink}"
    textColor: "{colors.map-paper}"
  button-small:
    padding: "0 16px"
    height: "40px"
  logo:
    width: "{spacing.logo}"
  lang-switch-on:
    backgroundColor: "{colors.planimetry-ink}"
    textColor: "{colors.map-paper}"
    rounded: "{rounded.hair}"
    padding: "5px 9px"
  readout:
    backgroundColor: "{colors.map-paper}"
    textColor: "{colors.planimetry-ink}"
    typography: "{typography.coordinate}"
    rounded: "{rounded.none}"
    width: "288px"
  order-field:
    backgroundColor: "{colors.map-paper}"
    textColor: "{colors.planimetry-ink}"
    rounded: "{rounded.none}"
    padding: "12px 18px 14px"
  order-field-error:
    textColor: "{colors.validation-red}"
  segment-on:
    backgroundColor: "{colors.negative-text}"
    textColor: "{colors.planimetry-ink}"
    rounded: "{rounded.hair}"
    padding: "8px 12px"
---

# Design System: GeoInfo

## Overview

**Creative North Star: "The Map Sheet"**

Every surface is a printed 1:25 000 topographic sheet. The page is paper; colour arrives as print plates (planimetry black, contour bistre, hydro cyan, vegetation green), each with a fixed cartographic meaning, plus one accent taken from the logo's globe. Structure comes from map furniture: a double neatline with coordinate ticks, registration marks, hairline rules, leader lines, scale bars and an imprint strip. The furniture organises the content; it is not ornament.

Density follows a working map. Margins are generous, labels are small and set on the drawing itself, and numbers are tabular. Drawings are built from real geometry (terrain, OSM building footprints, parcels, traverses, traffic) and animate the way a surveyor works: stations fire rays, readouts resolve digit by digit, boundaries are staked point by point. The one deliberate inversion is the traffic band, printed as a film negative of the black plate.

The system rejects the category default of a stock-photo hero over a grid of blue icon cards. It uses no cards, no decorative shadows and no gradients on surfaces.

**Key Characteristics:**
- Paper-white ground, never cream; colour is plate ink with cartographic meaning.
- One state and action colour: the logo's globe blue.
- The brand mark is the vector GEO-globe-Info logo, never retyped as text.
- Containers are framed by a neatline (a 1px rule outside a 1.5px rule), never lifted by shadow.
- Sections are bands divided by full-width ink rules and hairlines.
- Archivo's width axis does the typographic work: wide for titles, condensed and spaced for labels, italic for water.
- Mono appears only where a number is a coordinate or a measurement.
- Every drawing has a defined final state, and reduced motion shows that state.

## Colors

Four print plates on map paper, one accent from the logo's globe, and a negative of the black plate for one band.

### Primary
- **Globe Blue** (globe-blue): the accent as a fill and as survey linework. Primary button fills (with white text), survey rays, corner stakes, setback and offset lines, batter boards, claim A, the closing leg of the process traverse, the caret, and the fifth chip of the imprint colour bar. At 0.05 to 0.1 alpha it tints the surveyed boundary and the triangulation net.
- **Globe Blue Hover** (globe-blue-hover): the accent button's hover on paper.
- **Globe Blue Bright** (globe-blue-bright): the accent as a mark. Active nav and legend diamonds, station centre dots, hit shots, set stones, measure points, leader dots, the focus outline, the field focus bar, the underline sweeps on partner names and the phone number, the selected lot (at 0.22 alpha), the native `accent-color`, and the accent button's hover inside the traffic band.
- **Globe Blue Light** (globe-blue-light): the accent on dark grounds only. Text selection, the PTV mark's dot and discipline bullets in the traffic band; the brand word in the footer sign.
- **Globe Blue Tint** (globe-blue-tint): text selection on paper, and the fill of the highlighted building in cadastral drawings.

### Secondary
- **Hydro Cyan** (hydro-cyan, hydro-cyan-light, hydro-tint): water only. Rivers (hydro-cyan), streams (hydro-cyan-light), lake fills (hydro-tint), flood zones, flood-line levels and water utilities. It is a map cyan, deliberately greener than the accent so the two never read as one colour.
- **Hydro Cyan Deep** (hydro-cyan-deep): italic water labels, where the plate needs more contrast as lettering than as line.
- **Contour Bistre** (contour-bistre, contour-bistre-light): relief first. Index and intermediate contours, relief labels and the elevation value (H) in the probe; by extension the earthen and second-party lines: sewer lines, easement hatching, and claim B in a boundary dispute.

### Tertiary
- **Vegetation** (vegetation-tint, vegetation-ink): forest and green fills on the plate, parcel fill on the isometric drawing, trees.

### Neutral
- **Map Paper** (map-paper): the page ground and the fill behind every framed instrument.
- **Paper Tint** (paper-tint): alternating band ground (process, partners), the order sheet header.
- **Paper Shade** (paper-shade): footprint, tile and access-road fills; the shaded face of the isometric block.
- **Planimetry Ink** (planimetry-ink): text, neatlines, buildings, roads, station symbols, the footer ground.
- **Ink Secondary** (ink-secondary): body copy in ledes and descriptions, nav at rest.
- **Ink Tertiary** (ink-tertiary): field labels, counts, captions, imprint keys, inactive legend text.
- **Hairline** / **Hairline Strong**: dividers inside instruments and between list rows.
- **Negative Ground / Text** (negative-*): the traffic band, the film negative of the black plate.

### Brand and validation
- **Logo Indigo** (logo-indigo): the logo's lettering, held inside public/logo.svg and the favicon. It is a brand constant, not a UI colour; it does not set text or rules on the page.
- **Validation Red** (validation-red): form validation only. Error text under a field and the recoloured label of an invalid field.

### Named Rules
**The One Accent Rule.** The logo's globe blue is the only state and action colour, and the only colour of survey work laid onto the map. Cyan means water, bistre means relief and earthen lines, green means vegetation, and none of them may signal state or interaction. The single exception is validation red, which marks an invalid form field and appears nowhere else.

**The Cyan Is Not Blue Rule.** Water and the accent sit apart by hue: water is cyan (around 225 to 238 degrees in OKLCH), the accent is globe blue (around 251 to 257). Never draw water in the accent ramp, and never draw an action or a highlight in the hydro ramp.

**The Plate Meaning Rule.** A plate colour may only draw its own feature class. If a new drawing needs colour, choose the plate whose meaning fits, or use ink.

**The Film Negative Rule.** The traffic section is a deliberate negative band: negative ground, negative text, and hairlines in paper at 0.12 to 0.4 alpha. The accent stays globe blue inside it, shifting to globe-blue-light for marks and selection and to globe-blue-bright for button hover. Do not add a second dark band, and do not invert any other section.

## Typography

**Display Font:** Archivo Variable (with Archivo, system-ui)
**Body Font:** Archivo Variable
**Label/Mono Font:** Martian Mono Variable at width 87.5 (75 for sheet ticks and scale labels)

**Character:** A single grotesque that changes voice through its width axis, as map lettering does. Wide heavy caps title the sheet, condensed spaced caps name places, italics mark water. Mono stays in the instrument layer.

### Hierarchy
- **Display** (790, wdth 112, clamp 3.1 to 6rem, 0.92): the hero title only. The footer sign repeats it at up to 8.4rem.
- **Headline** (760, wdth 108, clamp 2.25 to 4.25rem, 0.98, -0.035em): section titles, balanced wrap.
- **Statement** (640, wdth 104, up to 3.9rem, 1.04, max 22ch): the single intro statement.
- **Title** (700 to 740, wdth 102 to 110, 1.2 to 2.35rem): legend groups, values, steps, disciplines.
- **Lede** (400, 1.1 to 1.35rem, 1.45, about 30rem wide): one per section head, set right in a two-column head.
- **Body** (400, 1.0625rem, 1.55; small 0.9375rem): descriptions, capped at 34 to 48ch.
- **Label** (560, wdth 85, 0.75rem, 0.09 to 0.1em, uppercase): field labels, imprint keys, stat keys.
- **Place Name** (720, wdth 116, 0.1em, uppercase): partners are set like places on a sheet. Map labels use the same voice at small sizes: city 760 wdth 118 with 0.32em tracking, town and suburb in spaced caps, hydro italic in hydro-cyan-deep, relief italic in spaced caps.
- **Coordinate** (Martian Mono, wdth 87.5, tabular): E/N/H, Hz/V/SD, distances, areas, scale and tick values, the phone number, station IDs.

### Named Rules
**The Instrument Mono Rule.** Mono is only for coordinates and measurements: values a total station, GNSS receiver or scale bar would produce. Running text, headings and buttons are always Archivo.

**The Station Label Rule.** A station label (ST-1, ST-04) sits beside its triangle symbol, in mono, as part of the drawing. It is never a kicker or eyebrow stacked above a heading.

**The Map Lettering Rule.** Map labels carry a paper halo (paint-order stroke in map-paper, 3 to 3.5px) so they read over linework without a background box.

## Layout

The page is a stack of full-width bands inside a 1360px container with a fluid gutter (16 to 56px). The hero is exactly one viewport (100svh, min 660px, max 1200px): a neatline with a 24px margin band (16px under 860px) holding coordinate ticks, and the map inset inside it. A foot strip below the neatline carries the scale bar, the imprint (contour interval, projection, convergence, data source) and a colour bar of the plate inks and the accent.

Section heads use a two-column grid: the headline on the left and the lede set right and aligned to the bottom. Content splits run about 5:7 (legend, architecture, contact). Travel lines (values, process) stagger their points vertically along a dashed traverse. The legend pairs a scrolling list with a sticky inset map.

Vertical rhythm is generous and fluid: section padding is roughly clamp(72px to 96px, 9 to 13vw, 140px to 190px). Breakpoints are 1100px (nav collapses to a menu; disciplines drop to two columns) and 860px (single column; heads stack; the inset becomes a sticky strip; traverses turn into a dashed vertical line; the topbar drops its small button).

## Elevation & Depth

The system is flat. Depth comes from print logic: framing, plate order, knock-outs and paper halos, not lift. The hero map uses a radial mask that knocks the plate back behind the headline so type sits on quiet terrain. Any `box-shadow` in the build is a zero-blur stroke: a 1px or 1.5px outline that draws a neatline, an inset outline on a line button or toggle, or a 1px hairline under the topbar once the page scrolls.

### Named Rules
**The No Lift Rule.** No decorative shadows. A blurred or offset shadow never appears. `box-shadow` is allowed only as a zero-blur, zero-offset stroke that stands in for a border.

**The Double Neatline Rule.** A container that needs presence is framed like a map: an outer 1px ink rule, a gap (7 to 10px, or the 24px margin band on the sheet), then an inner 1.5px ink rule. The hero sheet, the legend inset, the traffic canvas and the order sheet all use it.

## Shapes

Corners are square. Buttons and toggles take a 2px radius at most, and segment fills take 1px. Instruments, fields and frames are 0. Form comes from survey geometry: triangle station symbols with a centre dot, 45-degree diamonds for active markers, small circles for shots and stones, dash-dot boundary lines (for example 12 4 2 4), dashed rays and offsets, and the 1px tick marks and crosses of a grid. Cadastral linework follows real building footprints and the parcels fitted around them.

## Components

### Logo
The brand mark is the vector logo (public/logo.svg): the GEO wordmark with the globe as its O and an italic Info, lettering in logo indigo, the globe in its own blues. It sits in the top bar as an image at 172px wide, in a link back to the top. The favicon (public/favicon.svg) is the globe alone. The logo is never retyped as live text or restyled.

### Buttons
Flat survey instruments: a solid fill, no gradient, no shadow.
- **Shape:** near-square (2px).
- **Accent (primary):** globe blue fill with white text, 52px tall, 22px side padding, weight 620 at wdth 104. Hover deepens to globe-blue-hover on paper; inside the traffic band it brightens to globe-blue-bright instead. The trailing arrow nudges 3px. Active presses down 1px.
- **Line (secondary):** a paper fill with a 1px inset ink outline. Hover inverts to an ink fill with paper text.
- **Small:** 40px tall, 16px padding, used in the topbar.
- **Focus:** a 2px globe-blue-bright outline, offset 3px, used site-wide.

### Navigation
The top margin of the sheet: the logo, centred index nav, SQ/EN switch and a small accent button. Nav links are ink-secondary at weight 520. The active link gets a 6px globe-blue-bright diamond to its left, scaled in. The language switch is a mono segmented control inside a hairline outline, with an ink fill for the pressed state. The topbar hides on scroll down. Under 1100px a two-line menu button opens a full-screen paper menu of large headline links divided by hairlines.

### Readout and Probe (signature)
A framed instrument at the hero's bottom right: a paper fill, a 1px ink outline, and a mono two-column grid of Hz/V/SD then E/N/H divided by hairlines, with the station symbol and ID in the head. Values roll in digit by digit. The cursor probe is a crosshair with an ink tag of live E/N/H, with H in light bistre.

### Legend and Inset (signature)
The service list is a map legend. Each group row has a drawn symbol (48x24), a title and a mono count, and rows are divided by strong hairlines. When the legend is live, inactive rows keep their text at ink-tertiary at full opacity, and only the symbol and count dim (0.38). The active row restores ink and shows a globe-blue-bright diamond. The sticky inset frame draws each service as an overlay on real terrain, and a leader line runs from the hovered entry to its symbol.

### Cadastral Drawings (signature)
Inset overlays for property, staking, subdivision and dispute work are drawn on one real building and its parcel.
- **Highlighted building:** the subject footprint, filled globe-blue-tint with a 1.6px ink outline.
- **Neighbouring parcels:** thin dash-dot ink (0.8px, 6 3 1.5 3) at 0.55 stroke opacity, as the cadastral plan shows them.
- **Boundary:** the surveyed parcel in a 2px ink dash-dot (12 4 2 4) over a faint accent tint, with stones that fill globe-blue-bright as they are set.
- **Staking:** grid axes in ink dash-dot, corner stakes and offsets in globe blue, and the batter-board offset as a 1px dashed globe-blue ring (3 3) outside the footprint.
- **Subdivision:** lots in paper at 0.65 with ink outlines around a paper-shade access road; the selected lot tints globe-blue-bright at 0.22.
- **Dispute:** two neighbouring footprints highlighted, claim A dashed in globe blue, claim B dashed in contour bistre, and the surveyed truth as a 2.4px solid ink line.

**The Fitted Parcel Rule.** A cadastral drawing is fitted to one real building and its parcel, bounded halfway to its neighbours and kept short of street centrelines. Drawings never overlap existing footprints.

### Partners
Partners are a ruled list set like place names: a 28px line symbol, the name in the place-name voice, a role, and a mono place. Linked names take a 3px globe-blue-bright underline sweep on hover. Technology partners set their role in ink at weight 600. The list currently runs to seven rows.

### Order Sheet (inputs)
The contact form is a survey order sheet inside a double neatline, with a mono header strip on paper tint. Fields are borderless and transparent, divided by hairlines, with uppercase condensed labels. Focus draws a 2px globe-blue-bright bar across the field's bottom from the left. Errors show validation-red text under the field and recolour the label validation red.

### Traverse Lines
Values and process steps are stations on a dash-dot traverse: triangle symbols with a globe-blue-bright centre dot, mono station IDs beside them, and mono leg labels. Process runs as a horizontal pinned traverse that closes with a dashed globe-blue leg.

### Traffic Canvas
A canvas simulation framed by a double neatline in paper alpha, on the negative ground. HUD overlays (segmented toggle, mono stats) sit on near-black panels at 0.85 alpha with inset hairline outlines.

### Motion
Easing is `--ease-out` cubic-bezier(0.16, 1, 0.3, 1) for state and `--ease-io` cubic-bezier(0.65, 0, 0.35, 1) for loops. Drawings build like fieldwork: rays fire, points are staked, lines are drawn, digits resolve. Content reveals rise 18px and fade in, and stay visible without JS.

**The Final State Rule.** Under reduced motion every drawing renders in its final state: the traverse resolved, the axo fully built, the traffic simulation pre-stepped, and the process traverse wrapped vertically instead of pinned. Nothing is withheld because it would otherwise animate.

## Do's and Don'ts

### Do:
- **Do** use globe blue for every action, active and focus state and for survey work laid on the map, and for nothing decorative.
- **Do** use the vector logo as the brand mark, at 172px in the top bar, and the globe alone as the favicon.
- **Do** draw water in hydro cyan, visibly greener than the accent.
- **Do** fit cadastral drawings to one real building and its parcel, bounded halfway to its neighbours.
- **Do** frame important containers with the double neatline: a 1px outer rule, a gap, then a 1.5px inner rule.
- **Do** separate bands with full-width ink rules and rows with hairlines.
- **Do** keep buttons as flat fills: a globe-blue fill with white text, or a paper fill with a 1px inset ink outline.
- **Do** set station labels in mono beside their triangle symbols, inside the drawing.
- **Do** give map lettering a paper halo instead of a background box.
- **Do** keep inactive legend text at ink-tertiary at full opacity, and dim only the symbols and counts.
- **Do** define a final state for every drawing and show it under reduced motion.

### Don't:
- **Don't** use cards, tiles or boxed service grids. Bands are separated by hairlines.
- **Don't** use decorative shadows of any kind. Box-shadow is only a zero-blur stroke.
- **Don't** use cyan, bistre or green for interaction or state. They are plate colours.
- **Don't** use validation red for anything but an invalid form field.
- **Don't** retype or restyle the logo as live text, or use logo indigo as a UI colour.
- **Don't** let a cadastral drawing overlap an existing building footprint.
- **Don't** put kickers or eyebrows above headings, and don't use station labels as kickers.
- **Don't** set prose, headings or buttons in mono. Mono is only for coordinates and measurements.
- **Don't** add a second dark band or invert any section except the traffic film negative.
- **Don't** use a cream ground. Map paper is a cool off-white.
- **Don't** fade inactive text with opacity.
