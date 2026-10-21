---
name: teardown-lookup
description: Finds the prior art for a problem. Translates a scoped goal or symptom into practitioners' categories, finds established approaches, and recommends a decision and test. Use when choosing an approach with known constraints, when repeated tuning fails, or when asking "what's the standard way", "what's the prior art", "what is this called", "is this on the map?" or "is this an X thing?". To browse an unfamiliar subject, use teardown; to hold a known part of a map against a project, use teardown-apply.
---

# Teardown lookup

Experts carry rules of the form "when you see X, use Y". Without the name of X you cannot find Y, even when the answer is one search away. Our own words for things hide the category, so the work stays inside the formula we already have. This skill finds the category, then the rules.

This is the lookup use of a [teardown](../teardown/SKILL.md) map: "Is this on the map, and what is it called?" The user knows what they want to achieve, or what is going wrong, but not what to search for. Use their code, notes, constraints and previous attempts to answer one decision. Teardown makes the map; its [Use the map](../teardown/SKILL.md#use-the-map) section lists the other uses. Read [PROMPT.md](PROMPT.md) for a copy-paste version people can use in any chat app.

## Steps

1. **Goal.** State the desired outcome, constraints, current approach (if any), and what has been tried. For a failure, include observable symptoms and numbers. Use available context; ask one focused question only if a missing fact would change the decision. Done when the decision and what a useful result must achieve are explicit.
2. **Translate.** List the user's own words for the parts involved. Give the names practitioners use and at least two plausible candidate categories. Treat these as hypotheses to check, not a diagnosis. Done when the candidates have searchable public names.
3. **Consult a map, if available.** Use a supplied or locally discoverable teardown relevant to the decision. Follow its skill's **Read a teardown** instructions: search terms and aliases, then read only matching nodes, their relevant neighbours and catalogues. Use these to refine candidate categories and find source leads. A teardown is an index, not evidence or a boundary on the search. Record each **miss**: a word of the user's or a candidate category that found no node. Done when the relevant leads and misses are listed, or no relevant teardown is available; continue either way, answering from the search rather than from a teardown built first.
4. **Search outward.** Search the web for each candidate category, including alternatives beyond any map's suggestions. Open the underlying sources rather than treating the map's citations as verified. Cover at least three kinds of source from the table below, including one practitioner source. Done when every approach being compared has: the problem it solves, its rule or formula, where it is used, how it fails, and a link you opened.
5. **Check the notes.** Search the user's notes, docs and earlier AI reports for each model you found. Report useful advice that was written down but never applied, with the file and line. If the notes ask this question but give no model, report **question named, model missing**. Done when every model is marked new or already-written-down.
6. **Compare.** Name the current model, if there is one. Which approach fits the goal and constraints? What changes, what does adopting it cost, and what single experiment would distinguish it from the alternatives? Done when there is one experiment with an observable result.
7. **Answer.** Lead with the decision: adopt, switch, keep, or test, followed by the reason and experiment. Offer the relevant map branch as optional surrounding context when its location is known. A list of facts about other people's work is not an answer.
8. **Grow the teardown.** Add to the misses every teardown-level concept from step 4 that the teardown lacks, then write them back as teardown's [Use the map](../teardown/SKILL.md#use-the-map) section says. Done when every miss is an `aka`, a new node or catalogue item that passes `build` and `verify`, or a `log.md` line saying why it stays out, and the user has been told what changed.

## Where to look

| Kind of source | Examples |
|---|---|
| Textbooks and design books | the standard texts of the subject |
| Talks | conference talks and recorded lectures |
| Practitioner channels and blogs | named people who do the work, including short videos |
| Reference implementations | wikis, standards, specs, patch notes, open-source code of successful products |
| Postmortems and case studies | "what went wrong" write-ups |
| Practitioner forums | communities where people compare rules of thumb |
| Neighbouring subjects | who solved this outside the subject: operations research, economics, control theory, medicine, law |

Two questions to ask every time: "What would an experienced practitioner say first?" and "Who outside this subject has already solved this?"

## Rules

- Cite a link or book page you actually opened for every model. Mark anything from memory as unverified.
- Prefer named practitioners. Flag sources with no known author, or that look machine-written, as unverified until a named source agrees.
- Keep the user's goal. A standard model is a candidate, not a verdict; the experiment decides.
