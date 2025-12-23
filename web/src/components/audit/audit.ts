import { $id, debounce } from '../../utils/dom'
import type { CleanupController } from '../../utils/lifecycle'
import { type CodeViewer, computeStats, createCodeViewer } from '../code-viewer/'
import { getPreviousScript, getTrackedScript } from '../script-generator'

let auditViewer: CodeViewer | null = null
let lastScriptHash = ''

function hashScript(script: string): string {
  let hash = 0
  for (let i = 0; i < script.length; i++) {
    hash = ((hash << 5) - hash + script.charCodeAt(i)) | 0
  }
  return hash.toString(36)
}

export function setupAuditPanel(controller?: CleanupController): void {
  const panel = $id('audit-panel')
  const toggle = $id('audit-toggle')
  const linesEl = $id('audit-lines')
  const sizeEl = $id('audit-size')

  auditViewer = createCodeViewer($id('audit-viewer'))

  toggle?.addEventListener('click', () => {
    panel?.classList.toggle('open')
    if (panel?.classList.contains('open')) {
      updateAudit()
    }
  })

  const updateAudit = (): void => {
    if (!panel?.classList.contains('open')) return

    const script = getTrackedScript()
    const currentHash = hashScript(script)

    if (currentHash === lastScriptHash) return
    lastScriptHash = currentHash

    const previous = getPreviousScript()
    auditViewer?.setContent({ current: script, previous })

    const stats = computeStats(script)
    if (linesEl) linesEl.textContent = `${stats.lines} lines`
    if (sizeEl) sizeEl.textContent = `${stats.sizeKb} KB`
  }

  const debouncedUpdate = debounce(updateAudit, 300)
  debouncedUpdate.flush = updateAudit

  const handleScriptChange = (): void => {
    debouncedUpdate()
  }

  document.addEventListener('script-change-request', handleScriptChange, {
    signal: controller?.signal,
  })

  controller?.onCleanup(() => {
    debouncedUpdate.cancel()
    lastScriptHash = ''
  })

  $id('audit-copy')?.addEventListener(
    'click',
    async () => {
      const script = auditViewer?.getContent() || ''
      try {
        await navigator.clipboard.writeText(script)
        const btn = $id('audit-copy')
        if (btn) {
          const original = btn.textContent
          btn.textContent = '✓ Copied'
          const timeoutId = setTimeout(() => {
            btn.textContent = original
          }, 1800)
          controller?.addTimeout(timeoutId)
        }
      } catch (err) {
        alert(`Failed to copy: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    },
    { signal: controller?.signal },
  )
}
