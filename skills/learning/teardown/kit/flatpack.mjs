// The flatpack's addresses and titles. Shared by the viewer (bundled) and public.mjs, so a step has the same URL
// and title whether the viewer moves to it or the server sends its page.
// A step's id stands in its URL as a node's id does: <folder><id>, or #<id> on a page opened as a file.
// The flatpack opens at its first step, so the first step's id is the flatpack's own: `flatpack`. Step n is `flatpack-<n>`.

/** The id of flatpack step `i`, counted from 0. */
export const stepId = (i) => (i ? `flatpack-${i + 1}` : 'flatpack')

/** The step, counted from 0, that a URL's id names among `count` steps, or -1 if it names none. A number past the last step names the last. */
export function stepOf(id, count) {
  const m = /^flatpack(?:-([1-9][0-9]*))?$/.exec(id)
  return m ? Math.min(count, Number(m[1] ?? 1)) - 1 : -1
}

/** Node ids that would take a step's URL. build.mjs rejects them. */
export const STEP_ID = /^flatpack(-[0-9]+)?$/

/** A step's page title, in the format of the node pages: "Flatpack · Bread · teardown", "Step 3: Shape · Flatpack · Bread · teardown". */
export const stepTitle = (teardown, i) => `${i ? `Step ${i + 1}: ${teardown.assembly[i].title} · ` : ''}Flatpack · ${teardown.title} · teardown`
