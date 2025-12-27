/**
 * RockTune - Svelte 5 Entry Point
 *
 * Phase 1: Mounts Svelte app alongside existing DOM structure.
 * Phase 3+: All UI will be rendered by Svelte components.
 */

import { mount, unmount } from 'svelte'
import App from './App.svelte'

// Mount Svelte to the body (it will coexist with existing HTML during migration)
const app = mount(App, {
  target: document.body,
})

// HMR support
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unmount(app)
  })
}

export default app
