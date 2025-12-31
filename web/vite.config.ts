// Versions managed via deno.json import map
import { defineConfig } from 'vite'
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'

// Get git commit info at build time
function getGitInfo() {
  try {
    const commitCmd = new Deno.Command('git', { args: ['rev-parse', '--short', 'HEAD'] })
    const commitResult = commitCmd.outputSync()
    const commit = new TextDecoder().decode(commitResult.stdout).trim()

    const dateCmd = new Deno.Command('git', { args: ['log', '-1', '--format=%cd', '--date=short'] })
    const dateResult = dateCmd.outputSync()
    const date = new TextDecoder().decode(dateResult.stdout).trim()

    return { commit, date }
  } catch {
    return { commit: 'dev', date: new Date().toISOString().split('T')[0] }
  }
}

const gitInfo = getGitInfo()

export default defineConfig({
  plugins: [
    svelte({
      preprocess: vitePreprocess(),
      compilerOptions: {
        runes: true,
      },
    }),
  ],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['svelte', 'zod'],
        },
      },
    },
  },
  server: {
    port: 9010,
  },
  resolve: {
    alias: {
      '$lib': '/src/lib',
    },
  },
  define: {
    __BUILD_COMMIT__: JSON.stringify(gitInfo.commit),
    __BUILD_DATE__: JSON.stringify(gitInfo.date),
  },
})
