# Working on this repo

Each skill is a folder `skills/<bucket>/<skill>/` with a `SKILL.md`. A bucket groups skills by use: `learning/` holds skills for getting into a subject you don't know yet.

When you add, rename or remove a skill, change these in the same commit:

- `skills` in `.claude-plugin/plugin.json`. Claude Code, Codex and Copilot install the skills on this list.
- The skill's `agents/openai.yaml`: the name and one-line description that Codex shows.
- `README.md`, under the skill's bucket: one line on what the skill does and when to use it.

Leave `version` out of both files in `.claude-plugin/`. Claude Code then uses the commit SHA as the version, so every push reaches installed plugins.

Before you push, run `claude plugin validate .`. Its one expected warning is "No version specified". Then run `npx skills@latest add . --list` and check that it lists every skill: the Skills CLI silently skips a skill whose frontmatter is not valid YAML, such as an unquoted description that holds a colon followed by a space. Also run each changed skill's own checks. For teardown, build, verify and check a teardown as its `SKILL.md` says (`kit/build.mjs`, `kit/verify.mjs`, then `kit/check.mjs`). The published teardowns on [Teardown Atlas](https://teardownatlas.com) are the examples; this repo holds no teardowns.

Write skills short and positive, with one source of truth for each rule.
