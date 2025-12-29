import { PurgeCSS } from "npm:purgecss@6.0.0"
import { expandGlob } from "https://deno.land/std@0.220.0/fs/expand_glob.ts"
import { fromFileUrl } from "https://deno.land/std@0.220.0/path/from_file_url.ts"
import { relative } from "https://deno.land/std@0.220.0/path/relative.ts"

const webRoot = fromFileUrl(new URL("..", import.meta.url))

async function glob(pattern: string): Promise<string[]> {
  const matches: string[] = []
  for await (const entry of expandGlob(pattern, { root: webRoot })) {
    if (entry.isFile) matches.push(entry.path)
  }
  return matches
}

const content = await glob("src/**/*.{svelte,ts,js,html}")
const css = [...(await glob("src/**/*.css")), fromFileUrl(new URL("../style.css", import.meta.url))]

const dynamicClassTokens = [
  "skip-link",
  "tier-safe",
  "tier-caution",
  "tier-risky",
  "tier-safe-field",
  "tier-caution-field",
  "tier-risky-field",
  "stat-value--risk-low",
  "stat-value--risk-medium",
  "stat-value--risk-high",
  "required",
  "recommended",
  "cpu",
  "gpu",
  "mobo",
]

const dynamicAttributeTokens = [
  'data-rarity="legendary"',
  'data-rarity="epic"',
  'data-rarity="rare"',
  'data-rarity="uncommon"',
  'data-rarity="common"',
  'data-preset="overkill"',
  'data-preset="pro_gamer"',
  'data-preset="streaming"',
  'data-preset="balanced"',
  'data-preset="minimal"',
]

const CLASS_ATTR_RE = /class\s*=\s*["']([^"']+)["']/g
const CLASS_DIRECTIVE_RE = /class:([A-Za-z_][\w-]*)/g
const CLASSLIST_RE = /classList\.(?:add|remove|toggle|contains)\(([^)]*)\)/g
const STRING_LITERAL_RE = /["']([^"']+)["']/g
const DYNAMIC_TOKEN_RE = /[{}]/g

function extractStaticClasses(value: string): string[] {
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !DYNAMIC_TOKEN_RE.test(token))
}

async function collectUsedClasses(files: string[]): Promise<Set<string>> {
  const used = new Set<string>()

  for (const file of files) {
    const text = await Deno.readTextFile(file)

    for (const match of text.matchAll(CLASS_ATTR_RE)) {
      const tokens = extractStaticClasses(match[1])
      for (const token of tokens) used.add(token)
    }

    for (const match of text.matchAll(CLASS_DIRECTIVE_RE)) {
      used.add(match[1])
    }

    for (const match of text.matchAll(CLASSLIST_RE)) {
      for (const literal of match[1].matchAll(STRING_LITERAL_RE)) {
        const tokens = extractStaticClasses(literal[1])
        for (const token of tokens) used.add(token)
      }
    }
  }

  for (const token of dynamicClassTokens) used.add(token)

  return used
}

const results = await new PurgeCSS().purge({
  content: [
    ...content,
    {
      raw: [...dynamicAttributeTokens, ...dynamicClassTokens].join(" "),
      extension: "html",
    },
  ],
  css,
  rejected: true,
  defaultExtractor: (text) => text.match(/[A-Za-z0-9_-]+/g) ?? [],
  safelist: {
    standard: [
      /^tier-(safe|caution|risky)(-field)?$/,
      /^stat-value--risk-(low|medium|high)$/,
      /^(required|recommended|cpu|gpu|mobo)$/,
    ],
    greedy: [/data-rarity/, /data-preset/],
  },
})

const usedClasses = await collectUsedClasses(content)
const simpleClassSelectorRe = /^\.[A-Za-z_][\w-]*$/

const highConfidenceByFile: Record<string, string[]> = {}
const highConfidenceSet = new Set<string>()
let totalRejected = 0
let totalSimpleRejected = 0

for (const item of results) {
  const rejected = item.rejected ?? []
  totalRejected += rejected.length
  const filePath = item.file ?? item.css ?? "unknown"
  const relativePath = relative(webRoot, filePath)
  const simpleRejected = rejected.filter((selector) => simpleClassSelectorRe.test(selector))
  totalSimpleRejected += simpleRejected.length
  const unused = simpleRejected.filter((selector) => !usedClasses.has(selector.slice(1)))
  if (unused.length > 0) {
    highConfidenceByFile[relativePath] = unused
    for (const selector of unused) highConfidenceSet.add(selector)
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  totalFiles: results.length,
  totalRejected,
  simpleClassRejected: totalSimpleRejected,
  highConfidenceUnusedClassSelectors: highConfidenceSet.size,
  highConfidenceByFile,
}

await Deno.writeTextFile(
  fromFileUrl(new URL("../purge-report.json", import.meta.url)),
  JSON.stringify(results, null, 2),
)

await Deno.writeTextFile(
  fromFileUrl(new URL("../purge-report.summary.json", import.meta.url)),
  JSON.stringify(summary, null, 2),
)

console.log(
  [
    "PurgeCSS summary:",
    `- Total rejected selectors: ${totalRejected}`,
    `- Simple class selectors rejected: ${totalSimpleRejected}`,
    `- High-confidence unused class selectors: ${highConfidenceSet.size}`,
    "See web/purge-report.summary.json for details.",
  ].join("\n"),
)
