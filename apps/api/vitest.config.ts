import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
  // swc compile les décorateurs NestJS (emitDecoratorMetadata), que esbuild ne gère pas
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
