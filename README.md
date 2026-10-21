# Skills

Agent skills for Claude Code, Codex and other coding agents. Each skill is a folder with a `SKILL.md` and the scripts it needs.

## Install

Pick one way per agent.

<details>
<summary><b>Claude Code</b></summary>

```sh
claude plugin marketplace add iqrow/skills
claude plugin install iqrow-skills@iqrow
```

</details>

<details>
<summary><b>Codex</b></summary>

```sh
codex plugin marketplace add iqrow/skills
codex plugin add iqrow-skills@iqrow
```

</details>

<details>
<summary><b>Any other agent</b></summary>

The [Skills CLI](https://github.com/vercel-labs/skills) copies the skills into your agent's skills folder:

```sh
npx skills@latest add iqrow/skills
```

</details>

## Skills

### Learning

Teardown makes a map of a subject. Three `teardown-*` skills (lookup, apply, audit) use that map on your own project, and each one grows the map when it finds something the map lacks. teardown-upload shares a finished map.

- **[teardown](skills/learning/teardown/SKILL.md)**: makes the map. It takes a whole subject apart the way its professionals see it, as an interactive 3D exploded view you browse. It starts at the finished product, splits it into named parts, knobs, loops and catalogues, and opens any part to the next level down, so you find the questions you did not know to ask. Say "I want to bake bread" or "how is a game made?", or ask for the skill by name. Needs Node.js 22 or later, and Chrome to check the page. Examples: [Teardown Atlas](https://teardownatlas.com).
- **[teardown-lookup](skills/learning/teardown-lookup/SKILL.md)**: "Is this on the map, and what is it called?" Finds the prior art for a problem. For when you know what you want, or what is going wrong, but not its name. It translates your goal or symptom into the categories practitioners use, finds the approaches they already rely on, and recommends one with a test to tell them apart. Use it when a number looks wrong, when you have tuned the same setting twice, or to ask "what's the standard way?". [PROMPT.md](skills/learning/teardown-lookup/PROMPT.md) is a copy-paste version for any chat app.
- **[teardown-apply](skills/learning/teardown-apply/SKILL.md)**: "How does this part apply to my project?" Pick a part on the map, and it finds where your game, book or product has it, which settings you chose, which known troubles show, and what to change, all in the subject's terms.
- **[teardown-audit](skills/learning/teardown-audit/SKILL.md)**: "How does my whole project measure up?" It checks every part of the map against your project and writes a strategy in the shape of Richard Rumelt's *Good Strategy Bad Strategy*: a diagnosis of the one challenge that matters most, a guiding policy, and a few actions that support each other.
- **[teardown-upload](skills/learning/teardown-upload/SKILL.md)**: "Share my teardown." Offers a finished map to [Teardown Atlas](https://teardownatlas.com). It checks the map, leaves out raw page copies and details of your own project, asks before anything goes public, then opens a pull request on the public [teardowns](https://github.com/iqrow/teardowns) repository. The owner reviews it before it reaches the site. Needs the GitHub CLI (`gh`).

## License

[MIT](LICENSE)
