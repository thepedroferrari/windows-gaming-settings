/**
 * Download utilities
 */

/**
 * Download text content as a file
 */
export function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  // Revoke the object URL after a short delay
  window.setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * Download JSON content as a file
 */
export function downloadJson(data: unknown, filename: string): void {
  const content = JSON.stringify(data, null, 2)
  downloadText(content, filename)
}
