---
name: prior-art
description: Translates a scoped goal or symptom into practitioners' categories, finds established approaches, and recommends a decision and test. Use when choosing an approach with known constraints, when repeated tuning fails, or when asking "what's the standard way", "what is this called" or "is this an X thing?". To browse an unfamiliar field before choosing a question, use teardown.
---

# Prior art

Experts carry rules of the form "when you see X, use Y". Without the name of X you cannot find Y, even when the answer is one search away. Our own words for things hide the category, so the work stays inside the formula we already have. This skill finds the category, then the rules.

This is the targeted search route: the user knows what they want to achieve, but may not know what to search for. Use their code, notes, constraints and previous attempts to answer one decision. [Teardown](../teardown/SKILL.md) is the browse route for discovering the field and its questions. Read [PROMPT.md](PROMPT.md) for a copy-paste version people can use in any chat app.

## Steps

1. **Goal.** State the desired outcome, constraints, current approach (if any), and what has been tried. For a failure, include observable symptoms and numbers. Use available context; ask one focused question only if a missing fact would change the decision. Done when the decision and what a useful result must achieve are explicit.
2. **Translate.** List the user's own words for the parts involved. Give the names practitioners use and at least two plausible candidate categories. Treat these as hypotheses to check, not a diagnosis. Done when the candidates have searchable public names.
3. **Consult a map, if available.** Use a supplied or locally discoverable teardown map relevant to the decision. Follow its skill's **Read a field** instructions: search terms and aliases, then read only matching nodes, their relevant neighbours and catalogues. Use these to refine candidate categories and find source leads. A map is an index, not evidence or a boundary on the search. Done when the relevant leads are extracted, or no relevant map or branch is available; continue either way. Do not build or expand a whole map to answer this question.
4. **Search outward.** Search the web for each candidate category, including alternatives beyond any map's suggestions. Open the underlying sources rather than treating the map's citations as verified. Cover at least three kinds of source from the table below, including one practitioner source. Done when every approach being compared has: the problem it solves, its rule or formula, where it is used, how it fails, and a link you opened.
5. **Check the notes.** Search the user's notes, docs and earlier AI reports for each model you found. Report useful advice that was written down but never applied, with the file and line. If the notes ask this question but give no model, report **question named, model missing**. Done when every model is marked new or already-written-down.
6. **Compare.** Name the current model, if there is one. Which approach fits the goal and constraints? What changes, what does adopting it cost, and what single experiment would distinguish it from the alternatives? Done when there is one experiment with an observable result.
7. **Answer.** Lead with the decision: adopt, switch, keep, or test, followed by the reason and experiment. Offer the relevant map branch as optional surrounding context when its location is known. If the search exposed a map gap, propose a field-level addition without project-specific details; changing the map is a separate task. A list of facts about other people's work is not an answer.

## Where to look

| Kind of source | Examples |
|---|---|
| Textbooks and design books | the standard texts of the field |
| Talks | conference talks and recorded lectures |
| Practitioner channels and blogs | named people who do the work, including short videos |
| Reference implementations | wikis, standards, specs, patch notes, open-source code of successful products |
| Postmortems and case studies | "what went wrong" write-ups |
| Practitioner forums | communities where people compare rules of thumb |
| Neighbouring fields | who solved this outside the field: operations research, economics, control theory, medicine, law |

Two questions to ask every time: "What would an experienced practitioner say first?" and "Who outside this field has already solved this?"

## Rules

- Cite a link or book page you actually opened for every model. Mark anything from memory as unverified.
- Prefer named practitioners. Flag sources with no known author, or that look machine-written, as unverified until a named source agrees.
- Keep the user's goal. A standard model is a candidate, not a verdict; the experiment decides.
