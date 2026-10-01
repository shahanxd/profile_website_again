import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // The dev server must not watch build output or art sources: on Windows a
    // build deleting dist-ssr while it is being watched crashes the watcher.
    watch: { ignored: ['**/dist/**', '**/dist-ssr/**', '**/art/raw/**', '**/art/fixtures/**', '**/art/scene/**', '**/art/sprites/**'] },
  },
  // The server bundle is only used to prerender; it needs no copy of public/.
  build: { target: 'es2022', copyPublicDir: !isSsrBuild },
}));
