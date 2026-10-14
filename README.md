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

- **[teardown](skills/learning/teardown/SKILL.md)**: takes a whole field apart the way its professionals see it, as an interactive 3D exploded view you browse. It starts at the finished product, splits it into named parts, knobs, loops and catalogues, and opens any part to the next level down, so you find the questions you did not know to ask. Say "I want to bake bread" or "how is a game made?", or ask for the skill by name. Needs Node.js 22 or later, and Chrome to check the page. Examples: [Teardown Atlas](https://teardownatlas.com).
- **[prior-art](skills/learning/prior-art/SKILL.md)**: the search route, for when you know what you want but not what it is called. It translates your goal or symptom into the categories practitioners use, finds the approaches they already rely on, and recommends one with a test to tell them apart. Use it when a number looks wrong, when you have tuned the same setting twice, or to ask "what's the standard way?". It can start from a teardown's map. [PROMPT.md](skills/learning/prior-art/PROMPT.md) is a copy-paste version for any chat app.

## License

[MIT](LICENSE)
