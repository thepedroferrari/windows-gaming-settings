/**
 * Code Viewer Component
 * Script preview, diff viewer, and code editing
 *
 * CSS: @import './src/components/code-viewer/code-viewer.styles.css' layer(components);
 */

export type { CodeViewer, DiffResult } from './code-viewer'
export {
  computeStats,
  createCodeViewer,
  getMeaningfulChanges,
  renderDiffHtml,
} from './code-viewer'
