# Exploded view: JSON schema

One JSON file per field. `kit/build.mjs` checks it and lists every error before it writes any HTML.

## File

| Field | Required | Meaning |
|---|---|---|
| `title` | yes | Field name, e.g. "Bread" |
| `prompt` | yes | What the reader asked, e.g. "I want to bake bread" |
| `summary` | yes | The professional's mental model in 3–5 plain sentences |
| `root` | yes | `id` of the product node |
| `nodes` | yes | Array of nodes |
| `assembly` | yes | Flatpack steps, in the order practitioners work |

## Node

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | kebab-case, unique, stable across rebuilds |
| `term` | yes | The name practitioners search with |
| `aka` | no | Array: the newcomer's own words for it |
| `kind` | yes | `product`, `part`, `process`, `knob`, `measure`, `loop`, `pattern` or `concept` |
| `plain` | yes | What it is, in 1–2 plain sentences |
| `does` | yes, except product and pattern | What it does for the whole |
| `ask` | yes | The question a practitioner asks about it |
| `range` | no | Typical settings or values |
| `trouble` | no | How you notice it has gone wrong |
| `children` | no | `id`s of the parts it splits into. A node has at most one parent |
| `at` | no | `[x, y, z]` in the parent's `look` coordinates: where this part sits when assembled. The explode starts there |
| `links` | no | `[{ "to": id, "rel": "..." }]` cross-links outside the tree. `rel`: `raises`, `lowers`, `made from`, `made by`, `measured by`, `controls`, `see also`. Read each link as a sentence, this node first: on Dough temperature, `{ "to": "probe-thermometer", "rel": "measured by" }` reads "Dough temperature is measured by a probe thermometer". The viewer shows the reverse on the target ("Measures: Dough temperature") |
| `pattern` | no | `id` of a pattern node this is an instance of |
| `look` / `feel` / `loop` / `plot` | at least one | The visual (below) |
| `variants` | no | Catalogues (below) |
| `sources` | yes, unless `unverified` | Sources you opened (below) |
| `unverified` | no | What is not backed by an opened source yet |
| `deeper` | no | Leaves only: what the next level down would hold |

Kinds:

- **product**: the root, as people meet it.
- **part**: a component of the thing, physical or functional.
- **process**: a step that makes or changes parts.
- **knob**: a setting the maker chooses: a temperature, a time, a cost.
- **measure**: how practitioners check something: a dough temperature reading, time-to-kill.
- **loop**: a feedback loop. Needs `loop`.
- **pattern**: a structure that repeats across fields, e.g. a boosting engine. Patterns sit outside the tree; other nodes point to them with `pattern`.
- **concept**: an idea you think with, but do not set or measure.

Every node except a pattern must be reachable from `root` through `children`.

## Visuals

### `look`: things you can see

`{ "parts": [Part, ...] }`. Any units, y up. The viewer scales the whole look to fit.

| Part field | Meaning |
|---|---|
| `shape` | `lathe`, `cylinder`, `box`, `sphere`, `cone`, `torus`, `plane` or `particles` |
| `profile`, `smooth` | lathe: `[[radius, y], ...]` from bottom to top. Start and end at radius 0 for a solid. `"smooth": true` runs a spline through the points: use it for organic forms (droplets, cones, bottles), and leave it off where a flat top or a sharp rim must stay sharp |
| `cut` | lathe, cylinder: degrees (1–180) cut out of the side that first faces the viewer, so the reader sees inside (a cutaway). Use it on opaque vessels and housings whose contents matter: a can, a kettle, a phone |
| `radiusTop`, `radiusBottom`, `height` | cylinder |
| `size` | box `[w, h, d]`; plane `[w, h]` |
| `radius` | sphere, cone, torus. On a box: the corner radius of its front outline, for slabs with rounded corners (a phone, a card, a TV panel) |
| `height` | cone |
| `tube` | torus thickness |
| `count`, `box`, `size`, `motion` | particles: up to 300 points inside `box` `[w, h, d]`, point `size`, `motion` = `rise`, `settle`, `drift` or `orbit` |
| `pos`, `rot` | `[x, y, z]`; `rot` in degrees |
| `color`, `opacity` | `"#rrggbb"`, 0–1 |
| `material` | `glass`, `liquid`, `foam`, `matte`, `gloss`, `metal`, `screen` or `glow` |
| `svg` | An SVG string painted on the part. Use on `plane` parts, e.g. a screen or an illustration |
| `face` | `"camera"`: the plane always turns to the viewer (a 2.5D card). Only for a card that floats free. Never on a screen or label that is built into another part: it tilts out of its housing as the view turns |
| `slot` | A name, so a catalogue item can replace, recolour or repaint this part |
| `motion` | Non-particle parts: `spin` or `bob` |

Example, a sourdough starter in a jar, risen past the band that marked its level at feeding:

```json
"look": { "parts": [
  { "slot": "jar", "shape": "lathe", "material": "glass", "color": "#ffffff", "opacity": 0.22,
    "profile": [[0, 0], [0.30, 0], [0.32, 0.03], [0.32, 0.84], [0.29, 0.90], [0.29, 1.0]] },
  { "slot": "starter", "shape": "lathe", "material": "foam", "color": "#d9c393",
    "profile": [[0, 0.02], [0.305, 0.02], [0.305, 0.60], [0.29, 0.645], [0.24, 0.68], [0.14, 0.70], [0, 0.705]] },
  { "slot": "band", "shape": "torus", "radius": 0.335, "tube": 0.012, "color": "#c8432f",
    "pos": [0, 0.36, 0], "rot": [90, 0, 0] },
  { "slot": "bubbles", "shape": "particles", "count": 60, "box": [0.44, 0.14, 0.44],
    "pos": [0, 0.76, 0], "size": 0.016, "color": "#f4e7c8", "motion": "rise" }
] }
```

#### Make the look recognisable

Cover the label: the reader should still name the part. Check this in the `check.mjs` screenshots.

- A plain sphere fits only round things: a yeast cell, a bubble, a planet.
- A substance (water, sugar, salt, a dye) is a sample of it: a droplet, a small glass, a test tube, a bag of flour.
- A property is two or three samples that differ: colour is a row of swatches from pale to dark; clarity is a clear glass beside a hazy one.
- A process is its equipment, with particles for what happens inside: an oven with rising steam, a dough tub with rising bubbles.
- A knob is the tool you set it with, showing a typical setting: a thermometer at dough temperature, a timer at 45 minutes, an oven dial.
- A measure is the instrument or scale you read it on: a probe thermometer in a loaf, a pH meter showing 4.0, a colour scale with a marker.
- A flat artefact (a stat card, a table, a HUD, a chart, a label) is a `plane` with an `svg`. Set `font-family` on SVG text; the default is a serif. Keep text inside the `viewBox`. Leave the plane facing the front (+z): the idle camera sways only about 17° each side, so a card turned sideways reads edge-on.
- A parent is the sum of its children. Each child's `at` is the spot in the parent's look where that child lives (the screen, the controls, the crust), so the explode reads as parts leaving the whole. Never add parts only to mark an `at`.
- Use 2–8 parts and the thing's real colours.

Lathe profiles to start from (scale, move and recolour them):

| Form | `profile` |
|---|---|
| Droplet, solid, `"smooth": true` | `[[0, 0], [0.14, 0.03], [0.2, 0.12], [0.19, 0.22], [0.12, 0.33], [0.04, 0.43], [0, 0.47]]` |
| Test tube, open | `[[0, 0], [0.05, 0.005], [0.07, 0.03], [0.07, 0.5]]` |
| Bottle, solid, `"smooth": true` | `[[0, 0], [0.17, 0], [0.18, 0.5], [0.15, 0.6], [0.06, 0.7], [0.055, 0.9], [0.065, 0.92], [0, 0.93]]` |
| Bowl, open | `[[0, 0], [0.3, 0], [0.42, 0.08], [0.45, 0.14]]` |
| Flask, open | `[[0, 0], [0.25, 0], [0.27, 0.02], [0.09, 0.36], [0.08, 0.5], [0.09, 0.52]]` |
| Tank with domed top, solid | `[[0, 0], [0.3, 0], [0.3, 0.7], [0.22, 0.82], [0, 0.86]]` |

### `feel`: ideas you cannot see (bouba/kiki)

Give the idea a body whose character matches it. All numbers are 0–1 unless stated.

| Field | Meaning |
|---|---|
| `shape` | 0 round and soft (bouba) … 1 spiky and sharp (kiki) |
| `energy` | 0 still … 1 fast and restless |
| `weight` | −1 rises … 0 hovers … 1 sinks |
| `warmth` | 0 cold blue … 1 warm amber. Or give `color` |
| `grain` | 0 smooth and glossy … 1 rough and particulate |
| `motion` | `pulse`, `spin`, `drift`, `rise`, `settle`, `jitter` or `orbit` |
| `why` | One line: why this feel fits the idea. Required |

### `loop`: feedback loops and cycles

`{ "type": "reinforcing" | "balancing" | "s-curve" | "cycle", "through": [id, ...] }`. `through` lists the chain of nodes the loop passes through, in order. Reinforcing renders as a widening spiral, balancing as a ring that settles, s-curve (a reinforcing loop meeting a brake) as growth that levels off. Cycle renders as a ring with one stop per step, clockwise from the top, and a bead that goes round at a steady pace. Use cycle for a sequence that repeats without growing or settling by itself: a play loop, a turn, a bake day, a design iteration. If the steps are also the loop's `children`, their leader lines start at their stops.

### `plot`: catalogues of numbers

`{ "x": "Armour", "y": "Damage taken (%)", "series": [{ "name": "Subtract", "item": "subtract", "points": [[0, 100], [10, 90]] }] }`. Shown as a 3D ribbon chart and as a chart in the side panel. `item` ties a series to a catalogue item, so picking the item highlights its line.

## Catalogues: `variants`

`[{ "label": "Vessel", "items": [Item, ...] }]`. A node can carry several catalogues, e.g. Vessel and Style. The first item of each is shown by default. An item has `id`, `name`, `plain` and `sources`, and may have:

- `look`: parts that replace the node's parts with the same `slot`.
- `tint`: `{ "slot": "#rrggbb" }` recolours the parts in that slot.
- `svg`: `{ "slot": "<svg ...>" }` paints the parts in that slot.

Put surface features here: vessel, device, style, genre. Swapping one shows what changes while the deep structure stays.

## Assembly (flatpack)

`[{ "title": "Mix", "text": "...", "adds": [id, ...], "makes": id }]`. `adds` are the parts that come together in this step; `makes` is the node they form (default: `root`). The last step makes the root.

## Source

`{ "label": "...", "url": "https://...", "kind": "...", "page": "pp. 236–238", "flag": "..." }`. `kind`: `book`, `practitioner`, `maker`, `reference`, `standard`, `research`, `forum` or `neighbour`. `page` and `flag` are optional. `flag` notes a weakness: anonymous, anecdote, snippet only, not fully read.
