/**
 * Opens the share sheet with the file (Save to Files, AirDrop, …), or downloads
 * it where file sharing isn't available. Must be called straight from a tap:
 * iOS only opens the share sheet from a user gesture, so prepare the file first.
 * Resolves to false if the share sheet was cancelled; other failures throw.
 */
export async function shareFile(file: File): Promise<boolean> {
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: file.name })
    } else {
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    }
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return false
    throw e
  }
}
