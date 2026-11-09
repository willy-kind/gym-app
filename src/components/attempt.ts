/** Runs a data change and tells the user if it failed, so a failed save is never silent. */
export async function attempt(action: () => Promise<unknown>): Promise<void> {
  try {
    await action()
  } catch (e) {
    console.error(e)
    window.alert(`Could not save: ${e instanceof Error ? e.message : String(e)}`)
  }
}
