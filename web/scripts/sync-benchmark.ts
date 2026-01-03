import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(scriptDir, '..', '..')
const sourcePath = join(repoRoot, 'benchmark-setup.ps1')
const publicDir = join(repoRoot, 'web', 'public')
const targetPath = join(publicDir, 'benchmark.ps1')

try {
  await Deno.stat(sourcePath)
} catch {
  console.error(`[sync-benchmark] Missing source file: ${sourcePath}`)
  Deno.exit(1)
}

await Deno.mkdir(publicDir, { recursive: true })
await Deno.copyFile(sourcePath, targetPath)

console.log(`[sync-benchmark] Synced ${sourcePath} -> ${targetPath}`)
