// The requests a page offers to copy into a coding agent, and the note every page shows about who wrote the map.
// Shared by the viewer's panel (bundled) and public.mjs, which prints them for readers without script.

/** Every page says, on every node, that an AI agent wrote the map, so a reader who lands on any part knows. */
export const AI_NOTE = 'An AI agent wrote this map with the teardown skill. It can contain errors: check the sources before you rely on a part.'

/** Holds a node against the reader's project. `ref` names the teardown: its path on the author's machine, or its URL. */
export const usePrompt = (teardown, node, ref) => node.id === teardown.root
  ? `teardown-audit: audit my project against the "${teardown.title}" teardown at ${ref}`
  : `teardown-apply: hold "${node.term}" (${node.id}) from the teardown at ${ref} against my project`

/** Grows the map below a leaf. Only the author has the teardown's files, so only a local page offers it. */
export const deeperPrompt = (node, file) => `teardown: go deeper on "${node.term}" (${node.id}) in ${file}`
