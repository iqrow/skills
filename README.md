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

- **[exploded-view](skills/learning/exploded-view/SKILL.md)**: shows a whole field the way a professional sees it, as an interactive 3D exploded view. It starts at the finished product, splits it into named parts, knobs, loops and catalogues, and opens any part to the next level down. Say "I want to brew beer" or "how is a game made?", or ask for the skill by name. Needs Node.js 22 or later, and Chrome to check the page. Example: [fiction book writing](https://fiction-writing.goodcode.company).

## License

[MIT](LICENSE)
