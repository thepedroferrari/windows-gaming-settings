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

  auditViewer = createCodeViewer($id('audit-viewer'), controller)

  if (toggle) {
    if (controller) {
      controller.addEventListener(toggle, 'click', () => {
        panel?.classList.toggle('open')
        if (panel?.classList.contains('open')) {
          updateAudit()
        }
      })
    } else {
      toggle.addEventListener('click', () => {
        panel?.classList.toggle('open')
        if (panel?.classList.contains('open')) {
          updateAudit()
        }
      })
    }
  }

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

  if (controller) {
    controller.addEventListener(document, 'script-change-request', handleScriptChange)
  } else {
    document.addEventListener('script-change-request', handleScriptChange)
  }

  controller?.onCleanup(() => {
    debouncedUpdate.cancel()
    lastScriptHash = ''
  })

  const copyBtn = $id('audit-copy')
  if (copyBtn) {
    const handleCopy = async (): Promise<void> => {
      const script = auditViewer?.getContent() || ''
      try {
        await navigator.clipboard.writeText(script)
        const original = copyBtn.textContent
        copyBtn.textContent = '✓ Copied'
        if (controller) {
          controller.setTimeout(() => {
            copyBtn.textContent = original
          }, 1800)
        } else {
          setTimeout(() => {
            copyBtn.textContent = original
          }, 1800)
        }
      } catch (err) {
        alert(`Failed to copy: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    if (controller) {
      controller.addEventListener(copyBtn, 'click', handleCopy)
    } else {
      copyBtn.addEventListener('click', handleCopy)
    }
  }
}
