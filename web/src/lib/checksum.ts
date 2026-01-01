/**
 * Checksum utilities for script verification
 *
 * Uses Web Crypto API to generate SHA256 hashes client-side.
 * Users can verify downloaded scripts match the displayed hash.
 */

/**
 * Generate SHA256 checksum of a string
 * Returns lowercase hex string (64 characters)
 */
export type Sha256Options = {
  includeBom?: boolean
}

export async function generateSHA256(content: string, options: Sha256Options = {}): Promise<string> {
  const payload = options.includeBom && !content.startsWith('\ufeff') ? `\ufeff${content}` : content
  const encoder = new TextEncoder()
  const data = encoder.encode(payload)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Copy text to clipboard
 * Returns true if successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
