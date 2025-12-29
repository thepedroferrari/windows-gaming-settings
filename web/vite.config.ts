import { defineConfig } from 'npm:vite@5'
import { svelte } from 'npm:@sveltejs/vite-plugin-svelte@4'
import { vitePreprocess } from 'npm:@sveltejs/vite-plugin-svelte@4'

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
})
