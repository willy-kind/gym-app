/**
 * Runs a data change and tells the user if it failed, so a failed save is never silent.
 * Resolves to true if it succeeded.
 */
export async function attempt(action: () => Promise<unknown>): Promise<boolean> {
  try {
    await action()
    return true
  } catch (e) {
    console.error(e)
    window.alert(`Could not save: ${e instanceof Error ? e.message : String(e)}`)
    return false
  }
}
