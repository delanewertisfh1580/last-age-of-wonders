import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Движок использует NodeNext-импорты с расширением `.js` (src/*.ts).
 * Vite по умолчанию такие спецификаторы не разрешает — подменяем на `.ts`.
 */
function tsSpecifierPlugin(): Plugin {
  return {
    name: 'nvm-ts-specifier',
    enforce: 'pre',
    resolveId(id, importer) {
      if (!importer || !id.endsWith('.js') || !id.startsWith('.')) return null;
      const absolute = resolve(dirname(importer), id);
      if (existsSync(absolute)) return null;
      const tsPath = `${absolute.slice(0, -3)}.ts`;
      return existsSync(tsPath) ? tsPath : null;
    },
  };
}

export default defineConfig({
  plugins: [tsSpecifierPlugin()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
    hmr: false,
  },
  preview: {
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
});
