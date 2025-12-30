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
export async function generateSHA256(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Format hash for display (first 16 chars + ... + last 8 chars)
 * Full hash is 64 chars, this shows 24 + ellipsis
 */
export function formatHashShort(hash: string): string {
  if (hash.length <= 32) return hash
  return `${hash.slice(0, 16)}...${hash.slice(-8)}`
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
