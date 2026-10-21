---
name: teardown-upload
description: Upload, share, submit or publish my teardown as a pull request to the public iqrow/teardowns repository. Use when someone says "upload my teardown", "share my teardown", "submit my teardown" or "publish my teardown".
---

# Teardown upload

Share a teardown through the public `iqrow/teardowns` repository. The site owner reviews the pull request. A merged pull request may later be published on Teardown Atlas.

## Steps

1. **Locate the teardown.** Find the completed teardown folder and read its slug from the folder name. The slug is lowercase kebab case, such as `bread`. If the owner publishes the teardown, its address is `https://teardownatlas.com/<slug>/`. Done when the teardown folder and its slug are known.

2. **Check the map.** Run step 10 of the [teardown skill](../teardown/SKILL.md#steps) on the teardown: `build` and then `verify`. Read `log.md` and record what is still open. Done when build and verify report no errors and `log.md` states the open items.

3. **Scrub the upload.** Keep the teardown's view. Leave out the user's name, numbers, and details from a personal or private project. Leave the local `raw/` directory available for verification, and copy only the teardown files without `raw/` into the upload. Done when the upload contains the teardown and no raw material or project details.

4. **Get consent.** Tell the user exactly what becomes public: the teardown folder, the user's GitHub username on the pull request, and the map under the CC BY 4.0 licence. Wait for the user's yes before uploading. Done when the user gives explicit consent.

5. **Open the pull request.** Run `gh auth status`. If the user can push to `iqrow/teardowns`, create and push a branch named `teardown/<slug>` there. Otherwise run `gh repo fork iqrow/teardowns`, use the fork, and open a pull request from that branch. Copy the teardown folder into `teardowns/<slug>/` without `raw/`. If the slug already exists, tell the user that this pull request updates it. Run `node scripts/check-pr.mjs main`, commit the teardown, push the branch, and run `gh pr create` with the pull request template. Done when the pull request contains the checked teardown and the template records its prompt, checks, open items, and licence choice.

6. **Report the handoff.** Give the user the pull request URL. State that the owner reviews it before anything reaches `teardownatlas.com`. Done when the URL and review boundary are clear.
