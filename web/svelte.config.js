import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

// This config is required for svelte-check (IDE tooling and type validation).
// The actual build uses vite.config.ts which has identical settings.
export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true,
  },
}
