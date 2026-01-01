import { expandGlob } from 'https://deno.land/std@0.220.0/fs/expand_glob.ts'
import { dirname, fromFileUrl, relative } from 'https://deno.land/std@0.220.0/path/mod.ts'
import postcss from 'npm:postcss@8.4.42'

const scriptDir = dirname(fromFileUrl(import.meta.url))
const webRoot = dirname(scriptDir)

async function collectCssFiles(): Promise<string[]> {
  const patterns = ['src/**/*.css', 'style.css']
  const files: string[] = []
  for (const pattern of patterns) {
    for await (const entry of expandGlob(pattern, { root: webRoot })) {
      if (entry.isFile) {
        files.push(entry.path)
      }
    }
  }
  return files
}

interface SelectorStat {
  selector: string
  declarationCount: number
  file: string
  atRuleChain: string
  line: number
}

function addSelectorStats(
  records: SelectorStat[],
  selector: string,
  declCount: number,
  file: string,
  atRuleChain: string,
  line: number,
) {
  if (declCount === 0) return
  records.push({
    selector,
    declarationCount: declCount,
    file: relative(webRoot, file),
    atRuleChain,
    line,
  })
}

function traverse(
  node: postcss.Node,
  file: string,
  ancestors: string[],
  records: SelectorStat[],
) {
  if (node.type === 'rule') {
    const rule = node as postcss.Rule
    const declCount = rule.nodes?.filter((n) => n.type === 'decl').length ?? 0
    const selectors = rule.selector.split(',').map((s) => s.trim())
    const context = ancestors.join(' > ')
    for (const selector of selectors) {
      const line = rule.source?.start?.line ?? 0
      addSelectorStats(records, selector, declCount, file, context, line)
    }
  }

  if ('nodes' in node && node.nodes) {
    const nextAncestors =
      node.type === 'atrule' ? [...ancestors, `@${node.name} ${node.params ?? ''}`.trim()] : ancestors
    for (const child of node.nodes) {
      traverse(child, file, nextAncestors, records)
    }
  }
}

const cssFiles = await collectCssFiles()
const selectorRecords: SelectorStat[] = []

for (const file of cssFiles) {
  const content = await Deno.readTextFile(file)
  const root = postcss.parse(content, { from: file })
  traverse(root, file, [], selectorRecords)
}

selectorRecords.sort((a, b) => b.declarationCount - a.declarationCount)

console.log('Top 10 heaviest selectors (declaration count):')
for (const record of selectorRecords.slice(0, 10)) {
  console.log(
    `${record.declarationCount.toString().padStart(3)} declarations – ${record.selector} (${record.file}:${record.line})` +
      (record.atRuleChain ? ` inside ${record.atRuleChain}` : ''),
  )
}
