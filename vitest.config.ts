import { defineConfig } from 'vitest/config';
import angular from '@angular/build/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test.ts']
  }
});

