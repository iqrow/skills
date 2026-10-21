---
name: teardown-apply
description: Holds one part of a teardown map against the user's own project, in the subject's terms. Reports where the project has the part, which knobs it sets, which troubles show, and what to change. Use when the user picks a node or branch of a map ("how does pacing apply to my book?", "look at my economy as a sink and faucet") or pastes a node link or id. To find a part's name first, use teardown-lookup; to audit the whole project, use teardown-audit.
---

# Teardown apply

A [teardown](../teardown/SKILL.md) map names a subject's parts: what each one does, the question a practitioner asks about it, its knobs, its measures and how it goes wrong. This skill holds one part against one project, so the user and the agent talk about the project in the subject's terms. The map is the teardown's; the findings are the project's.

## Steps

1. **Locate.** Name the teardown, the node `id` and the project (code, drafts, design docs, notes, numbers). A node link `<slug URL>/<id>` or a Copy prompt gives both. The teardown is its folder, its JSON, or the URL of its published page. If the user names the part in their own words, find it with `node <teardown>/kit/map.mjs <slug> --find <words>`; if nothing matches, this is a lookup, so run [teardown-lookup](../teardown-lookup/SKILL.md). Done when the teardown, one node and the project's files are known.
2. **Read the part.** Run `node <teardown>/kit/map.mjs <slug> <id> <parent> <children...>`, with `<teardown>` as the teardown skill's folder and `<slug>` the folder, JSON or URL from step 1. Also read the nodes in its `links`, its `pattern` and any loop whose chain holds it. Done when you hold, for the part and each child: `term`, `ask`, `range`, `trouble`, its catalogue choices, and its sources.
3. **Hold it against the project.** For the part and each child, find where the project has it: file and line, scene, screen, mechanic, step. Mark each one **present** (where, and its current setting or reading), **implicit** (the project does it without naming it), **missing**, or **not applicable** (and why). For each catalogue, name the item the project chose, or that it chose none. Answer the part's `ask` for this project. Check each `trouble` against the project and say what you saw. Done when every child is marked with evidence and every `trouble` is checked.
4. **Answer.** Lead with what matters most for the user's goal: a trouble that shows, a missing part the project depends on, a setting outside `range`. Then the rest, in the map's order. Use the practitioner `term` throughout, with the user's own word beside it the first time. Give each finding a change and a way to see whether it worked. Done when every finding has a change and a check.
5. **Hand off and grow the map.** A choice between approaches is a decision: run teardown-lookup from step 4 (Search outward) with this part as the category. Cite a map source only after you open it; the map is an index of leads. Each teardown-level thing the project has that the map lacks, and each word of the user's that found no node, is a miss: write it back as teardown's [Use the map](../teardown/SKILL.md#use-the-map) section says, and tell the user what changed.

Keep the conversation in the map's terms after the answer, so later work on the part reuses them.
