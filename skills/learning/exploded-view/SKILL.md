---
name: exploded-view
description: Builds a professional's mental model of a whole field as an interactive 3D exploded view. It starts from the finished product as people meet it, splits it into named parts, knobs, loops and catalogues, and lets the reader open any part to the next level down. Use when someone starts something new ("I want to make a game", "I want to write a novel"), asks how a kind of thing works or is made, or wants a field's vocabulary and building blocks. For a scoped problem with existing context, use prior-art.
---

# Exploded view

A professional looks at a finished thing and sees its parts: what each part does, which knobs move it, how it fails, and which patterns repeat across the field. This skill builds that view for a newcomer and renders it as an exploded view. The reader starts at the finished product, splits it apart, and opens any part as far down as they want: turtles all the way down.

Organise by **deep structure**: the parts, knobs and loops that every instance of the field shares. Put **surface features** (style, genre, vessel, device) in catalogues the reader can swap, so a swap shows what changes and what stays. A growth engine is a growth engine in any genre. Time and temperature shape every beer, ale or lager.

## Steps

1. **Root.** Start where people meet the product: a pint in the hand, a game on a phone, a scene on a cinema screen. Pick a typical instance. Make the surface it arrives on a catalogue (vessel, device), and the instance too if it varies (style, genre, scene). Done when the root has a look and at least one catalogue.
2. **Explode.** Split the root into 5–10 parts a practitioner names first: what it is made of, then what makes it. For each part write the practitioner term, the newcomer's words, what it does for the whole, and the question a practitioner asks about it. Done when no part is a surface feature in disguise.
3. **Go down.** Under each part add what controls it: the knobs you set, the measures you read, the process that makes it, and how it goes wrong. Stop where a practitioner acts directly: a setting, a reading, a named rule. Done when every branch ends in something you can set, measure or look up. A first pass is 40–80 nodes.
4. **Loops and patterns.** Find the feedback loops: reinforcing (growth, snowball) and balancing (brake, thermostat). Find the cycles too: a sequence that repeats without growing by itself (a play loop, a turn, a brew day). Make each a `loop` node with its chain of parts. When a structure repeats across the field or across fields (an engine with a brake, an ecology of parts that limit each other), make one `pattern` node and point every instance at it. Done when every loop names its type and chain.
5. **Catalogues.** Wherever practitioners choose between interchangeable options (vessels, formulas, curves, styles, off-flavours), make a catalogue. If the options are numbers, add a `plot` so the reader compares them on one chart. Done when every "which one?" choice is a catalogue, not a sentence.
6. **Flatpack.** Write the assembly order: which parts join into which larger system, step by step, until the product. Use the order practitioners work in. Done when the last step makes the root.
7. **Visuals.** Things you can see get a `look` the reader can name with its label covered: a substance is a sample of it (a droplet, a small glass), a property is samples that differ (swatches pale to dark), a process is its equipment, a knob is the tool you set it with (a thermometer at mash temperature), a measure is the instrument you read it on, a device has the details that tell it apart (a stand, buttons, rounded corners). A child's `at` point is a real feature of its parent's look, where that child lives: the screen, the controls, the bar in the HUD. Never add parts only to mark an `at` point. Ideas you cannot see get a `feel`: a bouba/kiki body whose roundness, motion, weight, warmth and grain carry the idea's character, plus one line on why. Done when every node has a look, feel, loop or plot, and no thing you can see is a bare ball or a felt body.
8. **Sources.** Cite a page you opened for every node: the field's standard texts, named practitioners, makers' documents, standards. Prefer book pages and named people. Mark the rest `unverified`. Done when every node has sources or an `unverified` note.
9. **Build and check.** Write `<field>.json` to [SCHEMA.md](SCHEMA.md) next to the user's work. If a script writes it, keep the script in `<field>-gen/` beside the JSON, with paths relative to the script. The script is then the source for every later change. Then run, with `<skill>` as the folder that holds this file:
   ```sh
   node <skill>/kit/build.mjs <field>.json
   node <skill>/kit/check.mjs <field>.html
   ```
   `build` lists schema errors. `check` opens the page in headless Chrome, clicks through root, explode, focus, catalogue and flatpack, and saves screenshots. That tour opens only a few subtrees, so run `check` again with `--open id,id,...` listing every node that has children. Read every screenshot. Done when both pass and each screenshot shows the part it names.

## Go deeper

When the reader asks to open a leaf ("go deeper on esters"), run steps 2–9 on that node inside the same field: in `<field>-gen/` beside the JSON when it exists, else in the JSON. Keep every existing `id`. The `deeper` field on a leaf says what the next level would hold. The Copy button on a leaf gives the request as `exploded-view: go deeper on "<term>" (<id>) in <path to the JSON>`.

## Share

Every node has its own link. Served from a folder URL, a node is `<folder><id>`, so the server must answer every path in the folder with the page (Caddy: `try_files {path} /index.html`). Opened as a file, or by a URL that ends in `.html`, a node is `#<id>`.

For the web, build with `--public`. That page leaves out the path of your JSON and replaces the Copy prompt with a link to this skill. It is written to `<field>.public.html`.

## Examples

`examples/beer.json` starts from a pint. `examples/game.json` starts from a screen. Build either one to see the target. `examples/fiction-writing-gen/` shows a field written by a script.
